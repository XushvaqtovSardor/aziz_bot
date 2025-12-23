# 🎬 Bot Quick Start Guide

## ✅ Your Bot is READY and WORKING!

### Current Status:
- ✅ Bot running in Docker
- ✅ Database connected
- ✅ Code validation working (numeric only)
- ✅ All features implemented

---

## 📝 Movie Upload Steps (Admin)

1. Click: **"🎬 Kino yuklash"**
2. Enter **numeric code only** (e.g., `12345`)
   - If code taken → Bot suggests 5 nearest codes
3. Send **movie poster** (photo)
4. Enter **movie title** (e.g., "Avatar 2")
5. Enter **movie genre** (e.g., "Action, Sci-Fi")
6. Enter **description** OR type `Next` to skip
7. Select **field number** (e.g., `1`)
8. Send **movie video**
9. ✅ Done! Movie published to channels

---

## 🎯 What Happens After Upload

**Field Channel (Public):**
- Gets: Poster + Title + Genre + Description + Code
- Has button: "🤖 Botga o'tish" (links to bot)

**Database Channels (Private):**
- All channels get the video
- Message IDs saved for each channel

---

## 👤 User Watch Flow

**User can:**
1. Click button from field channel
2. Send code directly to bot
3. Use `/start CODE`

**Bot will:**
1. Check mandatory subscriptions
2. Forward video from database channel
3. Send poster with movie info
4. Count the view

---

## 🔧 Docker Commands

```bash
# Start bot
docker-compose up -d

# Rebuild after code changes
docker-compose up --build -d

# View logs
docker logs aziz_bot_app -f

# Stop bot
docker-compose down

# Restart bot
docker-compose restart bot
```

---

## ✨ Key Features

✅ **Numeric-only codes** - No text allowed
✅ **Smart code suggestions** - If code taken, suggests alternatives
✅ **Optional description** - Press "Next" to skip
✅ **Multi-channel storage** - Videos in all database channels
✅ **Message ID tracking** - Each video's location saved
✅ **Subscription check** - Users must join mandatory channels
✅ **View statistics** - Every watch is counted

---

## 🎉 Everything Works!

Your bot is production-ready. Just:
1. Make sure bot is admin in all channels
2. Start uploading movies
3. Share field channel with users

**Test it now with any numeric code!**
