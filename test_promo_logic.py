import asyncio
import os
from datetime import datetime, timedelta
from database import (
    init_db, create_user, get_user, has_active_subscription,
    get_subscription_info, create_promo_code, use_promo_code,
    has_used_promo_code, init_promo_codes_table
)

# Mock data
TEST_USER_ID = 123456789
TEST_USERNAME = "test_user"
TEST_FULL_NAME = "Test User"

def run_tests():
    print("🚀 Запуск теста промокодов...\n")
    
    # Initialize logic
    if os.path.exists("bot.db"):
        print("ℹ️ Используем существующую базу данных.")
    init_db()
    init_promo_codes_table()
    
    # Create test user
    print(f"1. Создаем тестового пользователя {TEST_USER_ID}...")
    create_user(TEST_USER_ID, TEST_USERNAME, TEST_FULL_NAME)
    user = get_user(TEST_USER_ID)
    if user:
        print("✅ Пользователь создан/найден.")
    else:
        print("❌ Ошибка создания пользователя.")
        return

    # Test 1: Create and use a normal promo code
    code_1 = f"TEST_{datetime.now().strftime('%H%M%S')}"
    print(f"\n2. Создаем промокод {code_1} на 7 дней...")
    if create_promo_code(code_1, 7, max_uses=10):
        print("✅ Промокод создан.")
    else:
        print("❌ Ошибка создания промокода.")
    
    print(f"3. Активируем промокод {code_1}...")
    if use_promo_code(code_1, TEST_USER_ID):
        print("✅ Промокод успешно активирован!")
        info = get_subscription_info(TEST_USER_ID)
        print(f"   Подписка активна до: {info['expiry_date']}")
    else:
        print("❌ Ошибка активации!")
        
    # Test 2: Double usage attempt
    print(f"\n4. Попытка повторной активации {code_1}...")
    if has_used_promo_code(TEST_USER_ID, code_1):
        print("✅ Система зафиксировала использование.")
    else:
        print("❌ Ошибка: использование не записано.")
        
    if use_promo_code(code_1, TEST_USER_ID):
        print("❌ Ошибка: Промокод сработал второй раз (а не должен)!")
    else:
        print("✅ Промокод не сработал второй раз (корректно).")

    # Test 3: Usage limit
    code_2 = f"LIMIT_{datetime.now().strftime('%H%M%S')}"
    print(f"\n5. Создаем одноразовый промокод {code_2}...")
    create_promo_code(code_2, 3, max_uses=1)
    
    print("   Используем промокод (1/1)...")
    use_promo_code(code_2, TEST_USER_ID)
    
    print("   Пытаемся использовать промокод другим пользователем (2/1)...")
    OTHER_USER_ID = 987654321
    create_user(OTHER_USER_ID, "other", "Other")
    
    if use_promo_code(code_2, OTHER_USER_ID):
        print("❌ Ошибка: Лимит использований не сработал!")
    else:
        print("✅ Лимит сработал: промокод больше недоступен.")

    print("\n🏁 Тесты завершены успешно!")

if __name__ == "__main__":
    run_tests()
