"""Tests for Inrico jext CMS HTML parsing (IRC380 sample)."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

import converter

CONVERTER_DIR = Path(__file__).resolve().parent
IRC380 = CONVERTER_DIR / "input" / "IRC380"
MENU_DIR = CONVERTER_DIR / "Menu"


class InricoParserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        converter.SAMPLE_CSV_PATH = str(CONVERTER_DIR / "template.csv")
        converter.SAMPLE_JSON_TEMPLATE_PATH = str(CONVERTER_DIR / "template-json.json")
        cls.assertTrue(IRC380.exists(), IRC380)

    def test_load_irc380_uses_inrico_parser(self) -> None:
        product, parser = converter.load_and_normalize(IRC380)
        self.assertEqual(parser, "inrico")
        self.assertEqual(product["brand"], "Inrico")
        self.assertEqual(product["title"], "IRC380")
        self.assertEqual(product["mpn"], "IRC380")

    def test_gallery_images_are_absolute_and_unique(self) -> None:
        product, _ = converter.load_and_normalize(IRC380)
        urls = [img["url"] for img in product.get("images") or []]
        gallery = [
            u for u in urls
            if "inricosolutions.com/file/upload/" in u and u.endswith(".webp")
        ]
        self.assertGreaterEqual(len(set(gallery)), 4)

    def test_specification_groups(self) -> None:
        product, _ = converter.load_and_normalize(IRC380)
        techs = {g["technology"] for g in product.get("specifications") or []}
        self.assertIn("DMR", techs)
        for expected in ("CONNECTION", "OS", "HARDWARE", "CERTIFICATION"):
            self.assertIn(expected, techs)

    def test_highlights_brochure_and_video(self) -> None:
        product, _ = converter.load_and_normalize(IRC380)
        highlight_block = next(
            (b for b in product.get("desc_blocks") or [] if b.get("heading") == "Highlights"),
            None,
        )
        self.assertIsNotNone(highlight_block)
        feature_titles = [
            f.get("title", "") for f in (highlight_block or {}).get("features") or []
        ]
        self.assertTrue(any("Dual PTT Buttons" in t for t in feature_titles))

        file_urls = [f.get("url", "") for f in product.get("files") or []]
        self.assertTrue(any(u.endswith(".pdf") for u in file_urls))

        videos = product.get("videos") or []
        self.assertTrue(any(".mp4" in v for v in videos))

    def test_process_single_json_and_csv(self) -> None:
        menu = converter.MenuTaxonomy.load(MENU_DIR)
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            json_paths = converter.process_single(
                IRC380,
                out / "irc380.csv",
                menu=menu,
            )
            self.assertEqual(len(json_paths), 1)
            csv_path = out / "irc380.csv"
            json_path = out / "irc380.json"
            self.assertTrue(csv_path.exists())
            self.assertTrue(json_path.exists())

            payload = json.loads(json_path.read_text(encoding="utf-8"))
            self.assertEqual(payload["brand"], "Inrico")
            self.assertNotEqual(payload["brand"], "input")
            self.assertEqual(payload["mpn"], "IRC380")
            self.assertTrue(payload.get("media", {}).get("images"))
            self.assertTrue(payload.get("specifications"))
            self.assertEqual(payload["mainCategory"], "Security Systems")

            csv_text = csv_path.read_text(encoding="utf-8")
            self.assertIn("brt-IRC380", csv_text)


if __name__ == "__main__":
    unittest.main()
