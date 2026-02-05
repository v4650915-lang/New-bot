import sqlite3
from datetime import datetime, timedelta
from typing import Optional
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "bot.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id INTEGER UNIQUE NOT NULL,
            username TEXT,
            full_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            subscription_expiry TIMESTAMP,
            is_active BOOLEAN DEFAULT 1
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            amount INTEGER NOT NULL,
            days INTEGER NOT NULL,
            payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            invoice_payload TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    
    conn.commit()
    conn.close()

def get_user(telegram_id: int):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE telegram_id = ?", (telegram_id,))
    user = cursor.fetchone()
    conn.close()
    return user

def get_users_count() -> int:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]
    conn.close()
    return count

def get_active_subs_count() -> int:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Check for users where subscription_expiry date is > current timestamp
    cursor.execute("SELECT COUNT(*) FROM users WHERE subscription_expiry > datetime('now')")
    count = cursor.fetchone()[0]
    conn.close()
    return count

def create_user(telegram_id: int, username: str, full_name: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR IGNORE INTO users (telegram_id, username, full_name) VALUES (?, ?, ?)",
        (telegram_id, username, full_name)
    )
    conn.commit()
    conn.close()

def has_active_subscription(telegram_id: int) -> bool:
    user = get_user(telegram_id)
    if not user:
        return False
    
    expiry = user[5]
    if expiry is None:
        return False
    
    expiry_date = datetime.fromisoformat(expiry)
    return datetime.now() < expiry_date

def get_subscription_info(telegram_id: int) -> Optional[dict]:
    user = get_user(telegram_id)
    if not user or not user[5]:
        return None
    
    expiry_date = datetime.fromisoformat(user[5])
    days_left = (expiry_date - datetime.now()).days
    
    return {
        "expiry_date": expiry_date.strftime("%d.%m.%Y"),
        "days_left": max(0, days_left)
    }

def add_subscription(telegram_id: int, days: int):
    user = get_user(telegram_id)
    if not user:
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    current_expiry = user[5]
    if current_expiry and datetime.fromisoformat(current_expiry) > datetime.now():
        new_expiry = datetime.fromisoformat(current_expiry) + timedelta(days=days)
    else:
        new_expiry = datetime.now() + timedelta(days=days)
    
    cursor.execute(
        "UPDATE users SET subscription_expiry = ? WHERE telegram_id = ?",
        (new_expiry.isoformat(), telegram_id)
    )
    conn.commit()
    conn.close()
    
    return new_expiry

def add_payment(user_id: int, amount: int, days: int, invoice_payload: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO payments (user_id, amount, days, invoice_payload) VALUES (?, ?, ?, ?)",
        (user_id, amount, days, invoice_payload)
    )
    conn.commit()
    conn.close()

def get_user_id_by_telegram_id(telegram_id: int) -> Optional[int]:
    user = get_user(telegram_id)
    return user[0] if user else None


def init_promo_codes_table():
    """Create promo codes table"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS promo_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            days INTEGER NOT NULL,
            max_uses INTEGER DEFAULT 1,
            used_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP,
            is_active BOOLEAN DEFAULT 1
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS promo_code_usages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            promo_code_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (promo_code_id) REFERENCES promo_codes (id),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    
    conn.commit()
    conn.close()


def create_promo_code(code: str, days: int, max_uses: int = 1, expires_at: datetime = None):
    """Create new promo code"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            """INSERT INTO promo_codes (code, days, max_uses, expires_at) 
               VALUES (?, ?, ?, ?)""",
            (code.upper(), days, max_uses, expires_at.isoformat() if expires_at else None)
        )
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        conn.close()
        return False


def validate_promo_code(code: str) -> Optional[dict]:
    """Validate promo code and return info if valid"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT * FROM promo_codes WHERE code = ? AND is_active = 1",
        (code.upper(),)
    )
    promo = cursor.fetchone()
    conn.close()
    
    if not promo:
        return None
    
    # Check if expired
    if promo[6]:  # expires_at
        expiry = datetime.fromisoformat(promo[6])
        if datetime.now() > expiry:
            return None
    
    # Check if max uses reached
    if promo[4] >= promo[3]:  # used_count >= max_uses
        return None
    
    return {
        "id": promo[0],
        "code": promo[1],
        "days": promo[2],
        "max_uses": promo[3],
        "used_count": promo[4]
    }


def use_promo_code(code: str, telegram_id: int) -> bool:
    """Apply promo code to user"""
    promo = validate_promo_code(code)
    if not promo:
        return False
    
    # Check if user already used it
    if has_used_promo_code(telegram_id, code):
        return False

    user = get_user(telegram_id)
    if not user:
        return False
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Increment used count
        cursor.execute(
            "UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?",
            (promo["id"],)
        )
        
        # Record usage
        cursor.execute(
            "INSERT INTO promo_code_usages (promo_code_id, user_id) VALUES (?, ?)",
            (promo["id"], user[0])
        )
        
        conn.commit()
        conn.close()
        
        # Add subscription days
        add_subscription(telegram_id, promo["days"])
        
        return True
    except Exception as e:
        print(f"Error in use_promo_code: {e}")
        conn.close()
        return False


def has_used_promo_code(telegram_id: int, code: str) -> bool:
    """Check if user already used this promo code"""
    user = get_user(telegram_id)
    if not user:
        return False
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT 1 FROM promo_code_usages 
        WHERE user_id = ? AND promo_code_id = (
            SELECT id FROM promo_codes WHERE code = ?
        )
    """, (user[0], code.upper()))
    
    result = cursor.fetchone()
    conn.close()
    
    return result is not None


def list_all_promo_codes():
    """List all promo codes (for admin)"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT code, days, max_uses, used_count, is_active, expires_at 
        FROM promo_codes ORDER BY created_at DESC
    """)
    
    promos = cursor.fetchall()
    conn.close()
    
    return promos
