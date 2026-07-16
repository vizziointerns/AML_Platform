import os
import torch
from huggingface_hub import hf_hub_download
from segment_anything import sam_model_registry, SamPredictor


def load_sam_model(
    device: str = "cpu", checkpoint_path: str | None = None
) -> tuple[torch.nn.Module, SamPredictor]:
    if checkpoint_path is None:
        checkpoint_name = "sam_vit_b_01ec64.pth"
        models_dir = os.path.join(
            os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            ),
            "models",
        )
        checkpoint_path = os.path.join(models_dir, checkpoint_name)

        if not os.path.exists(checkpoint_path):
            os.makedirs(models_dir, exist_ok=True)
            print(f"Downloading SAM ViT-B checkpoint to {checkpoint_path}...")
            hf_hub_download(
                repo_id="ybelkada/segment-anything",
                filename=f"checkpoints/{checkpoint_name}",
                local_dir=models_dir,
                local_dir_use_symlinks=False,
            )
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
