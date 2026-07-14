import ipaddress
import logging
import socket
import tempfile
from collections.abc import Callable
from pathlib import Path
from urllib.parse import urlparse

import httpx

from app.schemas.inference import InferredObject
from app.utils.download import download_image_bytes

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent.parent

ALLOWED_SCHEMES = ("http", "https")
ALLOWED_MIME_PREFIXES = ("image/",)
MAX_IMAGE_SIZE = 200 * 1024 * 1024  # 200 MB


def _resolve_hostname(hostname: str) -> str:
    """Resolve *hostname* to an IP string. Raises ``ValueError`` if the
    address is private, loopback, link-local, or reserved, or if resolution
    itself fails."""
    try:
        addr = ipaddress.ip_address(hostname)
    except ValueError:
        try:
            infos = socket.getaddrinfo(hostname, None)
        except OSError as e:
            raise ValueError(f"Could not resolve hostname: {hostname}") from e
        for _, _, _, _, sockaddr in infos:
            try:
                addr = ipaddress.ip_address(sockaddr[0])
                break
            except ValueError:
                continue
        else:
            raise ValueError(f"Could not resolve hostname: {hostname}")

    if not addr.is_global or addr.is_multicast:
        raise ValueError(f"Access to non-public host not allowed: {addr}")
    return str(addr)


def _validate_image_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in ALLOWED_SCHEMES:
        raise ValueError(f"URL scheme not allowed: {parsed.scheme}")
    hostname = parsed.hostname
    if not hostname:
        raise ValueError("URL missing hostname")
    _resolve_hostname(hostname)


def _make_pin_hook() -> Callable[[httpx.Request], None]:
    """Return a ``request`` event hook that resolves and pins every
    request's hostname so the TCP connection never re-resolves DNS."""

    def pin_request(request: httpx.Request) -> None:
        hostname = request.url.host
        scheme = request.url.scheme
        if scheme not in ALLOWED_SCHEMES:
            raise ValueError(f"URL scheme not allowed: {scheme}")
        if not hostname:
            raise ValueError("URL missing hostname")
        resolved = _resolve_hostname(hostname)
        host_header = hostname
        if request.url.port is not None:
            host_header = f"{hostname}:{request.url.port}"
        request.headers["Host"] = host_header
        # For HTTPS, keep the original hostname in the URL so TLS/SNI
        # uses the real domain name and certificate verification works.
        # For plain HTTP, rewriting the URL host to the resolved IP
        # prevents the TCP connection from re-resolving DNS (anti-rebinding).
        if scheme != "https":
            request.url = request.url.copy_with(host=resolved)

    return pin_request


def run_inference(
    image_url: str, model_path: str | None = None
) -> list[InferredObject]:
    _validate_image_url(image_url)

    tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    try:
        image_data = download_image_bytes(image_url, MAX_IMAGE_SIZE)
        tmp.write(image_data)
        tmp.close()

        from ultralytics import YOLO  # type: ignore[attr-defined]

        if model_path:
            model = YOLO(model_path)
        else:
            model = YOLO(str(BASE_DIR / "yolo11n.pt"))

        results = model.predict(tmp.name, verbose=False)

        predictions: list[InferredObject] = []
        for result in results:
            if result.boxes is None:
                continue
            boxes = result.boxes
            img_w = result.orig_shape[1]
            img_h = result.orig_shape[0]

            for i in range(len(boxes)):
                cls_id = int(boxes.cls[i].item())
                conf = float(boxes.conf[i].item())
                x_center, y_center, w, h = boxes.xywh[i].tolist()

                predictions.append(
                    InferredObject(
                        class_id=cls_id,
                        class_name=result.names[cls_id],
                        confidence=round(conf, 4),
                        x=round((x_center - w / 2) / img_w * 100, 2),
                        y=round((y_center - h / 2) / img_h * 100, 2),
                        w=round(w / img_w * 100, 2),
                        h=round(h / img_h * 100, 2),
                    )
                )

        return predictions
    finally:
        try:
            if not tmp.closed:
                tmp.close()
            Path(tmp.name).unlink(missing_ok=True)
        except OSError:
            logger.warning("Failed to clean up inference temp file", exc_info=True)
