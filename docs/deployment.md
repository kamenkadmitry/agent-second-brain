# Развертывание Agent Second Brain (Node.js)

Проект полностью переписан на Node.js (TypeScript) и работает как единый сервис, объединяющий Telegram бота и API.

## Требования к серверу (VPS)
- Ubuntu 22.04 / 24.04 или любой современный Linux
- Node.js версии **v20.0.0 или выше**
- PM2 (Process Manager) для поддержания работы в фоне
- Около 1GB RAM (минимально)

## Шаг 1. Установка зависимостей на сервере
Подключитесь к вашему серверу по SSH и выполните следующие команды:

```bash
# Обновление пакетов и установка curl
sudo apt update && sudo apt install -y curl git

# Установка Node.js (v20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Установка PM2 для управления процессом
sudo npm install -g pm2
```

## Шаг 2. Клонирование и сборка
Клонируйте ваш приватный форк репозитория и соберите проект:

```bash
# Клонирование
git clone https://github.com/ВАШ_USERNAME/agent-second-brain.git
cd agent-second-brain

# Установка зависимостей
npm install

# Компиляция TypeScript в JavaScript
npm run build
```

## Шаг 3. Настройка окружения
Создайте файл `.env` на основе шаблона и заполните ключи:

```bash
cp .env.example .env
# Отредактируйте файл .env вашим любимым редактором
```

Обязательные переменные:
- `TELEGRAM_BOT_TOKEN`
- `DEEPGRAM_API_KEY`
- `TODOIST_API_KEY`
- `OPENAI_API_KEY` (если используете OpenAI)
- `VAULT_PATH` (по умолчанию `./vault`)

## Шаг 4. Запуск через PM2
Запустите собранное приложение:

```bash
# Запуск приложения
pm2 start dist/index.js --name "agent-second-brain"

# Сохранение процесса в автозагрузку при рестарте сервера
pm2 save
pm2 startup
```

## Управление
```bash
# Просмотр логов
pm2 logs agent-second-brain

# Рестарт
pm2 restart agent-second-brain

# Остановка
pm2 stop agent-second-brain
```

## Обновление бота
При внесении изменений в код (или стягивании обновлений):
```bash
cd agent-second-brain
git fetch origin main
git reset --hard origin/main
npm install
npm run build
pm2 restart agent-second-brain
```
