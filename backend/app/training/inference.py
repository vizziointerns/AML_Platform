import ipaddress
import logging
import socket
import tempfile
from pathlib import Path
from urllib.parse import urljoin, urlparse

import httpx

from app.schemas.inference import InferredObject

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent.parent

ALLOWED_SCHEMES = ("http", "https")
ALLOWED_MIME_PREFIXES = ("image/",)
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB
CHUNK_SIZE = 64 * 1024  # 64 KB
MAX_REDIRECTS = 20


def _is_private_host(hostname: str) -> bool:
    try:
        addr = ipaddress.ip_address(hostname)
        return addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved
    except ValueError:
        pass
    try:
        infos = socket.getaddrinfo(hostname, None)
        for _, _, _, _, sockaddr in infos:
            try:
                addr = ipaddress.ip_address(sockaddr[0])
                if addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved:
                    return True
            except ValueError:
                continue
    except OSError:
        return True
    return False


def _validate_image_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in ALLOWED_SCHEMES:
        raise ValueError(f"URL scheme not allowed: {parsed.scheme}")
    hostname = parsed.hostname
    if not hostname:
        raise ValueError("URL missing hostname")
    if _is_private_host(hostname):
        raise ValueError("Access to private/reserved host not allowed")


def _validate_redirect(response: httpx.Response) -> None:
    if response.is_redirect:
        location = response.headers.get("location")
        if location:
            redirect_url = urljoin(str(response.url), location)
            _validate_image_url(redirect_url)


def run_inference(image_url: str, model_path: str | None = None) -> list[InferredObject]:
    _validate_image_url(image_url)

    tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    try:
        with httpx.Client(
            timeout=60,
            follow_redirects=True,
            max_redirects=MAX_REDIRECTS,
            event_hooks={"response": [_validate_redirect]},
        ) as client:
            response = client.get(image_url)
            response.raise_for_status()

            content_type = response.headers.get("content-type", "")
            if not content_type.startswith(ALLOWED_MIME_PREFIXES):
                raise ValueError(f"Invalid content type: {content_type}")

            total = 0
            for chunk in response.iter_bytes(CHUNK_SIZE):
                total += len(chunk)
                if total > MAX_IMAGE_SIZE:
                    raise ValueError(f"Image exceeds maximum size of {MAX_IMAGE_SIZE} bytes")
                tmp.write(chunk)
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
            Path(tmp.name).unlink(missing_ok=True)
        except Exception:
            pass
