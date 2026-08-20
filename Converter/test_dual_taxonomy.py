"""Tests for dual taxonomy path resolution and bought_together fill."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from converter import (
    MenuTaxonomy,
    build_product_json,
    discover_product_jobs,
    fill_bought_together_from_siblings,
    folder_segments_to_prefixed_paths,
    resolve_menu_category_paths,
    write_product_json,
)


MENU_DIR = Path(__file__).resolve().parent / "Menu"


class DualTaxonomyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.menu = MenuTaxonomy.load(MENU_DIR)

    def test_airfiber_style_brand_and_store_paths(self) -> None:
        product = {
            "brand": "Ubiquiti",
            "brand_path_titles": ["60 GHz Wireless"],
            "category_root": "airFiber 60 GHz",
            "cat_path_titles": ["Outdoor Wireless", "Carrier Backhaul Radio"],
            "cat_leaf": "Radio Systems",
            "title": "Ubiquiti airFiber 60 XG",
        }
        brand_paths, category_paths, warnings = resolve_menu_category_paths(
            product,
            "Ubiquiti",
            [],
            self.menu,
            brand_folder_segments=["Ubiquiti", "60 GHz Wireless", "airFiber 60 GHz"],
            category_folder_segments=[
                "Outdoor Wireless",
                "Carrier Backhaul Radio",
                "Radio Systems",
            ],
        )
        self.assertTrue(
            any("airFiber 60 GHz" in p for p in brand_paths),
            brand_paths,
        )
        self.assertTrue(
            any("Radio Systems" in p for p in category_paths),
            category_paths,
        )
        self.assertTrue(any(p.startswith("Ubiquiti") for p in brand_paths))
        self.assertTrue(any(p.startswith("Outdoor Wireless") for p in category_paths))
        # Folder paths are independent (not merged into one hierarchy)
        self.assertFalse(any(p.startswith("Ubiquiti > Outdoor") for p in brand_paths))
        self.assertFalse(any(p.startswith("Outdoor Wireless > Ubiquiti") for p in category_paths))

        product["brand_paths"] = brand_paths
        product["category_paths"] = category_paths
        product["menu_category_paths"] = sorted(set(brand_paths) | set(category_paths))
        product["mainCategory"] = "Outdoor"
        product["matchingRules"] = ["outdoor"]
        product["slug"] = "airfiber-60-xg"
        product["regular_price"] = 999
        product["stock"] = 3
        payload = build_product_json(product)
        self.assertIn("brandPaths", payload)
        self.assertIn("categoryPaths", payload)
        self.assertIn("brandCategories", payload)
        self.assertIn("storeCategories", payload)
        self.assertEqual(
            payload["brandCategories"],
            ["Ubiquiti", "60 GHz Wireless", "airFiber 60 GHz"],
        )
        self.assertEqual(
            payload["storeCategories"],
            ["Outdoor Wireless", "Carrier Backhaul Radio", "Radio Systems"],
        )
        self.assertTrue(payload["brandPaths"])
        self.assertTrue(payload["categoryPaths"])
        self.assertIn("Ubiquiti", payload["categories"])
        self.assertIn("Radio Systems", payload["categories"])
        self.assertEqual(payload["category"], "Radio Systems")

    def test_folder_only_store_path(self) -> None:
        product = {"brand": "Ubiquiti", "title": "Radio"}
        brand_paths, category_paths, _ = resolve_menu_category_paths(
            product,
            "Ubiquiti",
            [],
            self.menu,
            category_folder_segments=[
                "Outdoor Wireless",
                "Carrier Backhaul Radio",
                "Radio Systems",
            ],
        )
        self.assertTrue(
            any("Radio Systems" in p for p in category_paths),
            category_paths,
        )
        self.assertEqual(brand_paths, [])

    def test_variable_depth_and_unknown_brand(self) -> None:
        """Folder paths work at any depth and without Menu registration."""
        paths = folder_segments_to_prefixed_paths(["Acme", "Line", "Series", "Leaf"])
        self.assertEqual(
            paths,
            [
                "Acme",
                "Acme > Line",
                "Acme > Line > Series",
                "Acme > Line > Series > Leaf",
            ],
        )
        brand_paths, category_paths, _ = resolve_menu_category_paths(
            {"title": "Widget"},
            "Acme",
            [],
            self.menu,
            brand_folder_segments=["Acme", "Line", "Series"],
            category_folder_segments=["Custom Root", "Sub"],
        )
        self.assertIn("Acme > Line > Series", brand_paths)
        self.assertIn("Custom Root > Sub", category_paths)

    def test_dual_root_folder_discovery_and_merge(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            brand_file = (
                root
                / "Brands"
                / "Ubiquiti"
                / "60 GHz Wireless"
                / "airFiber 60 GHz"
                / "airFiber-60-XG.html"
            )
            cat_file = (
                root
                / "Categories"
                / "Outdoor Wireless"
                / "Carrier Backhaul Radio"
                / "Radio Systems"
                / "airFiber-60-XG.html"
            )
            brand_file.parent.mkdir(parents=True)
            cat_file.parent.mkdir(parents=True)
            html = "<html><body><h1>Ubiquiti airFiber 60 XG</h1></body></html>"
            brand_file.write_text(html, encoding="utf-8")
            cat_file.write_text(html, encoding="utf-8")

            out = root / "out"
            jobs = discover_product_jobs(root, out, self.menu, None)
            self.assertEqual(len(jobs), 1)
            job = jobs[0]
            self.assertEqual(
                job.brand_folder_segments,
                ["Ubiquiti", "60 GHz Wireless", "airFiber 60 GHz"],
            )
            self.assertEqual(
                job.category_folder_segments,
                ["Outdoor Wireless", "Carrier Backhaul Radio", "Radio Systems"],
            )

    def test_bought_together_same_brand_overlap(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            products = [
                {
                    "slug": "af-1",
                    "name": "AF One",
                    "brand": "Ubiquiti",
                    "categories": ["Ubiquiti", "airFiber 60 GHz", "Radio Systems"],
                    "brandPaths": ["Ubiquiti > 60 GHz Wireless > airFiber 60 GHz"],
                    "categoryPaths": [
                        "Outdoor Wireless > Carrier Backhaul Radio > Radio Systems"
                    ],
                    "bought_together": [
                        {"name": "Scraped Adapter", "slug": "adapter", "url": "/product/adapter"}
                    ],
                    "price": {"value": 100, "currency": "USD"},
                    "availability": "InStock",
                    "mpn": "AF-1",
                    "media": {"images": []},
                },
                {
                    "slug": "af-2",
                    "name": "AF Two",
                    "brand": "Ubiquiti",
                    "categories": ["Ubiquiti", "airFiber 60 GHz", "Radio Systems"],
                    "brandPaths": ["Ubiquiti > 60 GHz Wireless > airFiber 60 GHz"],
                    "categoryPaths": [
                        "Outdoor Wireless > Carrier Backhaul Radio > Radio Systems"
                    ],
                    "bought_together": [],
                    "price": {"value": 200, "currency": "USD"},
                    "availability": "InStock",
                    "mpn": "AF-2",
                    "media": {"images": []},
                },
                {
                    "slug": "other-brand",
                    "name": "MikroTik Radio",
                    "brand": "MikroTik",
                    "categories": ["MikroTik", "60GHz Wireless"],
                    "bought_together": [],
                    "price": {"value": 50, "currency": "USD"},
                    "availability": "InStock",
                    "mpn": "MT-1",
                    "media": {"images": []},
                },
            ]
            paths = []
            for p in products:
                path = root / f"{p['slug']}.json"
                write_product_json(path, p)
                paths.append(path)

            updated = fill_bought_together_from_siblings(paths)
            self.assertGreaterEqual(updated, 1)

            af1 = json.loads((root / "af-1.json").read_text(encoding="utf-8"))
            names = [i.get("name") for i in af1.get("bought_together") or []]
            self.assertEqual(names[0], "Scraped Adapter")
            self.assertIn("AF Two", names)
            self.assertNotIn("MikroTik Radio", names)
            self.assertNotIn("AF One", names)


class SeedBrandChildRulesTests(unittest.TestCase):
    def test_brand_child_rules_use_all(self) -> None:
        seeds = MENU_DIR / "seeds" / "catalog" / "brands.json"
        data = json.loads(seeds.read_text(encoding="utf-8"))
        child = next(
            c
            for c in data["collections"]
            if c.get("parentSlug") not in (None, "brands") and c.get("parentSlug")
        )
        conditions = child["conditions"]
        self.assertEqual(conditions.get("match"), "all")
        self.assertIn("children", conditions)


if __name__ == "__main__":
    unittest.main()
