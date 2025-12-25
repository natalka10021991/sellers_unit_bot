# ⚡ Быстрый старт для разработки

## 🚀 За 5 минут

### 1. Клонируй репозиторий

```bash
git clone <repo-url>
cd telegram-bot
```

### 2. Установи зависимости

```bash
npm install
cd mini-app && npm install && cd ..
```

### 3. Настрой окружение

```bash
# Скопируй пример файла
cp env.example .env.local

# Открой .env.local и заполни:
# - BOT_TOKEN (получи у @BotFather)
# - WB_API_TOKEN (получи на https://dev.wildberries.ru)
```

### 4. Запусти локально

**Терминал 1 - Бот:**
```bash
npm run dev
```

**Терминал 2 - Mini App:**
```bash
cd mini-app
npm run dev
```

### 5. Проверь работу

- **Бот:** Открой тестового бота в Telegram
- **API:** http://localhost:3000/health
- **Mini App:** http://localhost:5173

---

## 🔀 Git Workflow

### Разработка новой фичи

```bash
# 1. Переключись на develop
git checkout develop
git pull

# 2. Создай ветку для фичи
git checkout -b feature/название-фичи

# 3. Разрабатывай и коммить
git add .
git commit -m "feat: описание"
git push origin feature/название-фичи

# 4. Слей в develop
git checkout develop
git merge feature/название-фичи
git push origin develop
```

### Деплой на production

```bash
# 1. Убедись, что все протестировано
# 2. Слей develop в main
git checkout main
git merge develop
git push origin main

# 3. Railway и Vercel автоматически задеплоят
```

---

## ✅ Чеклист перед коммитом

- [ ] Код компилируется: `npm run build`
- [ ] Нет ошибок: `npm run typecheck`
- [ ] Протестировано локально
- [ ] Нет секретов в коде
- [ ] `.env.local` не коммитится

---

## 📚 Дополнительно

- **Полное руководство:** [DEVELOPMENT.md](./DEVELOPMENT.md)
- **Архитектура проекта:** [ARCHITECTURE.md](./ARCHITECTURE.md)

