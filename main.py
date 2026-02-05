from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import (
    InlineKeyboardMarkup, InlineKeyboardButton,
    LabeledPrice, PreCheckoutQuery, Message,
    ReplyKeyboardMarkup, KeyboardButton, FSInputFile
)
from aiogram.enums import ParseMode
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
import asyncio
import logging
from datetime import datetime, timedelta
import os

from config import (
    BOT_TOKEN, MESSAGES, SUBSCRIPTION_PRICES, SUBSCRIPTION_STARS,
    SUBSCRIPTION_DAYS, APP_URL, FEEDBACK_URL, PAYMENT_PROVIDER_TOKEN, ADMIN_IDS
)
from database import (
    init_db, create_user, get_user, has_active_subscription,
    get_subscription_info, add_subscription, add_payment,
    get_user_id_by_telegram_id,
    create_promo_code, validate_promo_code, use_promo_code,
    has_used_promo_code, list_all_promo_codes, init_promo_codes_table,
    get_users_count, get_active_subs_count
)

logging.basicConfig(level=logging.INFO)

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# States
class PromoState(StatesGroup):
    waiting_for_code = State()

class FeedbackState(StatesGroup):
    waiting_for_feedback = State()

# Persistent reply keyboard (always visible)
def get_reply_keyboard():
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="/start")]
        ],
        resize_keyboard=True,
        persistent=True
    )

def get_main_keyboard():
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="💎 Купить подписку", callback_data="subscribe")],
        [InlineKeyboardButton(text="👤 Мой профиль", callback_data="profile")],
        [InlineKeyboardButton(text="🎟 Ввести промокод", callback_data="enter_promo")],
        [InlineKeyboardButton(text="🚀 Доступ к приложению", callback_data="access_app")],
        [InlineKeyboardButton(text="💡 Предложить доработку", callback_data="feedback")],
        [InlineKeyboardButton(text="❓ Помощь", url=f"tg://user?id={ADMIN_IDS[0]}" if ADMIN_IDS else "https://t.me/telegram")],
    ])

def get_subscription_plans_keyboard():
    keyboard = []
    prices = SUBSCRIPTION_PRICES
    days = SUBSCRIPTION_DAYS
    
    for day in days:
        label = f"📅 {day} дней"
        keyboard.append([InlineKeyboardButton(text=label, callback_data=f"select_plan_{day}")])
    
    keyboard.append([InlineKeyboardButton(text="« Назад", callback_data="back_main")])
    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def get_currency_keyboard(days):
    # Find price index
    try:
        idx = SUBSCRIPTION_DAYS.index(days)
        rub_price = SUBSCRIPTION_PRICES[idx]
        star_price = SUBSCRIPTION_STARS[idx]
    except ValueError:
        return None

    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=f"🇷🇺 Рубли ({rub_price}₽)", callback_data=f"buy_rub_{days}_{rub_price}")],
        [InlineKeyboardButton(text=f"⭐️ Telegram Stars ({star_price} XTR)", callback_data=f"buy_star_{days}_{star_price}")],
        [InlineKeyboardButton(text="« Назад", callback_data="subscribe")]
    ])

def get_back_keyboard():
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="« Назад", callback_data="back_main")]
    ])

def get_app_keyboard():
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🚀 Открыть приложение", url=APP_URL)],
        [InlineKeyboardButton(text="« Назад", callback_data="back_main")]
    ])

@dp.message(Command("start"))
async def cmd_start(message: Message, state: FSMContext):
    await state.clear()
    user = message.from_user
    create_user(user.id, user.username or "", user.full_name or "")

    # Send photo with main menu
    # Using FSInputFile to read from local disk
    photo = FSInputFile("menu_image.jpg")
    await message.answer_photo(
        photo=photo,
        caption=MESSAGES["welcome"],
        reply_markup=get_main_keyboard(),
        parse_mode=ParseMode.HTML
    )

@dp.callback_query(F.data == "back_main")
async def back_main(callback: types.CallbackQuery, state: FSMContext):
    await state.clear()
    
    # Text messages can't be converted to photos easily via edit
    # So we delete and resend
    try:
        await callback.message.delete()
    except:
        pass

    photo = FSInputFile("menu_image.jpg")
    await callback.message.answer_photo(
        photo=photo,
        caption=MESSAGES["welcome"],
        reply_markup=get_main_keyboard(),
        parse_mode=ParseMode.HTML
    )
    await callback.answer()

@dp.callback_query(F.data == "profile")
async def show_profile(callback: types.CallbackQuery):
    info = get_subscription_info(callback.from_user.id)
    
    if info:
        text = MESSAGES["subscription_active"].format(**info)
    else:
        text = MESSAGES["no_subscription"]
    
    # We can edit the caption of the photo if we are coming from main menu
    # Or send a new text message if we want to "hide" the photo.
    # User wanted "old message disappears".
    # Best practice: Delete photo message, send new text message.
    await callback.message.delete()
    await callback.message.answer(text, reply_markup=get_back_keyboard())
    await callback.answer()

@dp.callback_query(F.data == "subscribe")
async def show_subscription_plans(callback: types.CallbackQuery):
    plans_text = "💎 <b>Выберите длительность подписки:</b>\n\n"
    
    for rub, stars, day in zip(SUBSCRIPTION_PRICES, SUBSCRIPTION_STARS, SUBSCRIPTION_DAYS):
        if day == 7:
            label = f"🧪 <b>7 дней</b>"
        elif day == 30:
            label = f"📅 <b>1 месяц</b>"
        elif day == 90:
            label = f"⭐ <b>3 месяца</b> (Выгодно)"
        elif day == 180:
            label = f"💎 <b>6 месяцев</b> (Super)"
        else:
            label = f"• {day} дней"
            
        plans_text += f"{label}\n💳 <b>{rub} ₽</b>   <i>(⭐️ {stars} Stars)</i>\n\n"
    
    try:
        await callback.message.delete()
    except:
        pass
        
    await callback.message.answer(plans_text, reply_markup=get_subscription_plans_keyboard(), parse_mode=ParseMode.HTML)
    await callback.answer()

@dp.callback_query(F.data.startswith("select_plan_"))
async def select_plan(callback: types.CallbackQuery):
    days = int(callback.data.split("_")[2])
    
    text = f"💳 <b>Выберите способ оплаты для {days} дней:</b>"
    
    kb = get_currency_keyboard(days)
    if not kb:
        await callback.answer("Ошибка тарифа", show_alert=True)
        return

    await callback.message.edit_text(text, reply_markup=kb, parse_mode=ParseMode.HTML)
    await callback.answer()


@dp.callback_query(F.data.startswith("buy_rub_"))
async def process_buy_rub(callback: types.CallbackQuery):
    _, _, days, price = callback.data.split("_")
    days = int(days)
    price = int(price)
    
    prices = [LabeledPrice(label=f"Подписка {days} дней", amount=price * 100)]
    
    await callback.message.delete()
    
    await bot.send_invoice(
        chat_id=callback.from_user.id,
        title=f"Подписка на {days} дней",
        description=f"Доступ к приложению на {days} дней",
        payload=f"sub_{days}_{callback.from_user.id}_{int(asyncio.get_event_loop().time())}_rub",
        provider_token=PAYMENT_PROVIDER_TOKEN,
        currency="RUB",
        prices=prices,
        start_parameter="subscription"
    )
    await callback.answer()

@dp.callback_query(F.data.startswith("buy_star_"))
async def process_buy_star(callback: types.CallbackQuery):
    _, _, days, price = callback.data.split("_")
    days = int(days)
    price = int(price)
    
    # For Stars: amount is in XTR (integer), currency is XTR
    prices = [LabeledPrice(label=f"Подписка {days} дней", amount=price)]
    
    await callback.message.delete()
    
    await bot.send_invoice(
        chat_id=callback.from_user.id,
        title=f"Подписка на {days} дней",
        description=f"Доступ к приложению на {days} дней",
        payload=f"sub_{days}_{callback.from_user.id}_{int(asyncio.get_event_loop().time())}_star",
        provider_token="", # Stars don't use provider token
        currency="XTR",
        prices=prices,
        start_parameter="subscription"
    )
    await callback.answer()

@dp.pre_checkout_query()
async def process_pre_checkout(query: PreCheckoutQuery):
    await bot.answer_pre_checkout_query(query.id, ok=True)

@dp.message(F.successful_payment)
async def process_successful_payment(message: Message):
    payment = message.successful_payment
    payload = payment.invoice_payload
    
    parts = payload.split("_")
    days = int(parts[1])
    
    # Calculate amount based on currency
    if payment.currency == "XTR":
        amount = payment.total_amount # Stars are atomic, no cents
        currency_label = "Stars"
    else:
        amount = payment.total_amount // 100
        currency_label = "₽"
    
    user_db_id = get_user_id_by_telegram_id(message.from_user.id)
    if user_db_id:
        add_payment(user_db_id, amount, days, payload)
        new_expiry = add_subscription(message.from_user.id, days)
        
        await message.answer(
            f"✅ Оплата успешна ({amount} {currency_label})!\n\n"
            f"📅 Подписка активирована до: {new_expiry.strftime('%d.%m.%Y')}\n\n"
            f"Теперь вы можете получить доступ к приложению!",
            reply_markup=get_app_keyboard()
        )

@dp.callback_query(F.data == "access_app")
async def access_app(callback: types.CallbackQuery):
    if has_active_subscription(callback.from_user.id):
        await callback.message.edit_text(
            "✅ У вас есть активная подписка!\n\n"
            "Нажмите кнопку ниже, чтобы открыть приложение:",
            reply_markup=get_app_keyboard()
        )
    else:
        await callback.message.edit_text(
            MESSAGES["no_subscription"] + "\n\nНажмите «Купить подписку», чтобы получить доступ.",
            reply_markup=get_main_keyboard()
        )
    await callback.answer()

@dp.callback_query(F.data == "feedback")
async def show_feedback(callback: types.CallbackQuery):
    """Кнопка 'Предложить доработку' - открывает сайт с формой обратной связи"""
    feedback_text = """
💡 <b>Предложить доработку</b>

Откройте форму обратной связи на нашем сайте, чтобы:
• Предложить новую функцию
• Сообщить о проблеме
• Поделиться идеей улучшения

Ваше мнение важно для нас! 🚀
"""
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📝 Открыть форму", url=FEEDBACK_URL)],
        [InlineKeyboardButton(text="« Назад", callback_data="back_main")]
    ])
    
    await callback.message.edit_text(feedback_text, reply_markup=keyboard, parse_mode=ParseMode.HTML)
    await callback.answer()

@dp.callback_query(F.data == "help")
async def show_help(callback: types.CallbackQuery):
    """Кнопка 'Помощь' - предлагает написать админу в личку"""
    # Получаем первого админа из списка
    admin_id = ADMIN_IDS[0] if ADMIN_IDS else None
    
    if admin_id:
        help_text = f"""
❓ <b>Помощь</b>

<b>Как получить доступ к приложению?</b>
1. Нажмите «Купить подписку»
2. Выберите удобный тариф
3. Оплатите
4. После оплаты нажмите «Доступ к приложению»

<b>У меня есть промокод:</b>
Нажмите кнопку «Ввести промокод» в главном меню

<b>Нужна помощь?</b>
Напишите администратору в личные сообщения:
"""
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="💬 Написать админу", url=f"tg://user?id={admin_id}")],
            [InlineKeyboardButton(text="« Назад", callback_data="back_main")]
        ])
    else:
        help_text = """
❓ <b>Помощь</b>

<b>Как получить доступ к приложению?</b>
1. Нажмите «Купить подписку»
2. Выберите удобный тариф
3. Оплатите
4. После оплаты нажмите «Доступ к приложению»

<b>У меня есть промокод:</b>
Нажмите кнопку «Ввести промокод» в главном меню
"""
        keyboard = get_back_keyboard()
    
    await callback.message.edit_text(help_text, reply_markup=keyboard, parse_mode=ParseMode.HTML)
    await callback.answer()

@dp.message(Command("profile"))
async def cmd_profile(message: Message):
    info = get_subscription_info(message.from_user.id)
    
    if info:
        text = MESSAGES["subscription_active"].format(**info)
    else:
        text = MESSAGES["no_subscription"]
    
    await message.answer(text, reply_markup=get_main_keyboard())

# --- Promo Code Logic ---

@dp.callback_query(F.data == "enter_promo")
async def enter_promo_callback(callback: types.CallbackQuery, state: FSMContext):
    await callback.message.edit_text(
        "🎟 <b>Активация промокода</b>\n\n"
        "Пожалуйста, отправьте код в чат:",
        reply_markup=get_back_keyboard(),
        parse_mode=ParseMode.HTML
    )
    # Save the id of the message to edit it later
    await state.update_data(menu_message_id=callback.message.message_id)
    await state.set_state(PromoState.waiting_for_code)
    await callback.answer()

@dp.message(PromoState.waiting_for_code)
async def process_promo_code_input(message: Message, state: FSMContext):
    code = message.text.strip().upper()
    data = await state.get_data()
    menu_message_id = data.get("menu_message_id")
    
    # Delete the user's message to keep chat clean
    try:
        await message.delete()
    except:
        pass
        
    response_text = ""
    success = False

    # Check and apply
    if has_used_promo_code(message.from_user.id, code):
        response_text = "❌ Вы уже использовали этот промокод!"
    elif use_promo_code(code, message.from_user.id):
        promo_info = validate_promo_code(code)
        response_text = (
            f"✅ Промокод <b>{code}</b> активирован!\n\n"
            f"🎁 Вам начислено: <b>{promo_info['days']} дней</b> подписки\n\n"
            f"Проверьте профиль."
        )
        success = True
    else:
        response_text = "❌ Промокод не найден, истек или уже использован."

    # Edit the prompt message to show result
    try:
        reply_markup = get_main_keyboard()
        await bot.edit_message_text(
            chat_id=message.chat.id,
            message_id=menu_message_id,
            text=response_text,
            reply_markup=reply_markup,
            parse_mode=ParseMode.HTML
        )
    except Exception as e:
        # Fallback if edit fails (e.g. message too old)
        await message.answer(response_text, reply_markup=get_main_keyboard(), parse_mode=ParseMode.HTML)
    
    await state.clear()


@dp.message(Command("promo"))
async def cmd_promo(message: Message):
    # Keep legacy command support
    args = message.text.split(maxsplit=1)
    if len(args) < 2:
        await message.answer(
            "🎁 <b>Активация промокода</b>\n\n"
            "Вы также можете использовать кнопку в меню.",
            parse_mode=ParseMode.HTML
        )
        return
    
    code = args[1].strip().upper()
    if has_used_promo_code(message.from_user.id, code):
        await message.answer("❌ Вы уже использовали этот промокод!", reply_markup=get_main_keyboard())
        return
    
    if use_promo_code(code, message.from_user.id):
        promo_info = validate_promo_code(code)
        await message.answer(
            f"✅ Промокод <b>{code}</b> активирован!\n\n"
            f"🎁 Вам начислено: <b>{promo_info['days']} дней</b> подписки",
            parse_mode=ParseMode.HTML,
            reply_markup=get_main_keyboard()
        )
    else:
        await message.answer(
            "❌ Промокод не найден или недействителен.",
            reply_markup=get_main_keyboard()
        )

# Admin commands
@dp.message(Command("create_promo"))
async def cmd_create_promo(message: Message):
    if message.from_user.id not in ADMIN_IDS:
        await message.answer("❌ У вас нет прав администратора!")
        return
    
    args = message.text.split()
    if len(args) < 3:
        await message.answer(
            "⚙️ <b>Создание промокода</b>\n\n"
            "Формат: <code>/create_promo КОД ДНЕЙ [КОЛ_ИСПОЛЬЗОВАНИЙ]</code>\n\n"
            "Примеры:\n"
            "• <code>/create_promo BONUS7 7 50</code> — 50 промокодов на 7 дней\n"
            "• <code>/create_promo TEST30 30 1</code> — 1 промокод на 30 дней",
            parse_mode=ParseMode.HTML
        )
        return
    
    try:
        code = args[1].upper()
        days = int(args[2])
        max_uses = int(args[3]) if len(args) > 3 else 1
        
        if create_promo_code(code, days, max_uses):
            await message.answer(
                f"✅ Промокод создан!\n\n"
                f"🎫 Код: <code>{code}</code>\n"
                f"📅 Дней: {days}\n"
                f"👥 Макс. использований: {max_uses}",
                parse_mode=ParseMode.HTML
            )
        else:
            await message.answer("❌ Промокод с таким кодом уже существует!")
    except ValueError:
        await message.answer("❌ Неверный формат! Проверьте числа.")

@dp.message(Command("list_promo"))
async def cmd_list_promo(message: Message):
    if message.from_user.id not in ADMIN_IDS:
        await message.answer("❌ У вас нет прав администратора!")
        return
    
    promos = list_all_promo_codes()
    if not promos:
        await message.answer("📭 Промокодов пока нет.")
        return
    
    text = "📋 <b>Список промокодов:</b>\n\n"
    for code, days, max_uses, used_count, is_active, expires_at in promos:
        status = "✅" if is_active else "❌"
        text += f"{status} <code>{code}</code> — {days}д ({used_count}/{max_uses})\n"
    
    await message.answer(text, parse_mode=ParseMode.HTML)

@dp.message(Command("stats"))
async def cmd_stats(message: Message):
    if message.from_user.id not in ADMIN_IDS:
        await message.answer("❌ У вас нет прав администратора!")
        return
    
    count = get_users_count()
    active_subs = get_active_subs_count()
    
    await message.answer(
        f"📊 <b>Статистика бота:</b>\n\n"
        f"👤 Всего пользователей: <b>{count}</b>\n"
        f"💎 Активных подписок: <b>{active_subs}</b>",
        parse_mode=ParseMode.HTML
    )


from aiogram.types import BotCommand, BotCommandScopeDefault

async def setup_bot_commands(bot: Bot):
    commands = [
        BotCommand(command="start", description="🏠 Главное меню"),
        BotCommand(command="profile", description="👤 Профиль"),
        BotCommand(command="help", description="❓ Помощь"),
    ]
    await bot.set_my_commands(commands, scope=BotCommandScopeDefault())

async def main():
    init_db()
    init_promo_codes_table()
    await setup_bot_commands(bot)
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())

# --- Feedback Logic ---

@dp.callback_query(F.data == "feedback")
async def enter_feedback_callback(callback: types.CallbackQuery, state: FSMContext):
    await callback.message.edit_text(
        "💡 <b>Предложение по доработке</b>\n\n"
        "Напишите вашу идею, пожелание или опишите проблему. "
        "Я передам ваше соообщение разработчику.\n\n"
        "<i>Отправьте текст сообщения:</i>",
        reply_markup=get_back_keyboard(),
        parse_mode=ParseMode.HTML
    )
    # Save the id of the message to edit it later
    await state.update_data(menu_message_id=callback.message.message_id)
    await state.set_state(FeedbackState.waiting_for_feedback)
    await callback.answer()

@dp.message(FeedbackState.waiting_for_feedback)
async def process_feedback_input(message: Message, state: FSMContext):
    feedback_text = message.text
    user = message.from_user
    username = f"@{user.username}" if user.username else f"ID: {user.id}"
    full_name = user.full_name or "Unknown"

    data = await state.get_data()
    menu_message_id = data.get("menu_message_id")
    
    # Delete the user's message to keep chat clean
    try:
        await message.delete()
    except:
        pass
    
    # Send to admins
    admin_notification = (
        f"📩 <b>НОВЫЙ ОТЗЫВ/ПРЕДЛОЖЕНИЕ</b>\n"
        f"👤 От: {full_name} ({username})\n"
        f"🆔 ID: <code>{user.id}</code>\n\n"
        f"📝 <b>Текст:</b>\n{feedback_text}"
    )

    for admin_id in ADMIN_IDS:
        try:
            await bot.send_message(chat_id=admin_id, text=admin_notification, parse_mode=ParseMode.HTML)
        except Exception as e:
            logging.error(f"Failed to send feedback to admin {admin_id}: {e}")

    # Confirmation to user
    response_text = (
        "✅ <b>Спасибо! Ваше сообщение отправлено.</b>\n\n"
        "Разработчк рассмотрит ваше предложение."
    )

    try:
        reply_markup = get_main_keyboard()
        await bot.edit_message_text(
            chat_id=message.chat.id,
            message_id=menu_message_id,
            text=response_text,
            reply_markup=reply_markup,
            parse_mode=ParseMode.HTML
        )
    except Exception:
        await message.answer(response_text, reply_markup=get_main_keyboard(), parse_mode=ParseMode.HTML)
    
    await state.clear()
