import asyncio
import hmac
import json
import math
import os
import re
import shutil
import tempfile
import threading
import time
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

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


def configured_path(environment_name: str, default: Path) -> Path:
    path = Path(os.getenv(environment_name) or default)
    return path if path.is_absolute() else BASE_DIR / path


DATA_DIR = configured_path("DATA_DIR", BASE_DIR / "data")
BUNDLED_PRODUCTS_FILE = WEB_DIR / "products.json"
PRODUCTS_FILE = configured_path("PRODUCTS_FILE", BUNDLED_PRODUCTS_FILE)
HISTORY_FILE = DATA_DIR / "price_history.json"
SETTINGS_FILE = DATA_DIR / "settings.json"
SUBSCRIBERS_FILE = DATA_DIR / "subscribers.json"
ORDERS_FILE = DATA_DIR / "orders.json"
UPLOAD_DIR = configured_path("UPLOAD_DIR", WEB_DIR / "assets" / "products" / "uploads")

if PRODUCTS_FILE != BUNDLED_PRODUCTS_FILE and not PRODUCTS_FILE.exists():
    PRODUCTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(BUNDLED_PRODUCTS_FILE, PRODUCTS_FILE)

BOT_TOKEN = os.getenv("BOT_TOKEN")
WEBAPP_URL = os.getenv("WEBAPP_URL")
ORDER_CHAT_ID = os.getenv("ORDER_CHAT_ID") or os.getenv("ADMIN_CHAT_ID")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD") or ""
PORT = int(os.getenv("PORT", "8000"))
WEBAPP_PARTS = urlsplit(WEBAPP_URL or "")
WEBAPP_ORIGIN = f"{WEBAPP_PARTS.scheme}://{WEBAPP_PARTS.netloc}" if WEBAPP_PARTS.scheme and WEBAPP_PARTS.netloc else ""
ALLOWED_ORIGINS = {
    origin.strip().rstrip("/")
    for origin in os.getenv("ALLOWED_ORIGINS", WEBAPP_ORIGIN).split(",")
    if origin.strip()
}

if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN is missing in .env")
if not WEBAPP_URL:
    raise RuntimeError("WEBAPP_URL is missing in .env")
if len(ADMIN_PASSWORD) < 16 or ADMIN_PASSWORD == "admin123":
    raise RuntimeError("Set ADMIN_PASSWORD to at least 16 characters in .env")

bot = Bot(BOT_TOKEN)
dp = Dispatcher()
DATA_LOCK = threading.RLock()
ORDER_ATTEMPTS: dict[int, list[float]] = {}


def rub(value: Any) -> str:
    try:
        number = float(value or 0)
    except (TypeError, ValueError):
        number = 0
    if abs(number - round(number)) < 0.001:
        return f"{int(round(number)):,}".replace(",", " ") + " ₽"
    return f"{number:,.2f}".replace(",", " ").replace(".", ",") + " ₽"


def load_products() -> list[dict[str, Any]]:
    data = load_json(PRODUCTS_FILE, [])
    if isinstance(data, dict):
        data = data.get("products", [])
    return data if isinstance(data, list) else []


def save_products(products: list[dict[str, Any]]) -> None:
    save_json(PRODUCTS_FILE, products)


def load_json(path: Path, fallback: Any) -> Any:
    with DATA_LOCK:
        try:
            with path.open("r", encoding="utf-8") as file:
                return json.load(file)
        except FileNotFoundError:
            return fallback
        except (json.JSONDecodeError, OSError) as error:
            raise RuntimeError(f"Could not read data file: {path.name}") from error


def save_json(path: Path, data: Any) -> None:
    with DATA_LOCK:
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
        try:
            with temporary.open("w", encoding="utf-8", newline="\n") as file:
                json.dump(data, file, ensure_ascii=False, indent=2, allow_nan=False)
                file.write("\n")
                file.flush()
                os.fsync(file.fileno())
            os.replace(temporary, path)
        finally:
            temporary.unlink(missing_ok=True)


def add_price_history(product: dict[str, Any], old_price: float, new_price: float) -> None:
    if old_price == new_price:
        return
    with DATA_LOCK:
        history = load_json(HISTORY_FILE, [])
        history.insert(0, {
            "productId": product.get("id"), "productName": product_name(product),
            "oldPrice": old_price, "newPrice": new_price,
            "changedAt": datetime.now(timezone.utc).isoformat(),
        })
        save_json(HISTORY_FILE, history[:500])


def remember_subscriber(user: Any) -> None:
    with DATA_LOCK:
        subscribers = load_json(SUBSCRIBERS_FILE, [])
        user_id = int(getattr(user, "id", 0) or 0)
        if not user_id:
            return
        entry = next((item for item in subscribers if int(item.get("id", 0)) == user_id), None)
        data = {"id": user_id, "firstName": getattr(user, "first_name", "") or "", "username": getattr(user, "username", "") or ""}
        if entry:
            entry.update(data)
        else:
            data["active"] = True
            subscribers.append(data)
        save_json(SUBSCRIBERS_FILE, subscribers)


def set_subscriber_activity(user: Any, active: bool) -> None:
    remember_subscriber(user)
    with DATA_LOCK:
        subscribers = load_json(SUBSCRIBERS_FILE, [])
        user_id = int(getattr(user, "id", 0) or 0)
        for subscriber in subscribers:
            if int(subscriber.get("id", 0)) == user_id:
                subscriber["active"] = active
                break
        save_json(SUBSCRIBERS_FILE, subscribers)


def normalized_product_name(value: str) -> str:
    return re.sub(r"[^а-яёa-z0-9]+", "", str(value).lower())


def infer_country(name: str) -> str:
    value = name.lower()
    if "китай" in value: return "Китай"
    if any(word in value for word in ("россия", "русбери", "дикорос", "карел", "волог", "тамбов")): return "Россия"
    return "Европа"


def infer_tag(name: str, section: str) -> str:
    value = name.lower()
    if any(word in value for word in ("донат", "donut", "тесто")): return "выпечка"
    if any(word in value for word in ("гриб", "шампин", "опят", "лисич", "маслят")): return "грибы"
    if any(word in value for word in ("фри", "картоф", "дольк", "хэшбраун")): return "картофель"
    if any(word in value for word in ("ягод", "клубник", "малин", "вишн", "череш", "смород", "брусник", "клюкв", "ежевик", "облепих", "черник", "калин")): return "ягоды"
    if any(word in value for word in ("фрукт", "ананас", "манго", "персик", "киви", "слив", "яблок")): return "фрукты"
    if "смес" in value: return "смеси"
    if any(word in value for word in ("моцарел", "сыр", "халапеньо")): return "снеки"
    return "овощи"


def placeholder_for(tag: str) -> str:
    return {"картофель":"assets/products/fries-10mm.webp", "ягоды":"assets/p1.jpg", "овощи":"assets/p2.jpg", "грибы":"assets/p4.jpg", "фрукты":"assets/p5.jpg", "смеси":"assets/p6.jpg"}.get(tag, "assets/p3.jpg")


def import_price_xls(path: Path) -> dict[str, Any]:
    with DATA_LOCK:
        return _import_price_xls(path)


def _import_price_xls(path: Path) -> dict[str, Any]:
    book = xlrd.open_workbook(str(path))
    products = load_products()
    history = load_json(HISTORY_FILE, [])
    by_name = {normalized_product_name(product_name(p)): p for p in products}
    next_id = max([int(product.get("id", 0)) for product in products] or [0]) + 1
    added = updated = unavailable = 0
    section = "Замороженные продукты"
    price_unit = "кг"
    for sheet in book.sheets():
        for row_index in range(sheet.nrows):
            name = str(sheet.cell_value(row_index, 0) or "").strip()
            if not name: continue
            price = sheet.cell_value(row_index, 3) if sheet.ncols > 3 else ""
            pack = sheet.cell_value(row_index, 2) if sheet.ncols > 2 else ""
            has_price = isinstance(price, (int, float)) and price > 0
            is_product_without_price = isinstance(pack, (int, float)) and pack > 0
            if not has_price and not is_product_without_price:
                if len(name) > 5 and not any(word in name.lower() for word in ("прайс", "оптхолод")):
                    section = re.sub(r"\s+", " ", name).strip()
                    price_header = str(price or "").lower()
                    price_unit = "шт" if "шт" in price_header else "упак" if "упак" in price_header else "кг"
                continue
            price_value = float(price) if has_price else 0.0
            if not has_price:
                unavailable += 1
            tag = infer_tag(name, section)
            existing = by_name.get(normalized_product_name(name))
            if existing:
                old_price = float(existing.get("pricePerKg") or 0)
                existing.update({"pricePerKg":price_value, "packKg":float(pack or existing.get("packKg") or 10), "priceUnit":price_unit, "country":infer_country(name), "tag":tag, "visible":has_price})
                existing.setdefault("name", {})["ru"] = name
                existing.setdefault("cat", {})["ru"] = section
                if old_price != price_value:
                    history.insert(0, {
                        "productId": existing.get("id"), "productName": name,
                        "oldPrice": old_price, "newPrice": price_value,
                        "changedAt": datetime.now(timezone.utc).isoformat(),
                    })
                updated += 1
            else:
                product = {"id":next_id,"name":{"ru":name,"en":name},"cat":{"ru":section,"en":section},"desc":{"ru":"","en":""},"pricePerKg":price_value,"packKg":float(pack or 10),"priceUnit":price_unit,"img":placeholder_for(tag),"tag":tag,"country":infer_country(name),"visible":has_price,"sortOrder":len(products)}
                products.append(product); by_name[normalized_product_name(name)] = product; next_id += 1; added += 1
    for index, product in enumerate(products):
        product.setdefault("country", infer_country(product_name(product)))
        product.setdefault("visible", True)
        product.setdefault("sortOrder", index)
    save_products(products)
    save_json(HISTORY_FILE, history[:500])
    return {"added":added,"updated":updated,"unavailable":unavailable,"total":len(products)}


def check_admin(request: web.Request) -> None:
    token = request.headers.get("X-Admin-Password", "")
    if not token or not hmac.compare_digest(token, ADMIN_PASSWORD):
        raise web.HTTPUnauthorized(text="Неверный пароль админки")


def product_name(product: dict[str, Any]) -> str:
    name = product.get("name", "")
    if isinstance(name, dict):
        return name.get("ru") or name.get("en") or "Товар"
    return str(name or "Товар")


def positive_number(value: Any, field: str, *, minimum: float = 0.01, maximum: float = 1_000_000) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"Некорректное поле: {field}") from None
    if not math.isfinite(number) or number < minimum or number > maximum:
        raise ValueError(f"Некорректное поле: {field}")
    return round(number, 2)


def clean_text(value: Any, field: str, maximum: int) -> str:
    text = str(value or "").strip()
    if len(text) > maximum:
        raise ValueError(f"Поле {field} слишком длинное")
    return text


def clean_image_path(value: Any) -> str:
    path = str(value or "").strip().replace("\\", "/").lstrip("/")
    if not path:
        return ""
    if not path.startswith("assets/") or ".." in Path(path).parts or ":" in path:
        raise ValueError("Некорректный путь изображения")
    return path


def image_matches_extension(path: Path, extension: str) -> bool:
    try:
        with path.open("rb") as file:
            header = file.read(16)
    except OSError:
        return False
    if extension in {".jpg", ".jpeg"}:
        return header.startswith(b"\xff\xd8\xff")
    if extension == ".png":
        return header.startswith(b"\x89PNG\r\n\x1a\n")
    if extension == ".webp":
        return header.startswith(b"RIFF") and header[8:12] == b"WEBP"
    return False


def update_product_fields(product: dict[str, Any], data: dict[str, Any]) -> None:
    localized_fields = {
        "nameRu": ("name", "ru", 300), "nameEn": ("name", "en", 300),
        "catRu": ("cat", "ru", 300), "catEn": ("cat", "en", 300),
        "descRu": ("desc", "ru", 3000), "descEn": ("desc", "en", 3000),
    }
    for request_key, (product_key, language, maximum) in localized_fields.items():
        if request_key in data:
            product.setdefault(product_key, {})[language] = clean_text(data[request_key], request_key, maximum)
    if "pricePerKg" in data:
        product["pricePerKg"] = positive_number(data["pricePerKg"], "pricePerKg")
    if "packKg" in data:
        product["packKg"] = positive_number(data["packKg"], "packKg", maximum=100_000)
    if "priceUnit" in data:
        price_unit = clean_text(data["priceUnit"], "priceUnit", 10)
        if price_unit not in {"кг", "шт", "упак"}:
            raise ValueError("Некорректная единица цены")
        product["priceUnit"] = price_unit
    if "img" in data:
        product["img"] = clean_image_path(data["img"])
    if "visible" in data:
        if not isinstance(data["visible"], bool):
            raise ValueError("Некорректное поле: visible")
        product["visible"] = data["visible"]
    if "tag" in data:
        product["tag"] = clean_text(data["tag"], "tag", 80).lower() or "овощи"
    if "country" in data:
        country = clean_text(data["country"], "country", 30)
        if country not in {"Европа", "Китай", "Россия"}:
            raise ValueError("Некорректная страна")
        product["country"] = country


def normalize_order(order_data: dict[str, Any]) -> dict[str, Any]:
    raw_items = order_data.get("items")
    if not isinstance(raw_items, list) or not raw_items or len(raw_items) > 100:
        raise ValueError("Корзина пуста или содержит слишком много товаров")
    catalog = {int(product.get("id", 0)): product for product in load_products()}
    items: list[dict[str, Any]] = []
    for raw_item in raw_items:
        if not isinstance(raw_item, dict):
            raise ValueError("Некорректный товар в заказе")
        try:
            product_id = int(raw_item.get("id"))
            quantity = int(raw_item.get("qty", 1))
        except (TypeError, ValueError):
            raise ValueError("Некорректный товар в заказе") from None
        product = catalog.get(product_id)
        if not product or product.get("visible", True) is False:
            raise ValueError(f"Товар #{product_id} недоступен")
        if quantity < 1 or quantity > 100:
            raise ValueError("Некорректное количество товара")
        pack_amount = positive_number(product.get("packKg") or 10, "packKg", maximum=100_000)
        amount = positive_number(raw_item.get("amount") or raw_item.get("weight") or pack_amount, "amount", minimum=pack_amount, maximum=100_000)
        price_unit = product.get("priceUnit") if product.get("priceUnit") in {"кг", "шт", "упак"} else "кг"
        if price_unit != "кг" and not amount.is_integer():
            raise ValueError("Количество штук или упаковок должно быть целым")
        price = positive_number(product.get("pricePerKg"), "pricePerKg")
        item_total = round(price * amount * quantity, 2)
        items.append({
            "id": product_id,
            "name": product_name(product),
            "pricePerKg": price,
            "amount": amount,
            "weight": amount,
            "unit": price_unit,
            "qty": quantity,
            "total": item_total,
        })
    request_id = clean_text(order_data.get("requestId"), "requestId", 80)
    if request_id and not re.fullmatch(r"[A-Za-z0-9_-]{8,80}", request_id):
        raise ValueError("Некорректный идентификатор заказа")
    return {
        "requestId": request_id or uuid.uuid4().hex,
        "items": items,
        "total": round(sum(item["total"] for item in items), 2),
        "vatIncluded": True,
    }


def parse_telegram_init_data(init_data: Any):
    value = str(init_data or "")
    if not value:
        raise ValueError("Telegram initData is required")
    parsed = safe_parse_webapp_init_data(BOT_TOKEN, value)
    auth_date = parsed.auth_date
    if auth_date.tzinfo is None:
        auth_date = auth_date.replace(tzinfo=timezone.utc)
    age = datetime.now(timezone.utc) - auth_date
    if age > timedelta(hours=24) or age < -timedelta(minutes=5):
        raise ValueError("Telegram initData has expired")
    if not parsed.user:
        raise ValueError("Telegram user is missing")
    return parsed


def order_buyer(user: Any) -> dict[str, Any]:
    return {
        "id": int(getattr(user, "id", 0) or 0),
        "firstName": clean_text(getattr(user, "first_name", ""), "firstName", 100),
        "username": clean_text(getattr(user, "username", ""), "username", 100),
    }


def allow_order_attempt(user_id: int, *, limit: int = 8, window_seconds: int = 60) -> bool:
    now = time.monotonic()
    with DATA_LOCK:
        recent = [attempt for attempt in ORDER_ATTEMPTS.get(user_id, []) if now - attempt < window_seconds]
        if len(recent) >= limit:
            ORDER_ATTEMPTS[user_id] = recent
            return False
        recent.append(now)
        ORDER_ATTEMPTS[user_id] = recent
        return True


def store_order(order: dict[str, Any], user: Any) -> tuple[dict[str, Any], bool]:
    with DATA_LOCK:
        orders = load_json(ORDERS_FILE, [])
        existing = next((item for item in orders if item.get("requestId") == order["requestId"]), None)
        if existing:
            if int(existing.get("buyer", {}).get("id", 0)) != int(getattr(user, "id", 0) or 0):
                raise ValueError("Идентификатор заказа уже использован")
            return existing, False
        now = datetime.now(timezone.utc)
        record = {
            **order,
            "orderId": f"OH-{now:%Y%m%d}-{uuid.uuid4().hex[:6].upper()}",
            "buyer": order_buyer(user),
            "status": "new",
            "notificationStatus": "pending",
            "createdAt": now.isoformat(),
        }
        orders.insert(0, record)
        save_json(ORDERS_FILE, orders)
        return record, True


def set_order_notification_status(request_id: str, status: str) -> None:
    with DATA_LOCK:
        orders = load_json(ORDERS_FILE, [])
        for order in orders:
            if order.get("requestId") == request_id:
                order["notificationStatus"] = status
                break
        save_json(ORDERS_FILE, orders)


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
        f"Номер: {order.get('orderId') or 'формируется'}",
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
            amount = item.get("amount") or item.get("weight") or 0
            unit = item.get("unit") or "кг"
            qty = item.get("qty") or 1
            price = item.get("pricePerKg") or 0
            item_total = item.get("total") or 0
            lines.extend([
                f"{index}. {name}",
                f"   {'Вес' if unit == 'кг' else 'Количество'}: {amount} {unit} × {qty} кор.",
                f"   Цена: {rub(price)}/{unit} с НДС",
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


@dp.message(Command("unsubscribe"))
async def unsubscribe(message: Message):
    set_subscriber_activity(message.from_user, False)
    await message.answer("Рассылка отключена. Заказывать и писать менеджеру по-прежнему можно.")


@dp.message(Command("subscribe"))
async def subscribe(message: Message):
    set_subscriber_activity(message.from_user, True)
    await message.answer("Рассылка «Холодные предложения» включена.")


@dp.message(F.web_app_data)
async def handle_web_app_data(message: Message):
    try:
        data = json.loads(message.web_app_data.data)
    except Exception:
        await message.answer("Не удалось прочитать заказ из Mini App.")
        return

    if data.get("type") == "order":
        try:
            normalized = normalize_order(data)
            stored_order, created = store_order(normalized, message.from_user)
            if created:
                settings = load_json(SETTINGS_FILE, {"newOrders": True})
                if settings.get("newOrders", True):
                    try:
                        await send_order_to_admin(stored_order, message.from_user)
                        set_order_notification_status(stored_order["requestId"], "sent")
                    except Exception:
                        set_order_notification_status(stored_order["requestId"], "failed")
                else:
                    set_order_notification_status(stored_order["requestId"], "disabled")
            await message.answer("Спасибо за заказ! С вами свяжется наш менеджер для обсуждения деталей)")
        except ValueError as error:
            await message.answer(f"Не удалось оформить заказ: {error}")
        except Exception:
            await message.answer("Не удалось отправить заказ. Попробуйте ещё раз или напишите менеджеру.")


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


async def health(request: web.Request):
    return web.json_response({"ok": True})


async def admin_style(request: web.Request):
    return web.FileResponse(ADMIN_DIR / "style.css")


async def admin_script(request: web.Request):
    return web.FileResponse(ADMIN_DIR / "admin.js")


async def storefront_products(request: web.Request):
    return web.FileResponse(PRODUCTS_FILE)


@web.middleware
async def response_headers(request: web.Request, handler):
    response = web.Response(status=204) if request.method == "OPTIONS" else await handler(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    if request.path.startswith("/api/") or request.path in {"/", "/admin", "/admin/", "/products.json"}:
        response.headers["Cache-Control"] = "no-store"
    origin = request.headers.get("Origin", "").rstrip("/")
    if origin and origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Admin-Password"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS"
        response.headers["Vary"] = "Origin"
    return response


async def auth(request: web.Request):
    data = await request.json()
    init_data = data.get("initData")

    try:
        parsed = parse_telegram_init_data(init_data)
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

    init_data = data.get("initData")
    try:
        parsed = parse_telegram_init_data(init_data)
        parsed_user = parsed.user
    except Exception:
        return web.json_response({"ok": False, "error": "Invalid or expired Telegram initData"}, status=401)
    if not allow_order_attempt(int(parsed_user.id)):
        return web.json_response({"ok": False, "error": "Слишком много попыток. Подождите минуту."}, status=429)

    try:
        normalized = normalize_order(data)
        stored_order, created = store_order(normalized, parsed_user)
        if created:
            settings = load_json(SETTINGS_FILE, {"newOrders": True})
            if settings.get("newOrders", True):
                try:
                    await send_order_to_admin(stored_order, parsed_user)
                    set_order_notification_status(stored_order["requestId"], "sent")
                except Exception:
                    set_order_notification_status(stored_order["requestId"], "failed")
            else:
                set_order_notification_status(stored_order["requestId"], "disabled")
    except ValueError as error:
        return web.json_response({"ok": False, "error": str(error)}, status=400)
    except Exception:
        return web.json_response({"ok": False, "error": "Не удалось сохранить заказ"}, status=500)

    return web.json_response({
        "ok": True,
        "orderId": stored_order["orderId"],
        "message": "Спасибо за заказ! С вами свяжется наш менеджер для обсуждения деталей)"
    })


async def api_products(request: web.Request):
    check_admin(request)
    return web.json_response({"ok": True, "products": load_products()})


async def api_update_price(request: web.Request):
    check_admin(request)
    product_id = int(request.match_info["product_id"])
    data = await request.json()
    try:
        price = positive_number(data.get("pricePerKg"), "pricePerKg")
    except ValueError as error:
        return web.json_response({"ok": False, "error": str(error)}, status=400)

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
            try:
                update_product_fields(product, data)
            except ValueError as error:
                return web.json_response({"ok": False, "error": str(error)}, status=400)
            add_price_history(product, old_price, float(product.get("pricePerKg") or 0))
            save_products(products)
            return web.json_response({"ok": True, "product": product})

    return web.json_response({"ok": False, "error": "Товар не найден"}, status=404)


async def api_create_product(request: web.Request):
    check_admin(request)
    data = await request.json()
    products = load_products()
    next_id = max([int(p.get("id", 0)) for p in products] or [0]) + 1
    product: dict[str, Any] = {
        "id": next_id,
        "name": {"ru": "Новый товар", "en": "New product"},
        "cat": {"ru": "Замороженные продукты", "en": "Frozen products"},
        "desc": {"ru": "", "en": ""},
        "pricePerKg": 0,
        "packKg": 10,
        "priceUnit": "кг",
        "img": "",
        "tag": "овощи",
        "visible": True,
        "sortOrder": len(products),
    }
    try:
        update_product_fields(product, data)
        if not product["name"]["ru"] or not product["pricePerKg"]:
            raise ValueError("Укажите название и цену")
        product.setdefault("country", infer_country(product["name"]["ru"]))
    except ValueError as error:
        return web.json_response({"ok": False, "error": str(error)}, status=400)
    products.append(product)
    save_products(products)
    return web.json_response({"ok": True, "product": product})


async def api_delete_product(request: web.Request):
    check_admin(request)
    product_id = int(request.match_info["product_id"])
    original = load_products()
    products = [p for p in original if int(p.get("id", 0)) != product_id]
    if len(products) == len(original):
        return web.json_response({"ok": False, "error": "Товар не найден"}, status=404)
    save_products(products)
    return web.json_response({"ok": True})


async def api_history(request: web.Request):
    check_admin(request)
    return web.json_response({"ok": True, "history": load_json(HISTORY_FILE, [])})


async def api_orders(request: web.Request):
    check_admin(request)
    return web.json_response({"ok": True, "orders": load_json(ORDERS_FILE, [])})


async def api_reorder_products(request: web.Request):
    check_admin(request)
    try:
        raw_order = (await request.json()).get("ids", [])
        order = [int(item) for item in raw_order]
    except (AttributeError, TypeError, ValueError):
        return web.json_response({"ok": False, "error": "Некорректный порядок товаров"}, status=400)
    with DATA_LOCK:
        products = load_products()
        product_ids = [int(product.get("id", 0)) for product in products]
        if len(order) != len(set(order)) or set(order) != set(product_ids):
            return web.json_response({"ok": False, "error": "Список товаров изменился. Обновите страницу."}, status=409)
        positions = {product_id: index for index, product_id in enumerate(order)}
        for product in products:
            product["sortOrder"] = positions[int(product.get("id", 0))]
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
    filename = f"{safe_stem}-{uuid.uuid4().hex[:12]}{extension}"
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
    if size == 0 or not image_matches_extension(target, extension):
        target.unlink(missing_ok=True)
        return web.json_response({"ok": False, "error": "Содержимое файла не соответствует формату изображения"}, status=400)
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
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    temp_file = tempfile.NamedTemporaryFile(prefix="price-import-", suffix=".xls", dir=DATA_DIR, delete=False)
    temp_path = Path(temp_file.name)
    try:
        size = 0
        while chunk := await field.read_chunk():
            size += len(chunk)
            if size > 20 * 1024 * 1024:
                return web.json_response({"ok": False, "error": "Прайс больше 20 МБ"}, status=413)
            temp_file.write(chunk)
        temp_file.flush()
        temp_file.close()
        with temp_path.open("rb") as file:
            signature = file.read(8)
        if size < 8 or signature != b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1":
            return web.json_response({"ok": False, "error": "Файл не является таблицей XLS"}, status=400)
        result = await asyncio.to_thread(import_price_xls, temp_path)
    except Exception as error:
        return web.json_response({"ok": False, "error": f"Не удалось прочитать прайс: {error}"}, status=400)
    finally:
        temp_file.close()
        temp_path.unlink(missing_ok=True)
    return web.json_response({"ok": True, **result})


async def api_broadcast(request: web.Request):
    check_admin(request)
    try:
        text = clean_text((await request.json()).get("text"), "text", 3500)
    except (AttributeError, ValueError) as error:
        return web.json_response({"ok": False, "error": str(error)}, status=400)
    if not text:
        return web.json_response({"ok": False, "error": "Введите текст предложения"}, status=400)
    subscribers = load_json(SUBSCRIBERS_FILE, [])
    keyboard = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text="❄️ Перейти в магазин", web_app=WebAppInfo(url=WEBAPP_URL))]])
    active_subscribers = [subscriber for subscriber in subscribers if subscriber.get("active", True)]
    semaphore = asyncio.Semaphore(8)

    async def send_offer(subscriber: dict[str, Any]) -> bool:
        try:
            async with semaphore:
                await bot.send_message(int(subscriber["id"]), f"❄️ Холодное предложение\n\n{text}\n\nОтключить рассылку: /unsubscribe", reply_markup=keyboard)
            return True
        except Exception:
            return False

    results = await asyncio.gather(*(send_offer(subscriber) for subscriber in active_subscribers))
    sent = sum(results)
    failed = len(results) - sent
    return web.json_response({"ok": True, "sent": sent, "failed": failed, "subscribers": len(active_subscribers)})


async def run_bot():
    await bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(
            text="❄️ Перейти в магазин",
            web_app=WebAppInfo(url=WEBAPP_URL),
        )
    )
    await dp.start_polling(bot)


def create_web_app() -> web.Application:
    app = web.Application(client_max_size=20 * 1024 * 1024, middlewares=[response_headers])
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    app.router.add_get("/", index)
    app.router.add_get("/health", health)
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
    app.router.add_get("/api/admin/orders", api_orders)
    app.router.add_get("/api/admin/notifications", api_notifications)
    app.router.add_post("/api/admin/notifications", api_notifications)
    app.router.add_post("/api/admin/notifications/test", api_test_notification)
    app.router.add_post("/api/admin/import-price", api_import_price)
    app.router.add_post("/api/admin/broadcast", api_broadcast)

    app.router.add_static("/assets/products/uploads/", UPLOAD_DIR, show_index=False)
    app.router.add_static("/assets/", WEB_DIR / "assets", show_index=False)
    app.router.add_get("/admin-static/style.css", admin_style)
    app.router.add_get("/admin-static/admin.js", admin_script)
    app.router.add_get("/products.json", storefront_products)

    return app


async def run_web():
    app = create_web_app()

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
