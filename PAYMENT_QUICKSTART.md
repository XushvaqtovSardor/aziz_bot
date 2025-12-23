# Payment & Premium Integration - Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### 1. Install Dependencies
Already installed with your project. ConfigModule is required for environment variables.

### 2. Configure Environment Variables
Add to your `.env` file:

```env
# Payme Configuration
PAYME_MERCHANT_ID=your_merchant_id
PAYME_MERCHANT_KEY=your_merchant_key
PAYME_MERCHANT_SERVICE_ID=your_service_id

# API URL
API_URL=http://localhost:3000
```

### 3. Run Database Migration
```bash
npx prisma migrate dev --name add_payment_premium_integration
```

### 4. Start Your Bot
```bash
npm run start:dev
```

## 🎯 Testing the Integration

### Step 1: Test Premium Command
1. Open Telegram
2. Send `/premium` to your bot
3. You should see pricing information

### Step 2: Test Online Payment
1. Send `/buy_premium`
2. Select a duration (e.g., "1 oy")
3. Bot will create payment and send Payme link
4. Click "✅ To'lovni tekshirish" to check status

### Step 3: Test Payment Webhook (Development)
```bash
# Test successful payment
curl -X POST http://localhost:3000/payment/webhook/test \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": 1,
    "status": "success"
  }'
```

### Step 4: Check Premium Status
1. Send any command to bot
2. If payment was successful, user should have premium
3. Check with:
```bash
curl http://localhost:3000/payment/premium-status/YOUR_TELEGRAM_ID
```

## 📝 Using Premium Guard

### Protect Any Handler
```typescript
import { PremiumRequired } from './modules/payment/decorators/premium.decorator';

@PremiumRequired()
@Hears('Premium Feature')
async premiumFeature(@Ctx() ctx: Context) {
  // Only premium users will reach here
  await ctx.reply('Welcome premium user!');
}
```

### Manual Check
```typescript
const hasPremium = await this.paymentService.checkPremiumStatus(telegramId);
if (!hasPremium) {
  await ctx.reply('❌ Premium required');
  return;
}
```

## 🔧 Configuration Options

### Premium Prices
Update in database via admin panel or directly:
```sql
UPDATE "PremiumSettings" SET 
  "monthlyPrice" = 50000,
  "threeMonthPrice" = 140000,
  "sixMonthPrice" = 270000,
  "yearlyPrice" = 500000
WHERE id = 1;
```

### Change Default Duration
Default is 30 days. To change:
```typescript
const payment = await this.paymentService.createOnlinePayment({
  telegramId: user.telegramId,
  amount: 50000,
  duration: 90, // 3 months
});
```

## 🌐 Production Deployment

### 1. Setup Payme Merchant Account
1. Register at https://merchant.paycom.uz
2. Create merchant account
3. Get credentials (merchant_id, merchant_key)

### 2. Configure Webhook
In Payme merchant panel:
- Webhook URL: `https://your-domain.com/payment/webhook/payme`
- Add your server IP to whitelist

### 3. Update Environment Variables
```env
API_URL=https://your-domain.com
PAYME_MERCHANT_ID=real_merchant_id
PAYME_MERCHANT_KEY=real_merchant_key
```

### 4. Test Production Webhook
```bash
# Payme will send webhooks to this URL
# Test it's accessible:
curl https://your-domain.com/payment/webhook/payme
```

## 📊 Monitoring

### Check Payment Status
```bash
curl http://localhost:3000/payment/status/1
```

### Check User Premium
```bash
curl http://localhost:3000/payment/premium-status/123456789
```

### View Payment History
```bash
curl http://localhost:3000/payment/history/123456789
```

## 🐛 Troubleshooting

### Problem: Payment not processing
**Solution:**
1. Check logs: `tail -f logs/app.log`
2. Verify webhook URL is accessible
3. Check payment status in database

### Problem: User not getting premium
**Solution:**
1. Check payment status: `SELECT * FROM "Payment" WHERE id = ?`
2. Check user premium fields: `SELECT "isPremium", "premiumTill" FROM "User" WHERE "telegramId" = ?`
3. Manual activation:
```sql
UPDATE "User" SET 
  "isPremium" = true,
  "premiumTill" = NOW() + INTERVAL '30 days'
WHERE "telegramId" = '123456789';
```

### Problem: Webhook signature verification fails
**Solution:**
1. Check `PAYME_MERCHANT_ID` in `.env`
2. Verify Authorization header format: `Basic base64(merchant_id:password)`

### Problem: Bot not sending payment link
**Solution:**
1. Check `API_URL` in `.env`
2. Verify bot can reach API: `curl $API_URL/payment/create`
3. Check bot logs for errors

## 🔒 Security Checklist

- ✅ Webhook signature verification enabled
- ✅ HTTPS for production webhook URL
- ✅ Environment variables secured
- ✅ Database migrations applied
- ✅ Payment status validation (prevents double processing)
- ✅ Transaction ID tracking

## 📚 Additional Resources

- [Full Documentation](./PAYMENT_INTEGRATION.md)
- [Usage Examples](./src/modules/payment/examples/premium-usage-examples.ts)
- [Postman Collection](./postman/payment-api.postman_collection.json)
- [Environment Variables Example](./.env.payment.example)

## 💡 Tips

1. **Test in development first**: Use `/payment/webhook/test` endpoint
2. **Monitor logs**: Watch for payment processing events
3. **Check expiration**: Premium automatically expires after `premiumTill`
4. **Use guards**: Protect premium features with `@PremiumRequired()`
5. **Notify users**: Bot automatically sends success messages

## 🎉 You're Ready!

Your payment and premium integration is now complete. Users can:
- ✅ View premium information with `/premium`
- ✅ Buy premium with `/buy_premium`
- ✅ Pay via Payme online
- ✅ Receive automatic premium activation
- ✅ Access premium features

Need help? Check the [full documentation](./PAYMENT_INTEGRATION.md) or [examples](./src/modules/payment/examples/premium-usage-examples.ts).
