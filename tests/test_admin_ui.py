import unittest
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HTML_PATH = ROOT / "admin" / "index.html"
CSS_PATH = ROOT / "admin" / "style.css"
JS_PATH = ROOT / "admin" / "admin.js"


class AdminMarkupParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.symbols = set()
        self.uses = set()

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if values.get("id"):
            self.ids.add(values["id"])
            if tag == "symbol":
                self.symbols.add(values["id"])
        if tag == "use" and values.get("href"):
            self.uses.add(values["href"].removeprefix("#"))


class AdminUiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = HTML_PATH.read_text(encoding="utf-8")
        cls.css = CSS_PATH.read_text(encoding="utf-8")
        cls.js = JS_PATH.read_text(encoding="utf-8")
        cls.parser = AdminMarkupParser()
        cls.parser.feed(cls.html)

    def test_required_admin_controls_are_preserved(self):
        required_ids = {
            "loginView", "loginForm", "password", "togglePassword", "loginStatus",
            "panel", "reloadBtn", "importPriceBtn", "priceImport", "openCreateBtn",
            "totalProducts", "averagePrice", "totalCategories", "catalogHealth",
            "search", "status", "products", "categoriesView", "categoryGroups",
            "ordersView", "ordersList", "ordersSearch", "ordersFilter", "ordersBadge",
            "reloadOrders", "newOrdersCount", "processingOrdersCount",
            "completedOrdersCount", "ordersRevenue", "historyView", "historyList",
            "notificationsView", "offersView",
            "createModal", "newNameRu", "newNameEn", "newCatRu", "newPrice",
            "newPriceUnit", "newPack", "newImg", "newDescRu", "newVisible",
            "imageUpload", "uploadStatus", "createBtn", "translateNameBtn",
            "translationHint",
        }
        self.assertFalse(required_ids - self.parser.ids)

    def test_svg_icon_system_is_complete(self):
        required_symbols = {
            "i-grid", "i-box", "i-layers", "i-history", "i-bell", "i-snow",
            "i-refresh", "i-upload", "i-plus", "i-lock", "i-eye", "i-eye-off",
            "i-search", "i-image", "i-edit", "i-trash", "i-grip", "i-up", "i-down",
        }
        self.assertFalse(required_symbols - self.parser.symbols)
        self.assertTrue(self.parser.uses <= self.parser.symbols)
        self.assertIn("const icon = name =>", self.js)

    def test_light_glacier_theme_and_responsive_rules_exist(self):
        for token in ("--bg: #dff4ff", "--accent: #159de2", "--glass:", "--shadow-float:"):
            self.assertIn(token, self.css)
        self.assertIn("backdrop-filter: blur", self.css)
        self.assertIn("@media (max-width: 900px)", self.css)
        self.assertIn("@media (max-width: 680px)", self.css)
        self.assertIn("@media (prefers-reduced-motion: reduce)", self.css)
        self.assertIn("/assets/optkholod_logo_mobile.png", self.html)
        self.assertNotIn("Cold dark theme", self.css)

    def test_dynamic_product_actions_and_mobile_labels_remain(self):
        for selector in ("data-save", "data-toggle", "data-edit", "data-delete", "data-move"):
            self.assertIn(selector, self.js)
        self.assertIn("mobile-field-label", self.js)
        self.assertIn("Цена с НДС", self.js)
        self.assertIn("Минимум", self.js)
        self.assertIn("aria-label", self.js)

    def test_orders_are_available_and_quick_save_has_feedback(self):
        self.assertIn('data-section="orders"', self.html)
        self.assertIn("async function loadOrders", self.js)
        self.assertIn("async function updateOrderStatus", self.js)
        self.assertIn("is-loading", self.js)
        self.assertIn("Сохранено", self.js)
        self.assertIn(".order-card", self.css)

    def test_catalog_actions_only_show_in_catalog_section(self):
        self.assertIn("function applySectionVisibility", self.js)
        self.assertIn("section!=='catalog'", self.js)
        self.assertIn("ADMIN_SECTION", self.js)
        self.assertIn("reloadCurrentSection", self.js)

    def test_product_name_auto_translation_remains_editable(self):
        self.assertIn("scheduleNameTranslation", self.js)
        self.assertIn("translateRussianName", self.js)
        self.assertIn("englishNameManuallyEdited", self.js)
        self.assertIn("/api/admin/translate-name", self.js)
        self.assertIn("setTimeout(()=>translateRussianName(),320)", self.js)
        self.assertIn('class="ghost inline-action"', self.html)
        self.assertIn("style.css?v=20260718-5", self.html)
        self.assertIn("admin.js?v=20260718-5", self.html)
        self.assertIn("background: linear-gradient(135deg,#43c4f2", self.css)


if __name__ == "__main__":
    unittest.main()
