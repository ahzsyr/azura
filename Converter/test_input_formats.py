"""Tests for JSON/CSV input parsing into the same CSV+JSON pair as HTML."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

import converter

CONVERTER_DIR = Path(__file__).resolve().parent
FIXTURES = CONVERTER_DIR.parent / "src" / "features" / "products" / "import" / "__tests__" / "fixtures"
UNIFI_JSON = FIXTURES / "unifi-u7-pro-xg.json"
MIKROTIK_JSON = FIXTURES / "mikrotik-sxtsq-5ax.json"


class InputFormatTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        converter.SAMPLE_CSV_PATH = str(CONVERTER_DIR / "template.csv")
        converter.SAMPLE_JSON_TEMPLATE_PATH = str(CONVERTER_DIR / "template-json.json")

    def test_detects_json_csv_and_html(self) -> None:
        self.assertEqual(converter.detect_input_format('{"title": "X"}'), "json")
        self.assertEqual(converter.detect_input_format('[{"title": "X"}]'), "json")
        self.assertEqual(
            converter.detect_input_format("ID,Type,SKU,Name,Regular price\n1,simple,a,A,1\n"),
            "csv",
        )
        self.assertEqual(
            converter.detect_input_format("<html><h1>Product</h1></html>"),
            "html",
        )
        self.assertEqual(
            converter.detect_input_format("not csv", Path("item.csv")),
            "csv",
        )

    def test_json_array_yields_one_record_per_product(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "products.json"
            path.write_text(
                json.dumps([
                    {"productTitle": "Alpha Radio", "brand": "Ubiquiti", "mpn": "A-1"},
                    {"productTitle": "Beta Radio", "brand": "MikroTik", "mpn": "B-2"},
                ]),
                encoding="utf-8",
            )
            loaded = converter.load_all_products(path)
        self.assertEqual(len(loaded), 2)
        self.assertEqual(loaded[0][0]["title"], "Alpha Radio")
        self.assertEqual(loaded[1][0]["title"], "Beta Radio")
        self.assertEqual(loaded[0][1], "raw_json")

    def test_unifi_json_keeps_rich_fields(self) -> None:
        self.assertTrue(UNIFI_JSON.exists(), UNIFI_JSON)
        product, parser = converter.load_and_normalize(UNIFI_JSON)
        self.assertEqual(parser, "raw_json")
        self.assertEqual(product["title"], "U7 Pro XG")
        self.assertEqual(product["output_format"], "unifi")
        self.assertTrue(product.get("available_colors"))
        self.assertTrue(product.get("color_variants"))
        self.assertTrue(product.get("model_3d", {}).get("url"))
        tabs = {block.get("tab") for block in product.get("desc_blocks") or []}
        self.assertIn("overview", tabs)
        self.assertIn("installation", tabs)
        overview = next(
            b for b in product["desc_blocks"] if b.get("heading") == "Key Features"
        )
        self.assertEqual(overview.get("text"), "WiFi 7 with 6 GHz support")
        self.assertTrue(overview.get("features"))

    def test_mikrotik_json_keeps_layout_fields(self) -> None:
        self.assertTrue(MIKROTIK_JSON.exists(), MIKROTIK_JSON)
        product, parser = converter.load_and_normalize(MIKROTIK_JSON)
        self.assertEqual(parser, "raw_json")
        self.assertEqual(product["output_format"], "mikrotik")
        self.assertTrue(product.get("included_parts") or product.get("wireless_tables"))
        self.assertTrue(product.get("images"))

    def test_json_and_csv_emit_companion_files(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            json_paths = converter.process_single(UNIFI_JSON, out / "u7-pro-xg.csv")
            self.assertEqual(len(json_paths), 1)
            csv_path = out / "u7-pro-xg.csv"
            json_path = out / "u7-pro-xg.json"
            self.assertTrue(csv_path.exists())
            self.assertTrue(json_path.exists())
            payload = json.loads(json_path.read_text(encoding="utf-8"))
            self.assertEqual(payload["productTitle"], "U7 Pro XG")
            self.assertEqual(payload.get("output_format") or "unifi", "unifi")
            self.assertTrue(payload.get("detailed_description"))

            reloaded, parser = converter.load_and_normalize(csv_path)
            self.assertEqual(parser, "woocommerce_csv")
            self.assertEqual(reloaded["title"], "U7 Pro XG")
            self.assertIn("Black", reloaded.get("available_colors") or [])

    def test_multi_product_csv_writes_one_pair_each(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            src = Path(tmp) / "catalog.csv"
            headers = converter.load_csv_headers()
            row_a = {h: "" for h in headers}
            row_b = {h: "" for h in headers}
            row_a.update({"Type": "simple", "SKU": "brt-a", "Name": "Alpha Kit", "Regular price": "10"})
            row_b.update({"Type": "simple", "SKU": "brt-b", "Name": "Beta Kit", "Regular price": "20"})
            converter.write_csv(src, [row_a, row_b])

            out_dir = Path(tmp) / "out"
            json_paths = converter.process_single(src, out_dir / "catalog.csv")
            self.assertEqual(len(json_paths), 2)
            names = {p.stem for p in json_paths}
            self.assertEqual(names, {"alpha-kit", "beta-kit"})
            for path in json_paths:
                self.assertTrue(path.with_suffix(".csv").exists())
                data = json.loads(path.read_text(encoding="utf-8"))
                self.assertIn(data["productTitle"], ("Alpha Kit", "Beta Kit"))


if __name__ == "__main__":
    unittest.main()
