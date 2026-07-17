import math
import os
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from aiohttp.test_utils import TestClient, TestServer


os.environ["BOT_TOKEN"] = "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi"
os.environ["WEBAPP_URL"] = "https://example.com/store"
os.environ["ADMIN_PASSWORD"] = "test-only-admin-password"

import run  # noqa: E402


class CatalogValidationTests(unittest.TestCase):
    def test_order_uses_catalog_price_and_minimum_amount(self):
        product = next(item for item in run.load_products() if item.get("visible", True))
        amount = float(product.get("packKg") or 10)
        normalized = run.normalize_order({
            "requestId": "request_12345678",
            "items": [{
                "id": product["id"],
                "qty": 2,
                "amount": amount,
                "pricePerKg": 0.01,
                "total": 0.01,
            }],
        })
        expected = round(float(product["pricePerKg"]) * amount * 2, 2)
        self.assertEqual(normalized["total"], expected)
        self.assertEqual(normalized["items"][0]["pricePerKg"], float(product["pricePerKg"]))

    def test_unknown_product_is_rejected(self):
        with self.assertRaises(ValueError):
            run.normalize_order({"items": [{"id": 999_999_999, "qty": 1, "amount": 10}]})

    def test_catalog_ids_and_visible_prices_are_valid(self):
        products = run.load_products()
        self.assertEqual(len(products), len({int(product["id"]) for product in products}))
        for product in products:
            self.assertIn(product.get("priceUnit", "кг"), {"кг", "шт", "упак"})
            if product.get("visible", True):
                self.assertGreater(float(product.get("pricePerKg") or 0), 0)

    def test_piece_amount_must_be_integer(self):
        product = next(item for item in run.load_products() if item.get("visible", True) and item.get("priceUnit") == "шт")
        with self.assertRaises(ValueError):
            run.normalize_order({"items": [{"id": product["id"], "qty": 1, "amount": float(product["packKg"]) + 0.5}]})

    def test_order_storage_is_idempotent(self):
        original_orders_file = run.ORDERS_FILE
        user = SimpleNamespace(id=42, first_name="Test", username="test")
        order = {"requestId": "request_abcdefgh", "items": [], "total": 0, "vatIncluded": True}
        try:
            with tempfile.TemporaryDirectory() as directory:
                run.ORDERS_FILE = Path(directory) / "orders.json"
                first, created_first = run.store_order(order, user)
                second, created_second = run.store_order(order, user)
                self.assertTrue(created_first)
                self.assertFalse(created_second)
                self.assertEqual(first["orderId"], second["orderId"])
                self.assertEqual(len(run.load_json(run.ORDERS_FILE, [])), 1)
        finally:
            run.ORDERS_FILE = original_orders_file

    def test_non_finite_number_is_rejected(self):
        for value in (math.nan, math.inf, -math.inf):
            with self.assertRaises(ValueError):
                run.positive_number(value, "price")

    def test_image_path_stays_inside_assets(self):
        self.assertEqual(run.clean_image_path("assets/products/item.webp"), "assets/products/item.webp")
        for value in ("../.env", "assets/../.env", "C:/secret.png", "https://example.com/a.png"):
            with self.assertRaises(ValueError):
                run.clean_image_path(value)


class WebSecurityTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.client = TestClient(TestServer(run.create_web_app()))
        await self.client.start_server()

    async def asyncTearDown(self):
        await self.client.close()

    async def test_runtime_admin_files_are_not_public(self):
        for path in ("subscribers.json", "settings.json", "price_history.json", "orders.json", "price-import.xls"):
            response = await self.client.get(f"/admin-static/{path}")
            self.assertEqual(response.status, 404)

    async def test_public_admin_assets_are_allowlisted(self):
        for path in ("style.css", "admin.js"):
            response = await self.client.get(f"/admin-static/{path}")
            self.assertEqual(response.status, 200)

    async def test_cors_only_allows_configured_storefront(self):
        allowed = await self.client.options("/order", headers={"Origin": "https://example.com"})
        self.assertEqual(allowed.status, 204)
        self.assertEqual(allowed.headers.get("Access-Control-Allow-Origin"), "https://example.com")
        blocked = await self.client.options("/order", headers={"Origin": "https://attacker.example"})
        self.assertEqual(blocked.status, 204)
        self.assertNotIn("Access-Control-Allow-Origin", blocked.headers)


if __name__ == "__main__":
    unittest.main()
