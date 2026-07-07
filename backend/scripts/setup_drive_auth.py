"""One-time setup: authorize the backend to access your Google Drive.

Opens a browser, you click Allow, paste the code back — done forever.
After this, uploads go to your personal Drive with your storage quota.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import webbrowser

from app.utils.google_drive_auth import (
    exchange_code,
    get_auth_url,
    save_token,
)


def main() -> None:
    url = get_auth_url()
    print("Opening browser for Google Drive authorization...")
    print(f"If the browser doesn't open, visit this URL:\n{url}\n")
    webbrowser.open(url)

    code = input("Paste the authorization code here and press Enter: ").strip()
    if not code:
        print("No code provided, exiting.")
        sys.exit(1)

    token = exchange_code(code)
    save_token(token)
    print("✓ Google Drive authorization complete!")
    print("  Token saved to backend/drive_token.json")
    print("  The backend can now upload files to your Drive indefinitely.")


if __name__ == "__main__":
    main()
