"""One-time setup: authorize the backend to access your Google Drive.

Opens a browser, you click Allow, paste the code back — done forever.
After this, uploads go to your personal Drive with your storage quota.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.utils.google_drive_auth import interactive_auth


def main() -> None:
    interactive_auth()


if __name__ == "__main__":
    main()
