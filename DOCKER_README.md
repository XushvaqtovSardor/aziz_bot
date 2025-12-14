# 🐳 Docker Setup - MUHIM MA'LUMOTLAR

## ⚠️ Docker Desktop

Windows da Docker ishlatish uchun **Docker Desktop** ishlatilishi kerak va u **ishga tushirilgan** bo'lishi shart!

### Docker Desktop o'rnatish
1. [Docker Desktop](https://www.docker.com/products/docker-desktop/) ni yuklab oling
2. O'rnatib, ishga tushiring
3. Settings → General → "Use WSL 2 based engine" ni yoqing
4. Terminal dan tekshiring:
```bash
docker --version
docker ps
```

---

## 🚀 Lokal Test (Development)

### 1. Repositoryni clone qiling
```bash
git clone https://github.com/XushvaqtovSardor/aziz_bot.git
cd aziz_bot
```

### 2. Environment sozlang
```bash
cp .env.example .env
```

**.env faylini tahrirlang:**
```env
BOT_TOKEN=your_bot_token_here
DATABASE_URL=postgresql://azizbot:azizbot_secure_password@localhost:5432/aziz_bot_db?schema=public
```

### 3. PostgreSQL ishga tushiring
```bash
pnpm docker:dev
```

### 4. Database migrate qiling
```bash
pnpm prisma:deploy
```

### 5. Bot ni ishga tushiring
```bash
pnpm start:dev
```

---

## 🌐 Production Server (Digital Ocean)

### 1. Server sozlash
```bash
# Ulanish
ssh root@your_server_ip

# Docker o'rnatish
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl start docker
systemctl enable docker

# Docker Compose
apt install docker-compose-plugin -y

# Git
apt install git -y
```

### 2. Repository clone
```bash
git clone https://github.com/XushvaqtovSardor/aziz_bot.git
cd aziz_bot
```

### 3. .env sozlash
```bash
nano .env
```

```env
BOT_TOKEN=your_real_bot_token
DATABASE_URL=postgresql://azizbot:STRONG_PASSWORD@postgres:5432/aziz_bot_db?schema=public
DB_USER=azizbot
DB_PASSWORD=STRONG_PASSWORD
DB_NAME=aziz_bot_db
NODE_ENV=production
```

### 4. Ishga tushirish
```bash
docker-compose up -d
docker-compose logs -f bot
```

---

## 📝 Commands

### Development
```bash
pnpm docker:dev      # Faqat PostgreSQL
pnpm docker:up       # Barcha containerlar  
pnpm docker:down     # To'xtatish
pnpm docker:logs     # Bot logs
pnpm prisma:deploy   # Database migrate
pnpm start:dev       # Bot local
```

### Production
```bash
docker-compose up -d              # Start
docker-compose logs -f bot        # Logs
docker-compose restart bot        # Restart
git pull && docker-compose up -d --build  # Update
```

---

## 🔧 Troubleshooting

### Docker ishlamayapti
```bash
# Docker status
sudo systemctl status docker

# Docker ni ishga tushirish
sudo systemctl start docker

# Docker Desktop ni restart qiling (Windows)
```

### Port band
```bash
# .env da portni o'zgartiring
DB_PORT=5433
```

### Database ulanmayapti
```bash
docker-compose logs postgres
docker-compose restart postgres
```

---

## ✅ Production Checklist

- [ ] Docker Desktop o'rnatilgan va ishlamoqda
- [ ] Repository clone qilingan  
- [ ] .env to'g'ri sozlangan
- [ ] BOT_TOKEN to'g'ri
- [ ] Database parollari kuchli
- [ ] docker-compose up -d ishga tushirilgan
- [ ] Logs xatoliksiz
- [ ] Bot Telegram da javob berayapti

Batafsil: `DEPLOYMENT.md`
