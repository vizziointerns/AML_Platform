import asyncio, httpx, os, sys
sys.path.insert(0, os.path.dirname(__file__))

from app.utils.google_drive_auth import async_get_drive_access_token
from app.utils.google_service_account import get_access_token

async def test_cog_render():
    # Test 1: Can we get a Drive access token?
    token = await async_get_drive_access_token()
    print(f"Access token OK (len={len(token)})")

    # Test 2: Can we download a TIFF file from Drive?
    file_id = "1kySFoLtB-Zv6TU4ZtPzog2BhBuMZfu_o"  # buildings_china.tif
    drive_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            drive_url,
            headers={"Authorization": f"Bearer {token}"},
            timeout=60
        )
        print(f"Drive download: HTTP {resp.status_code}, size={len(resp.content)} bytes")

        if resp.status_code == 200:
            # Test 3: Can we read the TIFF with tifffile?
            import tifffile
            import io
            with tifffile.TiffFile(io.BytesIO(resp.content)) as tif:
                series = tif.series[0]
                page0 = series.pages[0] if hasattr(series, 'pages') else tif.pages[0]
                if page0:
                    data = page0.asarray()
                    print(f"TIFF read OK: shape={data.shape}, dtype={data.dtype}, min={data.min():.2f}, max={data.max():.2f}")
                else:
                    print("ERROR: Could not read first page")

asyncio.run(test_cog_render())
