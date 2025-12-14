# 🚀 Quick Start - Docker Setup

## Lokal Kompyuterda Test (Development)

### 1. Repository tayyorlash
```bash
git clone https://github.com/XushvaqtovSardor/aziz_bot.git
cd aziz_bot
```

### 2. Environment o'rnatish
```bash
cp .env.example .env
# .env ni tahrirlang va BOT_TOKEN kiriting
```

### 3. Docker bilan ishga tushirish

**Variant A: Faqat PostgreSQL (recommended for development)**
```bash
# PostgreSQL ni ishga tushirish
pnpm docker:dev
# yoki
docker-compose up -d postgres

# Database migration
pnpm prisma:deploy

# Bot ni lokal ishga tushirish
pnpm start:dev
```

**Variant B: To'liq containerlar**
```bash
# Build va ishga tushirish
pnpm docker:up
# yoki
docker-compose up -d

# Loglarni ko'rish
pnpm docker:logs
# yoki
docker-compose logs -f bot
```

**Variant C: PgAdmin bilan (database UI)**
```bash
docker-compose --profile dev up -d
# PgAdmin: http://localhost:5050
```

### 4. To'xtatish
```bash
pnpm docker:down
# yoki
docker-compose down
```

---

## Production Serverda Deploy (Digital Ocean)

### 1. Server tayyorlash
```bash
# Ulanish
ssh root@your_server_ip

# Docker o'rnatish
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Docker Compose
apt install docker-compose-plugin -y

# Git
apt install git -y
```

### 2. Repository va sozlamalar
```bash
# Clone
git clone https://github.com/XushvaqtovSardor/aziz_bot.git
cd aziz_bot

# Environment
nano .env
```

**.env (Production):**
```env
BOT_TOKEN=your_real_bot_token
DATABASE_URL=postgresql://azizbot:STRONG_PASSWORD@postgres:5432/aziz_bot_db?schema=public
DB_USER=azizbot
DB_PASSWORD=STRONG_PASSWORD
DB_NAME=aziz_bot_db
NODE_ENV=production
```

### 3. Ishga tushirish
```bash
# Build va start
docker-compose up -d

# Status
docker-compose ps

# Logs
docker-compose logs -f bot
```

### 4. Yangilash
```bash
git pull
docker-compose down
docker-compose up -d --build
```

---

## 🔧 Useful Commands

```bash
# Status
docker-compose ps

# Logs
docker-compose logs -f bot
docker-compose logs -f postgres

# Shell
docker-compose exec bot sh
docker-compose exec postgres psql -U azizbot -d aziz_bot_db

# Restart
docker-compose restart bot

# Rebuild
docker-compose build --no-cache

# Database backup
docker-compose exec postgres pg_dump -U azizbot aziz_bot_db > backup.sql

# Stats
docker stats
```

---

## 📋 Package.json Scripts

```bash
# Docker
pnpm docker:dev      # Faqat PostgreSQL
pnpm docker:up       # Barcha servislar
pnpm docker:down     # To'xtatish
pnpm docker:logs     # Bot logs
pnpm docker:build    # Rebuild

# Prisma
pnpm prisma:generate # Client generate
pnpm prisma:migrate  # Dev migration
pnpm prisma:deploy   # Production migration
pnpm prisma:studio   # Database UI

# Development
pnpm start:dev       # Local bot
pnpm build           # Build
```

---

## 🐛 Troubleshooting

**Port band:**
```bash
# .env da portni o'zgartiring
DB_PORT=5433
```

**Database ulanmayapti:**
```bash
docker-compose logs postgres
docker-compose restart postgres
```

**Disk to'lgan:**
```bash
docker system prune -a
docker volume prune
```

To'liq qo'llanma: `DEPLOYMENT.md`
