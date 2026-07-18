import math
import os
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from aiohttp.test_utils import TestClient, TestServer


os.environ["BOT_TOKEN"] = "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi"
os.environ["WEBAPP_URL"] = "https://example.com/store"
os.environ["ADMIN_PASSWORD"] = "test-only-admin-password"

import run  # noqa: E402


class CatalogValidationTests(unittest.TestCase):
    def test_import_classifies_berries_and_uses_an_explicit_no_photo_state(self):
        self.assertEqual(run.infer_tag("Крыжовник замороженный", "Весовые продукты"), "ягоды")
        self.assertEqual(run.infer_tag("Черноплодная рябина", "Весовые продукты"), "ягоды")
        self.assertEqual(run.placeholder_for("овощи"), "")

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

    def test_local_name_translation_keeps_pack_and_product_code(self):
        translation, source = run.translate_product_name(
            "Картофельные дольки со специями TEST 2,5кг*4шт F123456"
        )
        self.assertEqual(source, "local")
        self.assertIn("seasoned potato wedges", translation)
        self.assertIn("2.5 kg × 4 pcs", translation)
        self.assertIn("F123456", translation)

    def test_translation_corrects_typo_instead_of_transliterating(self):
        translation, source = run.translate_product_name("мащина")
        self.assertEqual(source, "local")
        self.assertEqual(translation, "car")
        with self.assertRaisesRegex(ValueError, "Не удалось перевести"):
            run.translate_product_name("совершеннонеизвестноеслово")

    def test_cloud_translation_restores_exact_product_codes(self):
        translated = run.preserve_product_codes(
            "Новый товар FR000037 и партия 005.100",
            "New product fr000037 and batch",
        )
        self.assertIn("FR000037", translated)
        self.assertIn("005.100", translated)


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
            self.assertEqual(response.headers.get("Cache-Control"), "no-store")

    async def test_cors_only_allows_configured_storefront(self):
        allowed_origin = next(iter(run.ALLOWED_ORIGINS))
        allowed = await self.client.options("/order", headers={"Origin": allowed_origin})
        self.assertEqual(allowed.status, 204)
        self.assertEqual(allowed.headers.get("Access-Control-Allow-Origin"), allowed_origin)
        blocked = await self.client.options("/order", headers={"Origin": "https://attacker.example"})
        self.assertEqual(blocked.status, 204)
        self.assertNotIn("Access-Control-Allow-Origin", blocked.headers)

    async def test_admin_can_update_order_status(self):
        original_orders_file = run.ORDERS_FILE
        try:
            with tempfile.TemporaryDirectory() as directory:
                run.ORDERS_FILE = Path(directory) / "orders.json"
                run.save_json(run.ORDERS_FILE, [{
                    "orderId": "OH-20260718-ABC123",
                    "requestId": "request_abcdefgh",
                    "status": "new",
                    "items": [],
                    "total": 100,
                }])
                response = await self.client.post(
                    "/api/admin/orders/OH-20260718-ABC123/status",
                    headers={"X-Admin-Password": "test-only-admin-password"},
                    json={"status": "processing"},
                )
                self.assertEqual(response.status, 200)
                payload = await response.json()
                self.assertEqual(payload["order"]["status"], "processing")
                self.assertEqual(run.load_json(run.ORDERS_FILE, [])[0]["status"], "processing")
        finally:
            run.ORDERS_FILE = original_orders_file

    async def test_admin_rejects_unknown_order_status(self):
        response = await self.client.post(
            "/api/admin/orders/missing/status",
            headers={"X-Admin-Password": "test-only-admin-password"},
            json={"status": "unknown"},
        )
        self.assertEqual(response.status, 400)

    async def test_admin_translates_product_name(self):
        response = await self.client.post(
            "/api/admin/translate-name",
            headers={"X-Admin-Password": "test-only-admin-password"},
            json={"text": "Картофель фри Global Fries 10 mm 10 кг (2,5кг*4шт) FR000037"},
        )
        self.assertEqual(response.status, 200)
        payload = await response.json()
        self.assertEqual(payload["source"], "catalog")
        self.assertIn("FR000037", payload["translation"])

    async def test_unknown_name_is_translated_by_yandex_and_cached(self):
        original_cache_file = run.TRANSLATION_CACHE_FILE
        try:
            with tempfile.TemporaryDirectory() as directory:
                run.TRANSLATION_CACHE_FILE = Path(directory) / "translations.json"
                provider = AsyncMock(return_value="Red delivery car fr123456")
                with patch.object(run, "request_yandex_translation", provider):
                    first, first_source = await run.translate_product_name_with_provider(
                        "Красная машина для доставки FR123456"
                    )
                    second, second_source = await run.translate_product_name_with_provider(
                        "Красная машина для доставки FR123456"
                    )
                self.assertEqual(first_source, "yandex")
                self.assertEqual(second_source, "cache")
                self.assertIn("FR123456", first)
                self.assertEqual(first, second)
                provider.assert_awaited_once()
        finally:
            run.TRANSLATION_CACHE_FILE = original_cache_file

    async def test_unknown_name_reports_missing_yandex_configuration(self):
        original_cache_file = run.TRANSLATION_CACHE_FILE
        try:
            with tempfile.TemporaryDirectory() as directory:
                run.TRANSLATION_CACHE_FILE = Path(directory) / "translations.json"
                with patch.object(run, "YANDEX_TRANSLATE_API_KEY", ""):
                    response = await self.client.post(
                        "/api/admin/translate-name",
                        headers={"X-Admin-Password": "test-only-admin-password"},
                        json={"text": "совершеннонеизвестноеслово"},
                    )
                self.assertEqual(response.status, 503)
                payload = await response.json()
                self.assertIn("YANDEX_TRANSLATE_API_KEY", payload["error"])
        finally:
            run.TRANSLATION_CACHE_FILE = original_cache_file


if __name__ == "__main__":
    unittest.main()
