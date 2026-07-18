import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "web" / "products.json"
CYRILLIC = re.compile(r"[А-Яа-яЁё]")


class CatalogContentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.products = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
        cls.by_id = {int(product["id"]): product for product in cls.products}

    def test_every_product_has_complete_bilingual_copy(self):
        self.assertEqual(len(self.products), 150)
        for product in self.products:
            with self.subTest(product_id=product["id"]):
                self.assertTrue(str(product["name"]["ru"]).strip())
                self.assertTrue(str(product["name"]["en"]).strip())
                self.assertTrue(str(product["cat"]["ru"]).strip())
                self.assertTrue(str(product["cat"]["en"]).strip())
                self.assertTrue(str(product["desc"]["ru"]).strip())
                self.assertTrue(str(product["desc"]["en"]).strip())
                self.assertIsNone(CYRILLIC.search(product["name"]["en"]))
                self.assertIsNone(CYRILLIC.search(product["cat"]["en"]))
                self.assertIsNone(CYRILLIC.search(product["desc"]["en"]))
                self.assertIn(product["priceUnit"], {"кг", "шт", "упак"})

    def test_new_descriptions_are_individual_and_mobile_length(self):
        self.assertGreaterEqual(len({product["desc"]["ru"] for product in self.products}), 140)
        self.assertGreaterEqual(len({product["desc"]["en"] for product in self.products}), 140)
        for product in self.products:
            with self.subTest(product_id=product["id"]):
                self.assertLessEqual(len(product["desc"]["ru"]), 520)
                self.assertLessEqual(len(product["desc"]["en"]), 520)

    def test_minimum_quantity_matches_corrected_price_list_pack(self):
        expected = {
            34: 10,
            56: 10,
            112: 12.5,
            115: 12.5,
            121: 4.5,
            122: 4.5,
            146: 14,
            155: 12.5,
        }
        for product_id, amount in expected.items():
            with self.subTest(product_id=product_id):
                self.assertEqual(self.by_id[product_id]["packKg"], amount)

    def test_reviewed_tags_and_english_terms(self):
        self.assertEqual(self.by_id[22]["tag"], "снеки")
        self.assertEqual(self.by_id[50]["tag"], "смеси")
        self.assertIn("straight-cut", self.by_id[7]["name"]["en"])
        self.assertIn("Broken raspberries", self.by_id[55]["name"]["en"])
        self.assertIn("Broken raspberries", self.by_id[143]["name"]["en"])
        self.assertIn("non-yeasted", self.by_id[126]["name"]["en"])
        self.assertIn("yeasted", self.by_id[127]["name"]["en"])

    def test_english_names_keep_price_list_codes(self):
        code_pattern = re.compile(r"\b[A-Z]{1,5}\d{3,}\b|\b\d{3}\.\d{3}\b")
        for product in self.products:
            codes = code_pattern.findall(product["name"]["ru"])
            with self.subTest(product_id=product["id"], codes=codes):
                for code in codes:
                    self.assertIn(code, product["name"]["en"])

    def test_every_assigned_image_is_local_and_exists(self):
        for product in self.products:
            image = str(product.get("img") or "").strip()
            if not image:
                continue
            with self.subTest(product_id=product["id"], image=image):
                self.assertFalse(image.startswith(("http://", "https://", "//")))
                self.assertTrue((ROOT / "web" / image).is_file())

    def test_farm_frites_products_use_semantic_images(self):
        expected = {
            8: "ff-regular-10mm.webp",
            9: "ff-crispy-coated-10mm.webp",
            10: "ff-bravi-10mm.webp",
            11: "ff-crinkle-12mm.webp",
            12: "ff-regular-7mm.webp",
            13: "ff-fast-fry-crinkle.webp",
            14: "ff-fast-fry-10mm.webp",
            15: "ff-wedges-skin-on.webp",
            16: "ff-seasoned-wedges.webp",
            17: "ff-noisettes.webp",
            18: "ff-mash.webp",
            19: "ff-oval-hashbrown.webp",
            20: "ff-triangular-hashbrown.webp",
            21: "ff-potato-pancakes.webp",
            22: "ff-onion-rings.webp",
            104: "ff-regular-10mm.webp",
            105: "ff-crispy-coated-10mm.webp",
            106: "ff-bravi-10mm.webp",
            107: "ff-crinkle-12mm.webp",
            108: "ff-regular-7mm.webp",
            109: "ff-fast-fry-crinkle.webp",
            110: "ff-fast-fry-10mm.webp",
            111: "ff-wedges-skin-on.webp",
            112: "ff-seasoned-wedges.webp",
            113: "ff-noisettes.webp",
            114: "ff-mash.webp",
            115: "ff-oval-hashbrown.webp",
            116: "ff-triangular-hashbrown.webp",
            117: "ff-sweet-potato-fries.webp",
            118: "ff-potato-pancakes.webp",
            119: "ff-finest-8x12-skin-on.webp",
        }
        for product_id, filename in expected.items():
            with self.subTest(product_id=product_id):
                self.assertTrue(self.by_id[product_id]["img"].endswith(filename))

    def test_old_random_placeholders_are_only_used_for_matching_products(self):
        expected_ids = {
            "assets/p1.jpg": {83, 84},
            "assets/p2.jpg": {40, 41, 42, 63, 124, 125},
            "assets/p4.jpg": {46, 47},
            "assets/p6.jpg": {69, 70, 71, 72, 73},
        }
        for image, ids in expected_ids.items():
            actual = {int(product["id"]) for product in self.products if product.get("img") == image}
            self.assertEqual(actual, ids, image)
        self.assertFalse(any(product.get("img") in {"assets/p3.jpg", "assets/p5.jpg"} for product in self.products))


if __name__ == "__main__":
    unittest.main()
