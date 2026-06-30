import os
import urllib.request
import torch
from segment_anything import sam_model_registry, SamPredictor


def load_sam_model(device: str = "cpu") -> tuple[torch.nn.Module, SamPredictor]:
	checkpoint_name = "sam_vit_b_01ec2a.pth"
	models_dir = os.path.join(
		os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
		"models"
	)
	checkpoint_path = os.path.join(models_dir, checkpoint_name)

	if not os.path.exists(checkpoint_path):
		os.makedirs(models_dir, exist_ok=True)
		print(f"Downloading SAM ViT-B checkpoint to {checkpoint_path}...")
		url = "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec2a.pth"
		urllib.request.urlretrieve(url, checkpoint_path)
		print("Download complete.")

	sam = sam_model_registry["vit_b"](checkpoint=checkpoint_path)
	sam.to(device=device)

	# Freeze image encoder completely
	for param in sam.image_encoder.parameters():
		param.requires_grad = False

	# Freeze prompt encoder completely
	for param in sam.prompt_encoder.parameters():
		param.requires_grad = False

	# Train only mask decoder
	for param in sam.mask_decoder.parameters():
		param.requires_grad = True

	predictor = SamPredictor(sam)
	return sam, predictor
