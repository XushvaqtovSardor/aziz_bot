# Payment & Premium Integration - Documentation

## Overview
Complete payment and premium integration system for Telegram bot with Payme support.

## Features Implemented

### ✅ 1. Database Schema Updates
- Added `premiumTill` field to User model
- Enhanced Payment model with:
  - `provider` field (default: 'payme')
  - `transactionId` field for payment tracking
  - `SUCCESS` and `FAILED` status options
  - Made `receiptFileId` and `duration` optional

### ✅ 2. Payment Service
**Location:** `src/modules/payment/services/payment.service.ts`

**New Methods:**
- `createOnlinePayment()` - Create payment for online providers
- `processSuccessfulPayment()` - Process successful payment from webhook
- `markPaymentFailed()` - Mark payment as failed
- `checkPremiumStatus()` - Check if user has active premium
- `getPaymentHistory()` - Get user's payment history
- `getPaymentById()` - Get payment by ID
- `updateTransactionId()` - Update payment transaction ID

### ✅ 3. Payme Integration Service
**Location:** `src/modules/payment/services/payme.service.ts`

**Features:**
- Generate payment links
- Handle Payme webhooks
- Verify webhook signatures
- Process transactions (CheckPerformTransaction, CreateTransaction, PerformTransaction, CancelTransaction)

**Configuration Required:**
```env
PAYME_MERCHANT_ID=your_merchant_id
PAYME_MERCHANT_KEY=your_merchant_key
PAYME_MERCHANT_SERVICE_ID=your_service_id
```

### ✅ 4. Payment Controller
**Location:** `src/modules/payment/payment.controller.ts`

**Endpoints:**

#### POST /payment/create
Create payment and get payment link
```json
{
  "telegramId": "123456789",
  "amount": 50000,
  "duration": 30
}
```

Response:
```json
{
  "success": true,
  "paymentId": 1,
  "paymentLink": "https://checkout.paycom.uz/...",
  "amount": 50000,
  "duration": 30
}
```

#### POST /payment/webhook/payme
Payme webhook handler (configured in Payme merchant panel)

#### POST /payment/webhook/test
Test webhook endpoint for development
```json
{
  "paymentId": 1,
  "status": "success"
}
```

#### GET /payment/status/:paymentId
Check payment status

#### GET /payment/premium-status/:telegramId
Check user's premium status

#### GET /payment/history/:telegramId
Get user's payment history

### ✅ 5. Premium Guard
**Location:** `src/modules/payment/guards/premium.guard.ts`

**Usage Example:**
```typescript
@PremiumRequired()
@Hears('Premium Feature')
async premiumFeature(@Ctx() ctx: Context) {
  // This will only execute if user has active premium
}
```

**Decorator Location:** `src/modules/payment/decorators/premium.decorator.ts`

### ✅ 6. Bot Commands

#### /premium
Display premium information and pricing

#### /buy_premium
Start online payment process with Payme
- Shows pricing options (1 month, 3 months, 6 months, 1 year)
- Generates payment link
- Provides payment status check button

#### Payment Flow:
1. User clicks `/buy_premium`
2. Bot shows pricing options
3. User selects duration
4. Bot creates payment and sends Payme link
5. User completes payment on Payme
6. Payme sends webhook to backend
7. Backend processes payment and activates premium
8. Bot sends success notification to user

### ✅ 7. Payment Module Updates
**Location:** `src/modules/payment/payment.module.ts`

- Added PaymeService
- Added PaymentController
- Added PremiumGuard
- Exported all services and guards

## Usage Examples

### 1. Check Premium Status in Handler
```typescript
const hasPremium = await this.paymentService.checkPremiumStatus(telegramId);
if (!hasPremium) {
  await ctx.reply('❌ Bu funksiya faqat Premium foydalanuvchilar uchun');
  return;
}
```

### 2. Use Premium Guard
```typescript
@PremiumRequired()
@Hears('Watch HD')
async watchHD(@Ctx() ctx: Context) {
  // Premium users only
}
```

### 3. Create Payment Programmatically
```typescript
const payment = await this.paymentService.createOnlinePayment({
  telegramId: '123456789',
  amount: 50000,
  duration: 30,
  provider: 'payme',
});

const link = this.paymeService.generatePaymentLink(payment.id, payment.amount);
```

## Configuration

### Environment Variables
Add to `.env`:
```env
# Payme Configuration
PAYME_MERCHANT_ID=your_merchant_id
PAYME_MERCHANT_KEY=your_merchant_key
PAYME_MERCHANT_SERVICE_ID=your_service_id

# API URL for bot to call payment endpoints
API_URL=http://localhost:3000
```

### Payme Merchant Panel Setup
1. Register at https://merchant.paycom.uz
2. Get your merchant credentials
3. Configure webhook URL: `https://your-domain.com/payment/webhook/payme`
4. Add your IP to whitelist

## Testing

### Test Webhook (Development)
```bash
curl -X POST http://localhost:3000/payment/webhook/test \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": 1,
    "status": "success"
  }'
```

### Test Payment Creation
```bash
curl -X POST http://localhost:3000/payment/create \
  -H "Content-Type: application/json" \
  -d '{
    "telegramId": "123456789",
    "amount": 50000,
    "duration": 30
  }'
```

## Database Migration

Run migration to apply schema changes:
```bash
npx prisma migrate dev --name add_payment_premium_integration
```

Or generate migration only:
```bash
npx prisma migrate dev
```

## Security Considerations

1. **Webhook Verification**: Payme webhooks are verified using Basic Auth
2. **Transaction ID Tracking**: Each payment has unique transaction ID
3. **Status Validation**: Payments can't be processed twice
4. **Premium Expiration**: Automatically checked on each request

## Notification System

When payment is successful:
1. Payment status changes to SUCCESS
2. User's `isPremium` set to `true`
3. User's `premiumTill` set to current date + duration
4. Telegram notification sent: "✅ To'lov qabul qilindi! 🎉 Premium faollashtirildi"

## Error Handling

All services include:
- Comprehensive logging
- Error catching and reporting
- User-friendly error messages
- Transaction rollback on failures

## Next Steps (Optional Enhancements)

1. **Add Click Integration**: Similar to Payme service
2. **Stripe Integration**: For international payments
3. **Payment Analytics Dashboard**: Track payment statistics
4. **Subscription Auto-renewal**: Automatic premium renewal
5. **Payment Notifications**: Email/SMS confirmations
6. **Refund System**: Handle payment refunds
7. **Promo Codes**: Discount code system
8. **Payment History UI**: User-facing payment history

## Support & Troubleshooting

### Common Issues

**Issue**: Payment not processing
- Check webhook URL is accessible
- Verify merchant credentials
- Check logs for errors

**Issue**: Premium not activating
- Check payment status in database
- Verify webhook was received
- Check user's `premiumTill` field

**Issue**: Double payment processing
- System prevents this with status check
- Transaction ID ensures uniqueness

## File Structure
```
src/modules/payment/
├── payment.module.ts           # Module configuration
├── payment.controller.ts       # API endpoints
├── decorators/
│   └── premium.decorator.ts    # @PremiumRequired decorator
├── guards/
│   └── premium.guard.ts        # Premium access guard
└── services/
    ├── payment.service.ts      # Payment logic
    ├── premium.service.ts      # Premium settings
    └── payme.service.ts        # Payme integration

src/modules/user/
└── user.handler.ts             # Bot commands (/premium, /buy_premium)

prisma/
└── schema.prisma               # Database schema
```

## License
MIT
