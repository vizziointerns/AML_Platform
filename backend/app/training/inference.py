import tempfile
from pathlib import Path

import httpx

from app.schemas.inference import InferredObject


BASE_DIR = Path(__file__).resolve().parent.parent.parent


def run_inference(image_url: str, model_path: str | None = None) -> list[InferredObject]:
    tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    try:
        response = httpx.get(image_url, timeout=60, follow_redirects=True)
        response.raise_for_status()
        tmp.write(response.content)
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
