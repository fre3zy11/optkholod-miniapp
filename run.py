import asyncio
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from aiohttp import web
from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command, CommandStart
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    MenuButtonWebApp,
    Message,
    WebAppInfo,
)
from aiogram.utils.web_app import safe_parse_webapp_init_data
import xlrd

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
WEB_DIR = BASE_DIR / "web"
ADMIN_DIR = BASE_DIR / "admin"
PRODUCTS_FILE = WEB_DIR / "products.json"
HISTORY_FILE = ADMIN_DIR / "price_history.json"
SETTINGS_FILE = ADMIN_DIR / "settings.json"
SUBSCRIBERS_FILE = ADMIN_DIR / "subscribers.json"
UPLOAD_DIR = WEB_DIR / "assets" / "products" / "uploads"

BOT_TOKEN = os.getenv("BOT_TOKEN")
WEBAPP_URL = os.getenv("WEBAPP_URL")
ORDER_CHAT_ID = os.getenv("ORDER_CHAT_ID") or os.getenv("ADMIN_CHAT_ID")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
PORT = int(os.getenv("PORT", "8000"))

if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN is missing in .env")
if not WEBAPP_URL:
    raise RuntimeError("WEBAPP_URL is missing in .env")

bot = Bot(BOT_TOKEN)
dp = Dispatcher()


def rub(value: Any) -> str:
    try:
        number = float(value or 0)
    except (TypeError, ValueError):
        number = 0
    if abs(number - round(number)) < 0.001:
        return f"{int(round(number)):,}".replace(",", " ") + " ₽"
    return f"{number:,.2f}".replace(",", " ").replace(".", ",") + " ₽"


def load_products() -> list[dict[str, Any]]:
    if not PRODUCTS_FILE.exists():
        return []
    with PRODUCTS_FILE.open("r", encoding="utf-8") as file:
        data = json.load(file)
    if isinstance(data, dict):
        data = data.get("products", [])
    return data if isinstance(data, list) else []


def save_products(products: list[dict[str, Any]]) -> None:
    PRODUCTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with PRODUCTS_FILE.open("w", encoding="utf-8") as file:
        json.dump(products, file, ensure_ascii=False, indent=2)
        file.write("\n")


def load_json(path: Path, fallback: Any) -> Any:
    try:
        with path.open("r", encoding="utf-8") as file:
            return json.load(file)
    except (FileNotFoundError, json.JSONDecodeError):
        return fallback


def save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
        file.write("\n")


def add_price_history(product: dict[str, Any], old_price: float, new_price: float) -> None:
    if old_price == new_price:
        return
    history = load_json(HISTORY_FILE, [])
    history.insert(0, {
        "productId": product.get("id"), "productName": product_name(product),
        "oldPrice": old_price, "newPrice": new_price,
        "changedAt": datetime.now(timezone.utc).isoformat(),
    })
    save_json(HISTORY_FILE, history[:500])


def remember_subscriber(user: Any) -> None:
    subscribers = load_json(SUBSCRIBERS_FILE, [])
    user_id = int(getattr(user, "id", 0) or 0)
    if not user_id:
        return
    entry = next((item for item in subscribers if int(item.get("id", 0)) == user_id), None)
    data = {"id": user_id, "firstName": getattr(user, "first_name", "") or "", "username": getattr(user, "username", "") or "", "active": True}
    if entry:
        entry.update(data)
    else:
        subscribers.append(data)
    save_json(SUBSCRIBERS_FILE, subscribers)


def normalized_product_name(value: str) -> str:
    return re.sub(r"[^а-яёa-z0-9]+", "", str(value).lower())


def infer_country(name: str) -> str:
    value = name.lower()
    if "китай" in value: return "Китай"
    if any(word in value for word in ("россия", "русбери", "дикорос", "карел", "волог", "тамбов")): return "Россия"
    return "Европа"


def infer_tag(name: str, section: str) -> str:
    value = f"{section} {name}".lower()
    if any(word in value for word in ("фри", "картоф", "дольк")): return "картофель"
    if any(word in value for word in ("ягод", "клубник", "малин", "вишн", "смород", "брусник", "клюкв")): return "ягоды"
    if any(word in value for word in ("гриб", "шампин", "опят", "маслят")): return "грибы"
    if any(word in value for word in ("фрукт", "ананас", "манго", "персик")): return "фрукты"
    if "смес" in value: return "смеси"
    return "овощи"


def placeholder_for(tag: str) -> str:
    return {"картофель":"assets/products/fries-10mm.webp", "ягоды":"assets/p1.jpg", "овощи":"assets/p2.jpg", "грибы":"assets/p4.jpg", "фрукты":"assets/p5.jpg", "смеси":"assets/p6.jpg"}.get(tag, "assets/p3.jpg")


def import_price_xls(path: Path) -> dict[str, Any]:
    book = xlrd.open_workbook(str(path))
    products = load_products()
    by_name = {normalized_product_name(product_name(p)): p for p in products}
    added = updated = 0
    section = "Замороженные продукты"
    for sheet in book.sheets():
        for row_index in range(sheet.nrows):
            name = str(sheet.cell_value(row_index, 0) or "").strip()
            if not name: continue
            price = sheet.cell_value(row_index, 3) if sheet.ncols > 3 else ""
            pack = sheet.cell_value(row_index, 2) if sheet.ncols > 2 else ""
            if not isinstance(price, (int, float)) or price <= 0:
                if len(name) > 5 and not any(word in name.lower() for word in ("прайс", "оптхолод", "цена")): section = name
                continue
            tag = infer_tag(name, section)
            existing = by_name.get(normalized_product_name(name))
            if existing:
                old_price = float(existing.get("pricePerKg") or 0)
                existing.update({"pricePerKg":float(price), "packKg":float(pack or existing.get("packKg") or 10), "country":infer_country(name), "tag":tag})
                existing.setdefault("cat", {})["ru"] = section
                add_price_history(existing, old_price, float(price)); updated += 1
            else:
                next_id = max([int(p.get("id", 0)) for p in products] or [0]) + 1
                product = {"id":next_id,"name":{"ru":name,"en":name},"cat":{"ru":section,"en":section},"desc":{"ru":"","en":""},"pricePerKg":float(price),"packKg":float(pack or 10),"img":placeholder_for(tag),"tag":tag,"country":infer_country(name),"visible":True,"sortOrder":len(products)}
                products.append(product); by_name[normalized_product_name(name)] = product; added += 1
    for product in products:
        product.setdefault("country", infer_country(product_name(product)))
        product.setdefault("visible", True)
        product.setdefault("sortOrder", products.index(product))
    save_products(products)
    return {"added":added,"updated":updated,"total":len(products)}


def check_admin(request: web.Request) -> None:
    token = request.headers.get("X-Admin-Password") or request.query.get("password")
    if not ADMIN_PASSWORD or token != ADMIN_PASSWORD:
        raise web.HTTPUnauthorized(text="Неверный пароль админки")


def product_name(product: dict[str, Any]) -> str:
    name = product.get("name", "")
    if isinstance(name, dict):
        return name.get("ru") or name.get("en") or "Товар"
    return str(name or "Товар")


def build_order_text(order: dict[str, Any], user: Any = None) -> str:
    items = order.get("items") or []
    total = order.get("total") or 0

    if user:
        username = f"@{user.username}" if getattr(user, "username", None) else "без username"
        buyer = f"{getattr(user, 'first_name', '') or 'Клиент'} {username}\nTelegram ID: {getattr(user, 'id', 'неизвестно')}"
    else:
        buyer_data = order.get("user") or {}
        username = buyer_data.get("username")
        buyer = (
            f"{buyer_data.get('first_name') or 'Клиент'}"
            f" {('@' + username) if username else 'без username'}\n"
            f"Telegram ID: {buyer_data.get('id') or 'неизвестно'}"
        )

    lines = [
        "🧾 Новый заказ ОптХолод",
        "",
        "👤 Покупатель:",
        buyer,
        "",
        "📦 Товары:",
    ]

    if not items:
        lines.append("Корзина пустая")
    else:
        for index, item in enumerate(items, start=1):
            name = item.get("name") or f"Товар #{item.get('id', index)}"
            weight = item.get("weight") or 0
            qty = item.get("qty") or 1
            price = item.get("pricePerKg") or 0
            item_total = item.get("total") or 0
            lines.extend([
                f"{index}. {name}",
                f"   Вес: {weight} кг × {qty} шт.",
                f"   Цена: {rub(price)}/кг с НДС",
                f"   Сумма: {rub(item_total)}",
            ])

    lines.extend([
        "",
        f"💰 Итого: {rub(total)} с НДС",
        "ℹ️ Минимальный заказ от палета.",
        "📍 Самовывоз со склада в Москве.",
    ])
    return "\n".join(lines)


async def send_order_to_admin(order: dict[str, Any], user: Any = None) -> None:
    if not ORDER_CHAT_ID:
        raise RuntimeError("ORDER_CHAT_ID is missing in .env")
    await bot.send_message(chat_id=int(ORDER_CHAT_ID), text=build_order_text(order, user))


@dp.message(CommandStart())
async def start(message: Message):
    remember_subscriber(message.from_user)
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="❄️ Перейти в магазин",
                    web_app=WebAppInfo(url=WEBAPP_URL),
                )
            ]
        ]
    )
    await message.answer("❄️ Добро пожаловать в ОптХолод!\nВыберите продукты и оформите заказ в нашем магазине.", reply_markup=kb)


@dp.message(Command("id"))
async def get_id(message: Message):
    await message.answer(
        f"Твой Telegram ID: {message.from_user.id}\n\n"
        "Вставь его в .env так:\n"
        f"ORDER_CHAT_ID={message.from_user.id}"
    )


@dp.message(F.web_app_data)
async def handle_web_app_data(message: Message):
    try:
        data = json.loads(message.web_app_data.data)
    except Exception:
        await message.answer("Не удалось прочитать заказ из Mini App.")
        return

    if data.get("type") == "order":
        try:
            await send_order_to_admin(data, message.from_user)
            await message.answer("Спасибо за заказ! С вами свяжется наш менеджер для обсуждения деталей)")
        except Exception as error:
            await message.answer(f"Заказ не отправился: {error}")


@dp.message(F.text)
async def customer_message(message: Message):
    remember_subscriber(message.from_user)
    if not ORDER_CHAT_ID or message.chat.id == int(ORDER_CHAT_ID):
        return
    username = f"@{message.from_user.username}" if message.from_user.username else "без username"
    await bot.send_message(int(ORDER_CHAT_ID), f"💬 Сообщение покупателя\n{message.from_user.first_name} {username}\nTelegram ID: {message.from_user.id}\n\n{message.text}")
    await message.answer("Сообщение отправлено менеджеру. Мы ответим вам в Telegram.")


async def index(request: web.Request):
    return web.FileResponse(WEB_DIR / "index.html")


async def admin_index(request: web.Request):
    return web.FileResponse(ADMIN_DIR / "index.html")


async def auth(request: web.Request):
    data = await request.json()
    init_data = data.get("initData")

    try:
        parsed = safe_parse_webapp_init_data(BOT_TOKEN, init_data)
    except Exception:
        return web.json_response({"ok": False, "error": "Invalid initData"}, status=401)

    user = parsed.user
    return web.json_response({
        "ok": True,
        "user": {
            "id": user.id,
            "first_name": user.first_name,
            "username": user.username,
        }
    })


async def order(request: web.Request):
    try:
        data = await request.json()
    except Exception:
        return web.json_response({"ok": False, "error": "Bad JSON"}, status=400)

    parsed_user = None
    init_data = data.get("initData")
    if init_data:
        try:
            parsed = safe_parse_webapp_init_data(BOT_TOKEN, init_data)
            parsed_user = parsed.user
            data["user"] = {
                "id": parsed_user.id,
                "first_name": parsed_user.first_name,
                "username": parsed_user.username,
            }
        except Exception:
            return web.json_response({"ok": False, "error": "Invalid Telegram initData"}, status=401)

    try:
        settings = load_json(SETTINGS_FILE, {"newOrders": True})
        if settings.get("newOrders", True):
            await send_order_to_admin(data, parsed_user)
    except Exception as error:
        return web.json_response({"ok": False, "error": str(error)}, status=500)

    return web.json_response({
        "ok": True,
        "message": "Спасибо за заказ! С вами свяжется наш менеджер для обсуждения деталей)"
    })


async def api_products(request: web.Request):
    check_admin(request)
    return web.json_response({"ok": True, "products": load_products()})


async def api_update_price(request: web.Request):
    check_admin(request)
    product_id = int(request.match_info["product_id"])
    data = await request.json()
    price = float(data.get("pricePerKg"))

    products = load_products()
    for product in products:
        if int(product.get("id", 0)) == product_id:
            old_price = float(product.get("pricePerKg") or 0)
            product["pricePerKg"] = price
            add_price_history(product, old_price, price)
            save_products(products)
            return web.json_response({"ok": True, "product": product})

    return web.json_response({"ok": False, "error": "Товар не найден"}, status=404)


async def api_save_product(request: web.Request):
    check_admin(request)
    product_id = int(request.match_info["product_id"])
    data = await request.json()
    products = load_products()

    for product in products:
        if int(product.get("id", 0)) == product_id:
            old_price = float(product.get("pricePerKg") or 0)
            if "nameRu" in data:
                product.setdefault("name", {})["ru"] = data.pop("nameRu")
            if "nameEn" in data:
                product.setdefault("name", {})["en"] = data.pop("nameEn")
            if "catRu" in data:
                product.setdefault("cat", {})["ru"] = data.pop("catRu")
            if "catEn" in data:
                product.setdefault("cat", {})["en"] = data.pop("catEn")
            if "descRu" in data:
                product.setdefault("desc", {})["ru"] = data.pop("descRu")
            if "descEn" in data:
                product.setdefault("desc", {})["en"] = data.pop("descEn")
            product.update(data)
            add_price_history(product, old_price, float(product.get("pricePerKg") or 0))
            save_products(products)
            return web.json_response({"ok": True, "product": product})

    return web.json_response({"ok": False, "error": "Товар не найден"}, status=404)


async def api_create_product(request: web.Request):
    check_admin(request)
    data = await request.json()
    products = load_products()
    next_id = max([int(p.get("id", 0)) for p in products] or [0]) + 1
    product = {
        "id": next_id,
        "name": {"ru": data.get("nameRu") or "Новый товар", "en": data.get("nameEn") or data.get("nameRu") or "New product"},
        "cat": {"ru": data.get("catRu") or "Замороженные продукты", "en": data.get("catEn") or "Frozen products"},
        "desc": {"ru": data.get("descRu") or "", "en": data.get("descEn") or data.get("descRu") or ""},
        "pricePerKg": float(data.get("pricePerKg") or 0),
        "packKg": float(data.get("packKg") or 10),
        "img": data.get("img") or "",
        "tag": data.get("tag") or "картофель",
        "visible": bool(data.get("visible", True)),
        "sortOrder": len(products),
    }
    products.append(product)
    save_products(products)
    return web.json_response({"ok": True, "product": product})


async def api_delete_product(request: web.Request):
    check_admin(request)
    product_id = int(request.match_info["product_id"])
    products = [p for p in load_products() if int(p.get("id", 0)) != product_id]
    save_products(products)
    return web.json_response({"ok": True})


async def api_history(request: web.Request):
    check_admin(request)
    return web.json_response({"ok": True, "history": load_json(HISTORY_FILE, [])})


async def api_reorder_products(request: web.Request):
    check_admin(request)
    order = [int(item) for item in (await request.json()).get("ids", [])]
    products = load_products()
    positions = {product_id: index for index, product_id in enumerate(order)}
    for index, product in enumerate(products):
        product["sortOrder"] = positions.get(int(product.get("id", 0)), len(order) + index)
    products.sort(key=lambda product: product.get("sortOrder", 999999))
    save_products(products)
    return web.json_response({"ok": True, "products": products})


async def api_upload_image(request: web.Request):
    check_admin(request)
    reader = await request.multipart()
    field = await reader.next()
    if not field or field.name != "image" or not field.filename:
        return web.json_response({"ok": False, "error": "Файл не выбран"}, status=400)
    extension = Path(field.filename).suffix.lower()
    if extension not in {".jpg", ".jpeg", ".png", ".webp"}:
        return web.json_response({"ok": False, "error": "Допустимы JPG, PNG и WEBP"}, status=400)
    safe_stem = re.sub(r"[^a-zA-Z0-9_-]+", "-", Path(field.filename).stem).strip("-") or "product"
    filename = f"{safe_stem}-{int(datetime.now().timestamp())}{extension}"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    target = UPLOAD_DIR / filename
    size = 0
    with target.open("wb") as file:
        while chunk := await field.read_chunk():
            size += len(chunk)
            if size > 10 * 1024 * 1024:
                target.unlink(missing_ok=True)
                return web.json_response({"ok": False, "error": "Файл больше 10 МБ"}, status=413)
            file.write(chunk)
    return web.json_response({"ok": True, "path": f"assets/products/uploads/{filename}"})


async def api_notifications(request: web.Request):
    check_admin(request)
    if request.method == "GET":
        return web.json_response({"ok": True, "settings": load_json(SETTINGS_FILE, {"newOrders": True, "lowStock": True})})
    data = await request.json()
    settings = {"newOrders": bool(data.get("newOrders")), "lowStock": bool(data.get("lowStock"))}
    save_json(SETTINGS_FILE, settings)
    return web.json_response({"ok": True, "settings": settings})


async def api_test_notification(request: web.Request):
    check_admin(request)
    if not ORDER_CHAT_ID:
        return web.json_response({"ok": False, "error": "ORDER_CHAT_ID не указан"}, status=400)
    await bot.send_message(int(ORDER_CHAT_ID), "❄️ Тестовое уведомление ОптХолод\nУведомления из админки работают.")
    return web.json_response({"ok": True})


async def api_import_price(request: web.Request):
    check_admin(request)
    reader = await request.multipart()
    field = await reader.next()
    if not field or field.name != "price" or not field.filename or not field.filename.lower().endswith(".xls"):
        return web.json_response({"ok": False, "error": "Выберите файл XLS"}, status=400)
    temp_path = ADMIN_DIR / "price-import.xls"
    with temp_path.open("wb") as file:
        while chunk := await field.read_chunk(): file.write(chunk)
    try:
        result = import_price_xls(temp_path)
    except Exception as error:
        return web.json_response({"ok": False, "error": f"Не удалось прочитать прайс: {error}"}, status=400)
    return web.json_response({"ok": True, **result})


async def api_broadcast(request: web.Request):
    check_admin(request)
    text = str((await request.json()).get("text") or "").strip()
    if not text:
        return web.json_response({"ok": False, "error": "Введите текст предложения"}, status=400)
    subscribers = load_json(SUBSCRIBERS_FILE, [])
    sent = failed = 0
    keyboard = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text="❄️ Перейти в магазин", web_app=WebAppInfo(url=WEBAPP_URL))]])
    for subscriber in subscribers:
        if not subscriber.get("active", True): continue
        try:
            await bot.send_message(int(subscriber["id"]), f"❄️ Холодное предложение\n\n{text}", reply_markup=keyboard); sent += 1
        except Exception: failed += 1
    return web.json_response({"ok": True, "sent":sent, "failed":failed, "subscribers":len(subscribers)})


async def run_bot():
    await bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(
            text="❄️ Перейти в магазин",
            web_app=WebAppInfo(url=WEBAPP_URL),
        )
    )
    await dp.start_polling(bot)


async def run_web():
    app = web.Application(client_max_size=20 * 1024 * 1024)
    app.router.add_get("/", index)
    app.router.add_get("/admin", admin_index)
    app.router.add_get("/admin/", admin_index)
    app.router.add_post("/auth", auth)
    app.router.add_post("/order", order)

    app.router.add_get("/api/admin/products", api_products)
    app.router.add_post("/api/admin/products", api_create_product)
    app.router.add_post("/api/admin/products/{product_id}/price", api_update_price)
    app.router.add_post("/api/admin/products/reorder", api_reorder_products)
    app.router.add_post("/api/admin/products/{product_id}", api_save_product)
    app.router.add_delete("/api/admin/products/{product_id}", api_delete_product)
    app.router.add_post("/api/admin/upload", api_upload_image)
    app.router.add_get("/api/admin/history", api_history)
    app.router.add_get("/api/admin/notifications", api_notifications)
    app.router.add_post("/api/admin/notifications", api_notifications)
    app.router.add_post("/api/admin/notifications/test", api_test_notification)
    app.router.add_post("/api/admin/import-price", api_import_price)
    app.router.add_post("/api/admin/broadcast", api_broadcast)

    app.router.add_static("/assets/", WEB_DIR / "assets", show_index=False)
    app.router.add_static("/admin-static/", ADMIN_DIR, show_index=False)
    app.router.add_get("/style.css", lambda request: web.FileResponse(WEB_DIR / "style.css"))
    app.router.add_get("/app.js", lambda request: web.FileResponse(WEB_DIR / "app.js"))
    app.router.add_get("/products.json", lambda request: web.FileResponse(PRODUCTS_FILE))

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", PORT)
    await site.start()
    print(f"Web server started: http://127.0.0.1:{PORT}")


async def main():
    await run_web()
    await run_bot()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Бот выключен")
