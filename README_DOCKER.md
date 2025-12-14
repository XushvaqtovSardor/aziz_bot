# 🐳 Docker Setup - Quick Start

## ✅ Lokal Test (Kompyuteringizda)

### 1-qadam: .env sozlash
```bash
# .env faylini yarating
cp .env.example .env

# .env ni tahrirlang
BOT_TOKEN=your_bot_token
DATABASE_URL=postgresql://azizbot:azizbot_secure_password@localhost:5432/aziz_bot_db?schema=public
```

### 2-qadam: PostgreSQL ishga tushirish
```bash
pnpm docker:dev
```

### 3-qadam: Database migrate
```bash
pnpm prisma:deploy
```

### 4-qadam: Bot ishga tushirish
```bash
pnpm start:dev
```

---

## 🌐 Production Server (Digital Ocean)

### Server tayyorlash
```bash
# 1. Ulanish
ssh root@159.89.129.241

# 2. Docker o'rnatish
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt install docker-compose-plugin -y

# 3. Repository
git clone https://github.com/XushvaqtovSardor/aziz_bot.git
cd aziz_bot

# 4. Environment
nano .env
```

**.env (Production):**
```
BOT_TOKEN=your_real_token
DATABASE_URL=postgresql://azizbot:STRONG_PASSWORD@postgres:5432/aziz_bot_db?schema=public
DB_USER=azizbot
DB_PASSWORD=STRONG_PASSWORD
DB_NAME=aziz_bot_db
NODE_ENV=production
```

### Ishga tushirish
```bash
docker-compose up -d
docker-compose logs -f bot
```

---

## 📝 Commands

```bash
# Development
pnpm docker:dev     # Faqat PostgreSQL
pnpm docker:up      # Barcha containerlar
pnpm docker:down    # To'xtatish
pnpm docker:logs    # Logs

# Production
docker-compose up -d        # Start
docker-compose logs -f bot  # Logs
docker-compose restart bot  # Restart
git pull && docker-compose up -d --build  # Update
```

Batafsil: `DEPLOYMENT.md`
