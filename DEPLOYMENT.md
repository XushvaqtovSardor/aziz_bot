# 🚀 Deployment Instructions

## 📋 Talablar

- Docker va Docker Compose o'rnatilgan bo'lishi kerak
- Server: Digital Ocean Droplet (yoki boshqa VPS) - 2GB RAM minimum
- Telegram Bot Token

## 🏠 Lokal Kompyuterda Test Qilish

### 1. Repository ni clone qiling
```bash
git clone https://github.com/XushvaqtovSardor/aziz_bot.git
cd aziz_bot
```

### 2. Environment o'rnatish
```bash
# .env faylini yarating
cp .env.example .env

# .env faylini tahrirlang va bot tokenni kiriting
nano .env
```

### 3. Docker bilan ishga tushirish

**A) Faqat database (development uchun):**
```bash
# Faqat PostgreSQL ni ishga tushirish
docker-compose up -d postgres

# Database migratsiyalarini ishga tushirish
pnpm prisma migrate deploy

# Bot ni lokal ishga tushirish
pnpm start:dev
```

**B) To'liq container setup (production test):**
```bash
# Hamma servislarni ishga tushirish
docker-compose up -d

# Loglarni ko'rish
docker-compose logs -f bot
```

**C) PgAdmin bilan (database ko'rish uchun):**
```bash
# Database + PgAdmin
docker-compose --profile dev up -d

# PgAdmin: http://localhost:5050
# Email: admin@admin.com
# Password: admin
```

### 4. Database ni to'xtatish
```bash
docker-compose down

# Volume bilan o'chirish (database ham o'chadi)
docker-compose down -v
```

## 🌐 Production Serverda Deploy Qilish

### 1. Serverni tayyorlash (Digital Ocean)

```bash
# Serverga ulanish
ssh root@your_server_ip

# Yangilanishlar
apt update && apt upgrade -y

# Docker o'rnatish
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Docker Compose o'rnatish
apt install docker-compose-plugin -y

# Git o'rnatish
apt install git -y
```

### 2. Repository ni clone qilish

```bash
# Repository ni clone qilish
git clone https://github.com/XushvaqtovSardor/aziz_bot.git
cd aziz_bot
```

### 3. Environment sozlash

```bash
# .env faylini yaratish
nano .env
```

**.env faylining ichiga qo'yish:**
```env
# Bot Token
BOT_TOKEN=your_real_bot_token

# Database (Docker ichida)
DATABASE_URL=postgresql://azizbot:STRONG_PASSWORD_HERE@postgres:5432/aziz_bot_db?schema=public

# Database settings
DB_USER=azizbot
DB_PASSWORD=STRONG_PASSWORD_HERE
DB_NAME=aziz_bot_db
DB_PORT=5432

# Production mode
NODE_ENV=production
```

⚠️ **STRONG_PASSWORD_HERE** ni kuchli parol bilan almashtiring!

### 4. Docker Compose bilan ishga tushirish

```bash
# Build va ishga tushirish
docker-compose up -d

# Status ko'rish
docker-compose ps

# Loglarni ko'rish
docker-compose logs -f bot

# Xatoliklarni ko'rish
docker-compose logs --tail=100 bot
```

### 5. Database migratsiyalarini tekshirish

```bash
# Container ichida migration tekshirish
docker-compose exec bot pnpm prisma migrate status

# Agar kerak bo'lsa, migration qo'llash
docker-compose exec bot pnpm prisma migrate deploy
```

## 🔄 Yangilanishlarni Deploy Qilish

```bash
# Serverda
cd aziz_bot

# Yangi kodlarni pull qilish
git pull

# Container rebuild va restart
docker-compose down
docker-compose up -d --build

# Loglarni ko'rish
docker-compose logs -f bot
```

## 📊 Monitoring va Debugging

### Container holati
```bash
# Ishlab turgan containerlar
docker-compose ps

# Bot logs
docker-compose logs -f bot

# Database logs
docker-compose logs -f postgres

# Resource usage
docker stats
```

### Database ga kirish
```bash
# PostgreSQL shell
docker-compose exec postgres psql -U azizbot -d aziz_bot_db

# Database backup
docker-compose exec postgres pg_dump -U azizbot aziz_bot_db > backup.sql

# Backup restore
cat backup.sql | docker-compose exec -T postgres psql -U azizbot -d aziz_bot_db
```

### Container ichiga kirish
```bash
# Bot container shell
docker-compose exec bot sh

# PostgreSQL container shell
docker-compose exec postgres sh
```

## 🛠️ Muammolarni hal qilish

### Bot ishlamayapti
```bash
# Loglarni ko'ring
docker-compose logs --tail=100 bot

# Container qayta ishga tushiring
docker-compose restart bot
```

### Database ulanmayapti
```bash
# Database health check
docker-compose exec postgres pg_isready -U azizbot

# Database qayta ishga tushiring
docker-compose restart postgres
```

### Port band
```bash
# Port ishlatilayotganini tekshirish
netstat -tulpn | grep 5432

# Boshqa port ishlatish (.env da DB_PORT ni o'zgartiring)
DB_PORT=5433
```

### Disk to'lgan
```bash
# Docker disk usage
docker system df

# Keraksiz imagelarni o'chirish
docker system prune -a

# Logs tozalash
docker-compose logs --no-log-prefix bot > /dev/null
```

## 🔒 Security Best Practices

1. **Strong passwords:** Database uchun kuchli parollar ishlating
2. **Firewall:** Faqat kerakli portlarni oching
3. **SSL/TLS:** Production da SSL ishlating
4. **Backup:** Muntazam database backup oling
5. **Updates:** Docker imagelarni muntazam yangilang
6. **Environment:** .env faylni git ga commit qilmang

## 📁 Folder Structure (Docker Volume)

```
/var/lib/docker/volumes/
├── aziz_bot_postgres_data/     # PostgreSQL data
└── aziz_bot_pgadmin_data/      # PgAdmin data (optional)

/root/aziz_bot/                 # Application
├── logs/                        # Application logs
└── .env                         # Environment variables
```

## 🎯 Production Checklist

- [x] Docker va Docker Compose o'rnatilgan
- [x] Repository clone qilingan
- [x] .env fayli to'g'ri sozlangan
- [x] BOT_TOKEN to'g'ri
- [x] Database parollari kuchli
- [x] docker-compose up -d ishga tushirilgan
- [x] Logs tekshirilgan (xatolik yo'q)
- [x] Bot Telegram da javob berayapti
- [x] Database backup strategiyasi o'ylangan

## 💡 Useful Commands

```bash
# Hamma narsani to'xtatish va o'chirish
docker-compose down -v

# Rebuild without cache
docker-compose build --no-cache

# Specific service restart
docker-compose restart bot

# View container resource usage
docker stats aziz_bot_app aziz_bot_db

# Execute command in container
docker-compose exec bot pnpm prisma studio

# Container logs with timestamps
docker-compose logs -f --timestamps bot
```

## 📞 Support

Muammo bo'lsa:
1. Loglarni tekshiring: `docker-compose logs bot`
2. Database ulanishini tekshiring
3. BOT_TOKEN to'g'riligini tekshiring
4. Firewall sozlamalarini tekshiring
