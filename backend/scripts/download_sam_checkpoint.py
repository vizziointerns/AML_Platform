import argparse
from pathlib import Path

from huggingface_hub import hf_hub_download


MODEL_ID_TO_FILENAME = {
    "tiny": ("facebook/sam2.1-hiera-tiny", "sam2.1_hiera_tiny.pt"),
    "small": ("facebook/sam2.1-hiera-small", "sam2.1_hiera_small.pt"),
    "base-plus": ("facebook/sam2.1-hiera-base-plus", "sam2.1_hiera_base_plus.pt"),
    "large": ("facebook/sam2.1-hiera-large", "sam2.1_hiera_large.pt"),
}


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download a SAM 2.1 checkpoint into backend/models/"
    )
    parser.add_argument(
        "--size",
        choices=list(MODEL_ID_TO_FILENAME.keys()),
        default="tiny",
        help="Model size (default: tiny)",
    )
    args = parser.parse_args()

    models_dir = Path(__file__).resolve().parent.parent / "models"
    models_dir.mkdir(parents=True, exist_ok=True)

    repo_id, filename = MODEL_ID_TO_FILENAME[args.size]
    dest = models_dir / filename

    if dest.exists():
        print(f"Checkpoint already exists: {dest}")
        return

    print(f"Downloading {repo_id}/{filename} ...")
    cached = hf_hub_download(repo_id=repo_id, filename=filename)
    import shutil

    shutil.copy2(cached, dest)
    print(f"Saved to: {dest}")


if __name__ == "__main__":
    main()
