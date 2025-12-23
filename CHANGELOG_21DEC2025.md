# Kino Bot Yangilanishlari - 21 Dekabr 2025

## O'zgarishlar ro'yxati:

### 1. **Kino kodi validatsiyasi (Faqat raqamlar)**
- Endi kino kodi faqat raqamlardan iborat bo'lishi kerak
- Prisma schema da `code` maydoni `String` dan `Int` ga o'zgartirildi
- Admin kino yuklaganda matn kiritsa, xatolik xabari ko'rsatiladi

### 2. **Kod band bo'lsa eng yaqin kodlarni taklif qilish**
- Agar admin kiritgan kod band bo'lsa, tizim avtomatik eng yaqin 5 ta bo'sh kodni taklif qiladi
- `MovieService` da `findNearestAvailableCodes()` funksiyasi qo'shildi

### 3. **Kino yuklash jarayoni o'zgartirildi**
- Yangi tartib:
  1. Kod kiriting (faqat raqamlar)
  2. Rasm yuboring
  3. Kino nomini kiriting
  4. Yilini kiriting (yoki "Next")
  5. Janrni kiriting (yoki "Next")
  6. Tavsif kiriting (yoki "Next")
  7. Fieldni tanlang
  8. **Video yuboring** (oldingi versiyada to'lov summasi so'ralardi)

### 4. **Next bosish imkoniyati**
- Yil, janr, va tavsif maydonlarida "Next" tugmasi orqali o'tkazib yuborish mumkin
- Majburiy maydonlar: kod, rasm, nom, field, video

### 5. **Rasm va ma'lumotlarni field kanallariga yuborish**
- Kino rasmi + ma'lumotlari (nom, yil, janr, tavsif) tanlangan field kanaliga yuboriladi
- Kanal xabarida bot linkiga o'tish tugmasi mavjud

### 6. **Videoni barcha database kanallariga yuborish**
- Video barcha database kanallariga yuboriladi
- Har bir kanal uchun message ID saqlanadi
- JSON formatda `videoMessageId` maydonida saqlanadi:
  ```json
  [
    {"channelId": "-1001234567890", "messageId": 123},
    {"channelId": "-1009876543210", "messageId": 456}
  ]
  ```

### 7. **User kinoni olish jarayoni yangilandi**
- User kino kodini kiritganda, bot database kanallardan videoni forward qiladi
- Agar birinchi database kanal ishlamasa, boshqalarini sinab ko'radi
- Fallback: field kanalidan forward qilish
- Final fallback: file_id orqali yuborish

## Migratsiya

Database migratsiyasini qo'llash uchun:

```bash
# Docker container ichida yoki server da:
npx prisma migrate deploy

# Yoki development muhitda:
npx prisma migrate dev
```

Migration fayli: `prisma/migrations/20251221_change_code_to_int/migration.sql`

## Texnik detallar

### O'zgargan fayllar:
1. `prisma/schema.prisma` - `Movie` va `Serial` modellarida `code` maydoni `Int` ga o'zgartirildi
2. `src/modules/content/services/movie.service.ts` - Yangi metodlar qo'shildi
3. `src/modules/admin/admin.handler.ts` - Kino yuklash jarayoni to'liq qayta yozildi
4. `src/modules/user/user.handler.ts` - Video yuborish logikasi yangilandi
5. `src/modules/content/services/serial.service.ts` - Code type o'zgarishi uchun yangilandi
6. `src/modules/content/utils/code-generator.service.ts` - Integer code bilan ishlash uchun tuzatildi
7. `src/modules/content/interfaces/content-data.interface.ts` - Interface yangilandi

### Yangi funksiyalar:
- `MovieService.isCodeAvailable(code: number)` - Kod bo'sh yoki band ekanligini tekshiradi
- `MovieService.findNearestAvailableCodes(requestedCode: number, count: number)` - Eng yaqin bo'sh kodlarni topadi

## Testlash

Botni test qilish uchun:

1. Database va barcha kanallarni ishga tushiring
2. Botni barcha kanallarga admin qiling
3. Admin sifatida:
   - "🎬 Kino yuklash" tugmasini bosing
   - Raqamli kodni kiriting (masalan: 12345)
   - Rasmni yuboring
   - Ma'lumotlarni kiriting (Next bosish ham mumkin)
   - Fieldni tanlang
   - Videoni yuboring

4. User sifatida:
   - Botga kino kodini yuboring yoki deep link orqali kiring
   - Video database kanallardan forward qilinishi kerak

## Eslatma

Eski ma'lumotlar (String code lari) migration paytida avtomatik Integer ga o'zgartiriladi. Agar code raqamga aylantirib bo'lmasa, code ning hash qiymati ishlatiladi.
