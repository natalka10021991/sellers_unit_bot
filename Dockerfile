FROM node:22-alpine

WORKDIR /app

# Установка инструментов для компиляции better-sqlite3
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    pkgconfig \
    && rm -rf /var/cache/apk/*

# Копирование package файлов
COPY package.json package-lock.json* ./

# Установка всех зависимостей (включая dev для сборки)
RUN npm ci

# Копирование исходного кода
COPY . .

# Сборка TypeScript
RUN npm run build

# Запуск приложения
CMD ["npm", "start"]

