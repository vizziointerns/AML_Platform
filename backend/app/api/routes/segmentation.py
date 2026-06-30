import json
import os
import tempfile
import cv2
import httpx
import numpy as np
import numpy as np
import torch
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.project import Project
from app.models.training import TrainingRun
from app.schemas.segmentation import (
	SegmentationTrainRequest,
	PredictRequest,
	PredictResponse,
)
from app.training.trainer import TrainingConfig, start_training_background
from app.training.sam_loader import load_sam_model
from app.training.trainer_yolo import _validate_image_url, _extract_drive_file_id
from app.training.trainer_sam import mask_to_rle

router = APIRouter()


@router.post("/segmentation/{project_id}/train", status_code=201)
def start_segmentation_train(
	project_id: str,
	body: SegmentationTrainRequest,
	db: Session = Depends(get_db)
) -> dict[str, Any]:
	# 1. Enforce/Ensure project and check task_type
	project = db.query(Project).filter(Project.id == project_id).first()
	if not project:
		project = Project(id=project_id, name=f"Project {project_id}", task_type="segment")
		db.add(project)
		db.commit()
		db.refresh(project)
	elif project.task_type != "segment":
		raise HTTPException(status_code=400, detail=f"Project task type is '{project.task_type}', not 'segment'")

	# 2. Create a training run row
	run = TrainingRun(
		project_id=project_id,
		dataset_id=body.dataset_id,
		name=body.name,
		model_type="sam_vit_b",
		epochs=body.epochs,
		status="queued",
	)
	db.add(run)
	db.commit()
	db.refresh(run)

	# 3. Compile config and start training in background
	cfg = TrainingConfig.from_api(
		run_id=run.id,
		project_id=project_id,
		dataset_id=body.dataset_id,
		images=[img.model_dump() for img in body.images],
		classes=[c.model_dump() for c in body.classes],
		epochs=body.epochs,
		google_access_token=body.google_access_token,
	)
	start_training_background(cfg)

	from typing import TypedDict
	class TrainSubmitResponse(TypedDict):
		run_id: int
		status: str

	res: dict[str, Any] = {"run_id": run.id, "status": "queued"}
	return res


@router.post("/segmentation/{project_id}/predict", response_model=PredictResponse)
def predict_segmentation(
	project_id: str,
	body: PredictRequest,
	db: Session = Depends(get_db)
) -> PredictResponse:
	# Download image to a temp location
	_validate_image_url(body.image_url)
	file_id = _extract_drive_file_id(body.image_url) if "drive.google.com" in body.image_url else None
	temp_dir = tempfile.mkdtemp()
	img_path = os.path.join(temp_dir, "temp_img.jpg")

	try:
		if file_id and body.google_access_token:
			drive_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"
			response = httpx.get(
				drive_url,
				timeout=60,
				headers={"Authorization": f"Bearer {body.google_access_token}", "User-Agent": "Mozilla/5.0"},
			)
			response.raise_for_status()
			with open(img_path, "wb") as f:
				f.write(response.content)
		else:
			response = httpx.get(
				body.image_url,
				timeout=60,
				follow_redirects=True,
				headers={"User-Agent": "Mozilla/5.0"},
			)
			response.raise_for_status()
			with open(img_path, "wb") as f:
				f.write(response.content)
	except Exception as e:
		if os.path.exists(img_path):
			os.unlink(img_path)
		try:
			os.rmdir(temp_dir)
		except Exception:
			pass
		raise HTTPException(status_code=400, detail=f"Failed to download image: {str(e)}")

	try:
		# Load image
		image_bgr = cv2.imread(img_path)
		if image_bgr is None:
			raise HTTPException(status_code=400, detail="Downloaded file is not a valid image.")
		image = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
		H, W, _ = image.shape

		# Load model
		device = "cuda" if torch.cuda.is_available() else "cpu"
		sam_model: Any
		sam_model, predictor = load_sam_model(device=device)

		from segment_anything.utils.transforms import ResizeLongestSide
		if ResizeLongestSide is None:
			raise ImportError("ResizeLongestSide is required from segment_anything")
		transform = ResizeLongestSide(sam_model.image_encoder.img_size)

		# Run prediction
		predictor.set_image(image)

		transformed_box = transform.apply_boxes(np.array([body.bbox]), (H, W))
		box_tensor = torch.as_tensor(transformed_box, dtype=torch.float, device=device)

		# Predict
		sparse_embeddings, dense_embeddings = sam_model.prompt_encoder(
			points=None,
			boxes=box_tensor[None, :, :],
			masks=None,
		)

		low_res_masks, iou_predictions = sam_model.mask_decoder(
			image_embeddings=predictor.get_image_embedding(),
			image_pe=sam_model.prompt_encoder.get_dense_pe(),
			sparse_prompt_embeddings=sparse_embeddings,
			dense_prompt_embeddings=dense_embeddings,
			multimask_output=False,
		)

		import torch.nn.functional as F
		upscaled_logits = F.interpolate(
			low_res_masks,
			size=(H, W),
			mode="bilinear",
			align_corners=False
		).squeeze(0).squeeze(0)  # (H, W)

		pred_mask_np = (torch.sigmoid(upscaled_logits) > 0.5).cpu().numpy().astype(np.uint8)
		confidence = float(iou_predictions.squeeze(0).squeeze(0).item())

		# Encode back to COCO RLE
		rle_dict = mask_to_rle(pred_mask_np)

	except Exception as err:
		raise HTTPException(status_code=500, detail=f"Prediction error: {str(err)}")
	finally:
		# Cleanup
		if os.path.exists(img_path):
			os.unlink(img_path)
		try:
			os.rmdir(temp_dir)
		except Exception:
			pass

	return PredictResponse(
		mask=json.dumps(rle_dict),
		bbox=body.bbox,
		confidence=confidence
	)
