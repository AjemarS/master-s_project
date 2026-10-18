import uuid
from pathlib import Path

from django.conf import settings
from django.test import TestCase, override_settings


@override_settings(DEBUG=False)
class MediaServingTest(TestCase):
    def test_media_served_with_debug_off(self):
        # the media route binds MEDIA_ROOT at import, so write into the real one
        media_root = Path(settings.MEDIA_ROOT)
        media_root.mkdir(parents=True, exist_ok=True)
        pic = media_root / f"test-{uuid.uuid4().hex}.png"
        pic.write_bytes(b"png")
        self.addCleanup(pic.unlink)

        response = self.client.get(f"/media/{pic.name}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(b"".join(response.streaming_content), b"png")

    def test_no_path_traversal(self):
        self.assertNotEqual(self.client.get("/media/../manage.py").status_code, 200)
