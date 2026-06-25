import os
import asyncio
from dotenv import load_dotenv

from aiohttp import web
from aiogram import Bot, Dispatcher
from aiogram.filters import CommandStart
from aiogram.types import (
    Message,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo,
    MenuButtonWebApp,
)
from aiogram.utils.web_app import safe_parse_webapp_init_data

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
WEBAPP_URL = os.getenv("WEBAPP_URL")

if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN is missing in .env")
if not WEBAPP_URL:
    raise RuntimeError("WEBAPP_URL is missing in .env")

bot = Bot(BOT_TOKEN)
dp = Dispatcher()


@dp.message(CommandStart())
async def start(message: Message):
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🛍 Магазин",
                    web_app=WebAppInfo(url=WEBAPP_URL),
                )
            ]
        ]
    )
    await message.answer("Открой Mini App:", reply_markup=kb)


async def index(request: web.Request):
    return web.FileResponse("./web/index.html")


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


async def run_bot():
    await bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(
            text="🛍 Магазин",
            web_app=WebAppInfo(url=WEBAPP_URL),
        )
    )
    await dp.start_polling(bot)


async def run_web():
    app = web.Application()
    app.router.add_get("/", index)
    app.router.add_post("/auth", auth)

    runner = web.AppRunner(app)
    await runner.setup()

    site = web.TCPSite(runner, "0.0.0.0", 8000)
    await site.start()


async def main():
    await run_web()
    await run_bot()


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('Бот выключен')
