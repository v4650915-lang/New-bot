# Инструкция по деплою (запуску на сервере)

Чтобы ваш бот работал круглосуточно (24/7) и не зависел от вашего компьютера, его нужно разместить на виртуальном сервере (VPS).

## 1. Аренда сервера
Вам подойдет самый простой VPS на Linux (Ubuntu 22.04 или 24.04).
Популярные хостинги в РФ: Timeweb, Beget, Reg.ru, Aeza.
Характеристики: 1 CPU, 1-2 GB RAM, 10-20 GB SSD (стоит обычно 200-400 руб/мес).

## 2. Подготовка сервера
Зайдите на сервер через терминал (PuTTY или командную строку):
`ssh root@IP_ВАШЕГО_СЕРВЕРА`

Выполните команды для обновления и установки Python:
```bash
apt update && apt upgrade -y
apt install python3-pip python3-venv git screen -y
```

## 3. Загрузка бота
Самый простой способ — скопировать файлы через WinSCP или создать папку и перенести их.
Но лучше использовать Git. Если у вас нет Git-репозитория, можно просто скопировать папку.

Допустим, вы скопировали файлы в папку `/root/bot`.

## 4. Настройка окружения
Перейдите в папку бота:
```bash
cd /root/bot
```

Создайте виртуальное окружение:
```bash
python3 -m venv venv
source venv/bin/activate
```

Установите зависимости:
```bash
pip install -r requirements.txt
```

## 5. Запуск
Чтобы бот работал в фоне (даже когда вы закроете консоль), используйте `systemd` (рекомендуется) или `screen`.

### Способ 1: Systemd (Профессиональный)
Создайте файл службы:
```bash
nano /etc/systemd/system/bot.service
```

Вставьте туда этот текст (измените пути, если нужно):
```ini
[Unit]
Description=Telegram Bot
After=network.target

[Service]
User=root
WorkingDirectory=/root/bot
ExecStart=/root/bot/venv/bin/python main.py
Restart=always

[Install]
WantedBy=multi-user.target
```
Нажмите `Ctrl+O` (Enter) для сохранения и `Ctrl+X` для выхода.

Запустите бота:
```bash
systemctl daemon-reload
systemctl enable bot
systemctl start bot
```

Проверка статуса: `systemctl status bot`

Теперь бот будет сам запускаться при перезагрузке сервера!

---

## Как обновлять бота?
1. Внесите правки в код на своем компьютере.
2. Замените файлы на сервере (через WinSCP, FileZilla или Git).
3. Перезапустите бота командой:
   ```bash
   systemctl restart bot
   ```
Все изменения сразу вступят в силу.
