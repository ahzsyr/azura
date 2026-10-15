"""Noon.com product page parsing into WooCommerce CSV + JSON."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

import converter

CONVERTER_DIR = Path(__file__).resolve().parent
SAMPLE = CONVERTER_DIR / "input" / "AirGateway-LR Low Cost AirMAX"

NOON_FIXTURE = """<html><head>
<link rel="canonical" href="https://www.noon.com/uae-en/sample-router/N1/p/"/>
</head><body>
<script id="$tsr-stream-barrier">
$R[0]={product:$R[1]={product_title:"Sample AirMAX 2.4 GHz Access Point",brand:"UBIQUITI",brand_code:"ubiquiti",long_description:null,feature_bullets:$R[2]=["Plug and play","2.4 GHz radio"],specifications:$R[3]=[$R[4]={code:"model_number",name:"Model Number",value:"AG-LR",value_code:"AG-LR"},$R[5]={code:"colour_name",name:"Color",value:"Black",value_code:"Black"}],image_urls:$R[6]=["https://f.nooncdn.com/p/sample.jpg"],offer_code:"offer1",variants:$R[7]=[$R[8]={sku:"N1",variant:"",offers:$R[9]=[$R[10]={offer_code:"offer1",sku:"N1",price:170,sale_price:null,stock:4,warranty:""}]}],breadcrumbs:$R[11]=[{code:"",name:"Home"},{code:"routers",name:"Routers"}]}};
</script>
</body></html>
"""


class NoonParserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        converter.SAMPLE_CSV_PATH = str(CONVERTER_DIR / "template.csv")
        converter.SAMPLE_JSON_TEMPLATE_PATH = str(CONVERTER_DIR / "template-json.json")

    def test_fixture_extracts_noon_catalog(self) -> None:
        product, parser = converter.load_and_normalize(self._write_fixture())
        self.assertEqual(parser, "noon")
        self.assertEqual(product["title"], "Sample AirMAX 2.4 GHz Access Point")
        self.assertEqual(product["brand"], "Ubiquiti")
        self.assertEqual(product["mpn"], "AG-LR")
        self.assertEqual(product["regular_price"], "170")
        self.assertEqual(product["currency"], "AED")
        self.assertEqual(product["stock"], 4)
        self.assertEqual(product["images"][0]["url"], "https://f.nooncdn.com/p/sample.jpg")
        names = [item["name"] for group in product["specifications"] for item in group["items"]]
        self.assertIn("Model Number", names)
        self.assertIn("Key Features", {block.get("heading") for block in product["desc_blocks"]})

    def test_sample_page_writes_wordpress_pair(self) -> None:
        if not SAMPLE.exists():
            self.skipTest("sample page not present")
        menu = converter.MenuTaxonomy.load(CONVERTER_DIR / "Menu")
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "airgateway.csv"
            json_paths = converter.process_single(SAMPLE, out, menu=menu)
            self.assertEqual(len(json_paths), 1)
            payload = json.loads(json_paths[0].read_text(encoding="utf-8"))
            csv_text = out.read_text(encoding="utf-8")
        self.assertEqual(payload["productTitle"], "AirGateway-LR Low Cost AirMAX Wireless 2.4 GHz Access Point Black")
        self.assertEqual(payload["brand"], "Ubiquiti")
        self.assertEqual(payload["mpn"], "AirGateway-LR")
        self.assertEqual(payload["price"]["value"], 170)
        self.assertEqual(payload["price"]["currency"], "AED")
        self.assertIn("Ubiquiti > Outdoor Wireless > airMAX 2.4 GHz", payload["brandPaths"])
        self.assertIn("Home and Office Networks > Access Points", payload["categoryPaths"])
        self.assertNotIn("Access Points > Access Points", " | ".join(payload["categoryPaths"]))
        self.assertTrue(payload["media"]["images"])
        self.assertTrue(payload["media"]["images"][0]["url"].startswith("https://"))
        self.assertIn("AirGateway-LR", csv_text)
        self.assertIn("170", csv_text)
        self.assertIn("specs-table", csv_text)
        self.assertIn("Band Technology", csv_text)
        self.assertIn("<style", csv_text)
        self.assertGreater(csv_text.rfind("<style"), csv_text.find("Product Overview"))

    def _write_fixture(self) -> Path:
        folder = Path(tempfile.mkdtemp())
        path = folder / "noon-sample.html"
        path.write_text(NOON_FIXTURE, encoding="utf-8")
        return path


if __name__ == "__main__":
    unittest.main()
