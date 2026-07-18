import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class MobileFrontendTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
        cls.script = (ROOT / "frontend" / "src" / "main.ts").read_text(encoding="utf-8")
        cls.styles = (ROOT / "frontend" / "src" / "style.scss").read_text(encoding="utf-8")

    def test_phone_viewport_and_controls_are_configured(self):
        viewport = re.search(r'<meta\s+name="viewport"\s+content="([^"]+)"', self.html)
        self.assertIsNotNone(viewport)
        self.assertIn("viewport-fit=cover", viewport.group(1))
        self.assertIn("interactive-widget=resizes-content", viewport.group(1))
        for button in re.findall(r"<button\b[^>]*>", self.html):
            self.assertRegex(button, r'\btype="button"')
        self.assertIn('src="assets/optkholod_logo_mobile.png"', self.html)
        mobile_logo = ROOT / "web" / "assets" / "optkholod_logo_mobile.png"
        self.assertTrue(mobile_logo.is_file())
        self.assertLess(mobile_logo.stat().st_size, 400_000)

    def test_country_flags_and_mobile_layout_contract_are_preserved(self):
        for flag in ("🇪🇺", "🇨🇳", "🇷🇺"):
            self.assertIn(flag, self.html)
        self.assertIn("@media (max-width: 430px)", self.styles)
        self.assertIn("grid-template-columns: repeat(2, minmax(0, 1fr))", self.styles)
        self.assertIn("--mini-safe-bottom", self.styles)
        self.assertRegex(
            self.styles,
            re.compile(r"input\s*\{[^{}]*font-size:\s*16px", re.DOTALL),
        )

    def test_mobile_catalog_and_required_business_copy_are_present(self):
        self.assertIn("const CARD_BATCH_SIZE = 24", self.script)
        self.assertIn("new IntersectionObserver", self.script)
        self.assertIn("tg.expand()", self.script)
        self.assertIn("Все цены с НДС.", self.script)
        self.assertIn("Минимальный заказ — от одной палеты.", self.script)
        self.assertIn("Самовывоз со склада в Москве.", self.script)
        self.assertIn("+7 995 796-20-36", self.script)


if __name__ == "__main__":
    unittest.main()
