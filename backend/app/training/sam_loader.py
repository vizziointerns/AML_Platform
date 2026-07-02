import hashlib
import os
import tempfile
import urllib.request
import torch
from segment_anything import sam_model_registry, SamPredictor

EXPECTED_CHECKPOINT_SHA256 = (
    "01ec2a8be9170e5b1c697d5eae5dcc37f4c725b26c0f6c4c75f0f2e15e7f0a1c"
)


def load_sam_model(
    device: str = "cpu", checkpoint_path: str | None = None
) -> tuple[torch.nn.Module, SamPredictor]:
    if checkpoint_path is None:
        checkpoint_name = "sam_vit_b_01ec2a.pth"
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
            url = "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec2a.pth"
            tmp_fd, tmp_path = tempfile.mkstemp(dir=models_dir, suffix=".tmp")
            os.close(tmp_fd)
            try:
                urllib.request.urlretrieve(url, tmp_path)
                sha256 = hashlib.sha256()
                with open(tmp_path, "rb") as f:
                    for chunk in iter(lambda: f.read(65536), b""):
                        sha256.update(chunk)
                if sha256.hexdigest() != EXPECTED_CHECKPOINT_SHA256:
                    raise RuntimeError(
                        f"SHA256 mismatch for {checkpoint_name}: "
                        f"got {sha256.hexdigest()}, expected {EXPECTED_CHECKPOINT_SHA256}"
                    )
                os.replace(tmp_path, checkpoint_path)
            except Exception:
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
                raise
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
