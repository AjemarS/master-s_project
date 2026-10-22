from django.test import SimpleTestCase
from PIL import Image, ImageDraw

from products.management.commands.seed_data import _draw_fitted

NAMES = ("Samsung RB38T602DSA Refrigerator", "Electrolux KODGH70TXA Oven with a very long name")


class PlaceholderTextTest(SimpleTestCase):
    def test_long_names_stay_inside_the_image(self):
        for name in NAMES:
            img = Image.new("L", (400, 400), 255)
            draw = ImageDraw.Draw(img)
            _draw_fitted(draw, name, center=(200, 180), width=340, fill=0, max_size=48)
            bbox = Image.eval(img, lambda v: 255 - v).getbbox()
            assert bbox is not None
            left, _, right, _ = bbox
            self.assertGreaterEqual(left, 30, name)
            self.assertLessEqual(right, 370, name)

    def test_words_are_not_split(self):
        img = Image.new("L", (400, 300), 255)
        draw = ImageDraw.Draw(img)
        # Too wide at 44 px: the font shrinks instead of the word breaking
        _draw_fitted(draw, "Refrigerators", center=(200, 130), width=340, fill=0, max_size=44)
        bbox = Image.eval(img, lambda v: 255 - v).getbbox()
        assert bbox is not None
        top, bottom = bbox[1], bbox[3]
        self.assertLess(bottom - top, 60)  # one line
