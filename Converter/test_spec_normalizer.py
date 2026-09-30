"""Tests for canonical specification normalization."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

import converter
from specifications import apply_spec_normalization, normalize_specifications
from specifications.matcher import match_specification

CONVERTER_DIR = Path(__file__).resolve().parent
IRC380 = CONVERTER_DIR / "input" / "IRC380"
MIKROTIK_JSON = (
    CONVERTER_DIR.parent
    / "src"
    / "features"
    / "products"
    / "import"
    / "__tests__"
    / "fixtures"
    / "mikrotik-sxtsq-5ax.json"
)


class SpecNormalizerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        converter.SAMPLE_CSV_PATH = str(CONVERTER_DIR / "template.csv")
        converter.SAMPLE_JSON_TEMPLATE_PATH = str(CONVERTER_DIR / "template-json.json")

    def _radio_product(self) -> dict:
        return {
            "brand": "Inrico",
            "title": "IRC380",
            "cat_path_titles": ["Security Systems", "Two-way Radios"],
            "mainCategory": "Security Systems",
        }

    def test_inrico_dmr_frequency_range(self) -> None:
        match, _, reason = match_specification(
            source_group="DMR",
            source_label="Frequency Range",
            value="UHF: 400-480MHz VHF: 136-174MHz",
            product_domain="radio",
        )
        self.assertIsNotNone(match)
        self.assertEqual(match.spec_id, "radio.frequency_range")
        self.assertIn(reason, ("EXACT", "CONTEXT_MATCH"))

    def test_belfone_general_frequency_range(self) -> None:
        match, _, _ = match_specification(
            source_group="GENERAL",
            source_label="Frequency Range",
            value="VHF: 136-174 MHz; UHF: 350-400 MHz",
            product_domain="radio",
        )
        self.assertIsNotNone(match)
        self.assertEqual(match.spec_id, "radio.frequency_range")

    def test_connection_frequencies_cellular_value_pattern(self) -> None:
        match, _, _ = match_specification(
            source_group="CONNECTION",
            source_label="Frequencies",
            value="2G: B2/B3/B5/B8\n4G-FDD: B1/B2/B3",
            product_domain="radio",
        )
        self.assertIsNotNone(match)
        self.assertEqual(match.spec_id, "connectivity.cellular_bands")

    def test_connection_frequencies_not_hardcoded_without_cellular_value(self) -> None:
        match, candidates, reason = match_specification(
            source_group="CONNECTION",
            source_label="Frequencies",
            value="UHF: 400-480MHz",
            product_domain="radio",
        )
        if match is not None:
            self.assertNotEqual(match.spec_id, "connectivity.cellular_bands")
        else:
            self.assertIn(reason, ("AMBIGUOUS", "UNMAPPED"))

    def test_ambiguous_power_label(self) -> None:
        match, candidates, reason = match_specification(
            source_group="GENERAL",
            source_label="Power",
            value="5W",
            product_domain="radio",
        )
        self.assertIsNone(match)
        self.assertEqual(reason, "AMBIGUOUS")
        self.assertGreaterEqual(len(candidates), 2)

    def test_irc380_full_normalization(self) -> None:
        self.assertTrue(IRC380.exists(), IRC380)
        product, parser = converter.load_and_normalize(IRC380)
        self.assertEqual(parser, "inrico")
        apply_spec_normalization(product)
        self.assertEqual(product.get("product_domain"), "radio")
        canon = product.get("canonical_specs") or {}
        self.assertIn("radio.frequency_range", canon)
        self.assertIn("connectivity.cellular_bands", canon)
        self.assertIn("radio.channel_capacity", canon)
        self.assertTrue(product.get("source_specifications"))
        src_groups = [g.get("technology") for g in product["source_specifications"]]
        self.assertIn("DMR", src_groups)

    def test_process_single_exports_canonical_csv_meta(self) -> None:
        menu = converter.MenuTaxonomy.load(CONVERTER_DIR / "Menu")
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            converter.process_single(IRC380, out / "irc380.csv", menu=menu)
            csv_text = (out / "irc380.csv").read_text(encoding="utf-8")
            json_payload = json.loads((out / "irc380.json").read_text(encoding="utf-8"))
            self.assertIn("Meta: canonical_specs", csv_text)
            self.assertIn("Meta: spec_radio_frequency_range", csv_text)
            self.assertIn("radio.frequency_range", json_payload.get("canonical_specs", {}))
            self.assertTrue(json_payload.get("source_specifications"))

    def test_mikrotik_json_normalizes(self) -> None:
        self.assertTrue(MIKROTIK_JSON.exists(), MIKROTIK_JSON)
        product = converter.normalize_from_json(json.loads(MIKROTIK_JSON.read_text(encoding="utf-8")))
        self.assertTrue(product.get("canonical_specs"))
        self.assertTrue(product.get("source_specifications"))

    def test_values_preserved_not_rewritten(self) -> None:
        raw = [{
            "technology": "DMR",
            "items": [{"name": "Power Output", "value": "UHF: High Power 4W / Low Power 2W  VHF: 5W"}],
        }]
        result = normalize_specifications(raw, product=self._radio_product())
        po = result.canonical_flat.get("radio.power_output")
        self.assertIsNotNone(po)
        self.assertIn("4W", po.value)


if __name__ == "__main__":
    unittest.main()
