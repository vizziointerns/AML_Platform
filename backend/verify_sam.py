import os
import sqlite3
import json
import tempfile
import torch
import cv2
import numpy as np

# Ensure environment is set up for testing
os.environ["DATABASE_URL"] = "sqlite:///./test_verify_sam.db"

from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models.project import Project
from app.models.segmentation import SegmentationMask
from app.models.training import TrainingRun
from app.training.trainer import TrainingConfig
from app.training.trainer_sam import run_sam_training

from typing import Any
from pathlib import Path
def test_sam_training() -> None:
    # 1. Setup DB
    print("Setting up DB...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # 2. Mock Project
    project_id = "test_sam_project"
    project = Project(id=project_id, name="Test SAM Project", task_type="segment")
    db.merge(project)
    
    # 3. Dummy Image
    print("Creating dummy images and masks...")
    temp_dir = tempfile.mkdtemp()
    img_path = os.path.join(temp_dir, "dummy_img.jpg")
    dummy_img = np.zeros((100, 100, 3), dtype=np.uint8)
    dummy_img[20:80, 20:80] = (255, 255, 255)
    cv2.imwrite(img_path, dummy_img)

    # 4. Dummy Mask (COCO RLE or simple mask format)
    # We will use simple JSON format for RLE simulation
    mask_np = np.zeros((100, 100), dtype=np.uint8)
    mask_np[40:60, 40:60] = 1
    
    # Simple binary mask to RLE using pycocotools if available, else fallback JSON
    try:
        from pycocotools import mask as maskUtils
        rle = maskUtils.encode(np.asfortranarray(mask_np))
        rle["counts"] = rle["counts"].decode("utf-8")
        mask_data = json.dumps(rle)
    except ImportError:
        # Fallback raw list logic
        flat = mask_np.T.flatten()
        counts = []
        last_val = -1
        current_count = 0
        for val_np in flat:
            val = int(val_np)
            if val == last_val:
                current_count += 1
            else:
                counts.append(current_count)
                current_count = 1
                last_val = val
        counts.append(current_count)
        mask_data = json.dumps({"size": [100, 100], "counts": counts})

    bbox_prompt = json.dumps([40, 40, 60, 60])
    image_id = "dummy_image_1"

    mask_obj = SegmentationMask(
        project_id=project_id,
        image_id=image_id,
        mask_data=mask_data,
        bbox_prompt=bbox_prompt
    )
    db.merge(mask_obj)
    db.commit()

    # Create TrainingRun
    run = TrainingRun(id=9999, project_id=project_id, dataset_id="test_ds", name="test_run", model_type="sam_vit_b", epochs=1, status="queued")
    db.add(run)
    db.commit()

    # 5. Create Config
    print("Creating training config...")
    cfg = TrainingConfig(
        run_id=9999,
        project_id=project_id,
        dataset_id="test_ds",
        images=[{
            "id": image_id,
            "file_name": "dummy_img.jpg",
            "file_url": "mock_url"
        }],
        classes=[],
        epochs=1,
        model_type="sam_vit_b",
    )

    db.close()

    # Mock _download_image to just copy the dummy image
    import app.training.trainer_sam as t_sam
    def mock_download(img_dict: dict[str, Any], dest: Path, token: str | None) -> None:
        import shutil
        dest.mkdir(parents=True, exist_ok=True)
        shutil.copy2(img_path, dest / img_dict["file_name"])
    
    setattr(t_sam, "_download_image", mock_download)

    # Mock load_sam_model to avoid downloading weights (403 Forbidden)
    def mock_load_sam(device: str) -> tuple[Any, Any]:
        from segment_anything import sam_model_registry, SamPredictor
        sam = sam_model_registry["vit_b"](checkpoint=None)
        sam.to(device=device)
        for param in sam.image_encoder.parameters():
            param.requires_grad = False
        for param in sam.prompt_encoder.parameters():
            param.requires_grad = False
        for param in sam.mask_decoder.parameters():
            param.requires_grad = True
        return sam, SamPredictor(sam)

    setattr(t_sam, "load_sam_model", mock_load_sam)

    # Gradient flow validation hook
    print("Setting up gradient validation...")
    original_step = torch.optim.AdamW.step

    def hooked_step(self: Any, *args: Any, **kwargs: Any) -> Any:
        print("Validating gradient flow...")
        decoder_has_grad = False
        for group in self.param_groups:
            for p in group['params']:
                if p.grad is not None and p.requires_grad:
                    decoder_has_grad = True
                    break
        
        if not decoder_has_grad:
            print("❌ mask_decoder has NO gradients!")
        else:
            print("✅ mask_decoder gradient flow is ACTIVE.")
            
        return original_step(self, *args, **kwargs)

    setattr(torch.optim.AdamW, "step", hooked_step)

    # 6. Run Training Simulation
    print("Running training simulation...")
    run_sam_training(cfg)

    # 7. Check metrics
    db = SessionLocal()
    queried_run = db.query(TrainingRun).filter(TrainingRun.id == 9999).first()
    if queried_run is not None:
        if queried_run.error_message:
            print(f"Run Error Message: {queried_run.error_message}")
        if queried_run.metrics:
            metrics = json.loads(queried_run.metrics)
            print("Metrics Output:", metrics)
            assert len(metrics) > 0, "No metrics were collected!"
            assert "metric_type" in metrics[0] and metrics[0]["metric_type"] == "iou"
            print("✅ Metrics validation passed.")
    else:
        print("❌ Run not found.")

    db.close()
    
    # 8. Check caching
    cache_path = os.path.join(os.path.dirname(__file__), "cache", "sam_embeddings", f"{image_id}.pt")
    if os.path.exists(cache_path):
        print("✅ Embedding cache successfully written.")
    else:
        print("❌ Embedding cache missing.")

if __name__ == "__main__":
    try:
        test_sam_training()
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Test failed: {e}")
