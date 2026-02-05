import os
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
ADMIN_IDS = [int(x) for x in os.getenv("ADMIN_IDS", "").split(",") if x]
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///bot.db")
PAYMENT_PROVIDER_TOKEN = os.getenv("PAYMENT_PROVIDER_TOKEN", "")

# Цены подписки
SUBSCRIPTION_PRICES = [int(x) for x in os.getenv("SUBSCRIPTION_PRICES", "100,300,500").split(",")]
SUBSCRIPTION_STARS = [int(x) for x in os.getenv("SUBSCRIPTION_STARS", "50,150,250").split(",")]
SUBSCRIPTION_DAYS = [int(x) for x in os.getenv("SUBSCRIPTION_DAYS", "30,90,365").split(",")]

APP_URL = os.getenv("APP_URL", "https://your-app.com")
FEEDBACK_URL = os.getenv("FEEDBACK_URL", APP_URL)  # URL формы обратной связи

# Тексты сообщений
MESSAGES = {
    "welcome": """
Привет! Я бот для CNC/ЧПУ: пишу и помогаю отлаживать программы для токарных станков с Fanuc, Siemens, Haas и FMS, а ещё считаю геометрию и тригонометрию под твои размеры.
""",
    "no_subscription": """
❌ У вас нет активной подписки.

Чтобы получить доступ к приложению, оформите подписку.
""",
    "subscription_active": """
✅ Ваша подписка активна!

📅 Действует до: {expiry_date}
🕐 Осталось дней: {days_left}

Вы можете получить доступ к приложению.
""",
    "choose_plan": """
💎 Выберите тариф подписки:

{plans}

💰 Скидки:
• 3 месяца — скидка 10%
• 6 месяцев — скидка 15%
""",
}
