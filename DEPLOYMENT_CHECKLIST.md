# Payment & Premium Integration - Deployment Checklist

## 📋 Pre-Deployment Checklist

### ✅ Development Setup
- [ ] All files created and saved
- [ ] Environment variables configured in `.env`
- [ ] Database migration executed
- [ ] Services tested locally
- [ ] Bot commands tested in Telegram
- [ ] Test webhook endpoint works

### ✅ Payme Configuration
- [ ] Registered at merchant.paycom.uz
- [ ] Merchant ID obtained
- [ ] Merchant Key obtained
- [ ] Service ID obtained (if applicable)
- [ ] Business verified
- [ ] Bank account linked

### ✅ Environment Variables
```env
✅ PAYME_MERCHANT_ID=your_merchant_id
✅ PAYME_MERCHANT_KEY=your_merchant_key
✅ PAYME_MERCHANT_SERVICE_ID=your_service_id
✅ API_URL=https://your-domain.com
```

### ✅ Database
- [ ] Migration applied: `npx prisma migrate deploy`
- [ ] PremiumSettings table populated
- [ ] Test payment created and verified
- [ ] Database backup configured

### ✅ API Testing
- [ ] POST /payment/create ✅
- [ ] GET /payment/status/:id ✅
- [ ] GET /payment/premium-status/:telegramId ✅
- [ ] POST /payment/webhook/test ✅
- [ ] All endpoints return correct responses

### ✅ Bot Testing
- [ ] /premium command works ✅
- [ ] /buy_premium command works ✅
- [ ] Duration selection buttons work ✅
- [ ] Payment link generated ✅
- [ ] Payment status check works ✅
- [ ] Premium status displayed correctly ✅

## 🚀 Production Deployment

### Step 1: Server Setup
```bash
# 1. Update environment variables
cp .env.example .env
nano .env  # Add production values

# 2. Install dependencies
npm install --production

# 3. Build application
npm run build

# 4. Run migrations
npx prisma migrate deploy

# 5. Generate Prisma client
npx prisma generate
```

### Step 2: SSL/HTTPS Setup
- [ ] Domain configured
- [ ] SSL certificate installed
- [ ] HTTPS enabled
- [ ] Webhook URL accessible via HTTPS
- [ ] Test: `curl https://your-domain.com/payment/webhook/payme`

### Step 3: Payme Merchant Panel Configuration
- [ ] Login to merchant.paycom.uz
- [ ] Navigate to Settings > Webhooks
- [ ] Set webhook URL: `https://your-domain.com/payment/webhook/payme`
- [ ] Add server IP to whitelist
- [ ] Test connection
- [ ] Save configuration

### Step 4: Firewall & Security
- [ ] Open port 443 (HTTPS)
- [ ] Open port 80 (HTTP redirect)
- [ ] Configure firewall rules
- [ ] Whitelist Payme IPs
- [ ] Enable rate limiting
- [ ] Configure CORS if needed

### Step 5: Monitoring Setup
```bash
# 1. Setup logging
# Logs location: logs/

# 2. Monitor payment processing
tail -f logs/app.log | grep "Payment"

# 3. Monitor webhooks
tail -f logs/app.log | grep "webhook"

# 4. Monitor errors
tail -f logs/error.log
```

### Step 6: Test Production Flow
1. **Create Test Payment**
```bash
curl -X POST https://your-domain.com/payment/create \
  -H "Content-Type: application/json" \
  -d '{
    "telegramId": "YOUR_TELEGRAM_ID",
    "amount": 1000,
    "duration": 1
  }'
```

2. **Open Payment Link**
   - Copy paymentLink from response
   - Open in browser
   - Complete test payment

3. **Verify Webhook Received**
```bash
# Check logs for webhook
grep "Payme webhook" logs/app.log
```

4. **Verify Premium Activated**
```bash
curl https://your-domain.com/payment/premium-status/YOUR_TELEGRAM_ID
```

5. **Test in Bot**
   - Send /premium to bot
   - Should show premium is active

## 🔍 Post-Deployment Verification

### Functional Tests
- [ ] Create payment via bot ✅
- [ ] Payment link opens correctly ✅
- [ ] Payme payment page loads ✅
- [ ] Test payment completes ✅
- [ ] Webhook received ✅
- [ ] Payment status updates ✅
- [ ] Premium activates ✅
- [ ] Bot sends notification ✅
- [ ] Premium features accessible ✅

### Security Tests
- [ ] Webhook signature verified ✅
- [ ] Invalid webhooks rejected ✅
- [ ] Double payments prevented ✅
- [ ] Premium expiration works ✅
- [ ] Unauthorized access denied ✅

### Performance Tests
- [ ] API response time < 500ms ✅
- [ ] Database queries optimized ✅
- [ ] Webhook processing < 2s ✅
- [ ] Bot responses instant ✅

## 📊 Monitoring Checklist

### Daily Monitoring
- [ ] Check payment success rate
- [ ] Monitor webhook failures
- [ ] Review error logs
- [ ] Check premium activations
- [ ] Verify no duplicate payments

### Weekly Monitoring
- [ ] Review payment statistics
- [ ] Analyze failed payments
- [ ] Check premium expirations
- [ ] User feedback review
- [ ] Performance metrics

### Monthly Monitoring
- [ ] Payment provider fees
- [ ] Revenue analytics
- [ ] User conversion rates
- [ ] System optimization
- [ ] Security audit

## 🆘 Emergency Procedures

### If Webhooks Stop Working
1. Check server logs: `tail -f logs/app.log`
2. Verify webhook URL accessible: `curl https://your-domain.com/payment/webhook/payme`
3. Check Payme merchant panel settings
4. Verify server IP not changed
5. Check SSL certificate validity
6. Restart application if needed

### If Payments Not Processing
1. Check payment status in database:
```sql
SELECT * FROM "Payment" WHERE status = 'PENDING' ORDER BY "createdAt" DESC LIMIT 10;
```
2. Manually process if needed:
```sql
UPDATE "Payment" SET status = 'SUCCESS', "processedAt" = NOW() WHERE id = ?;
UPDATE "User" SET "isPremium" = true, "premiumTill" = NOW() + INTERVAL '30 days' WHERE id = ?;
```
3. Notify user manually via bot

### If Premium Not Activating
1. Check payment status
2. Check user premium fields
3. Manually activate:
```bash
curl -X POST https://your-domain.com/payment/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"paymentId": X, "status": "success"}'
```

## 📞 Support Contacts

### Technical Support
- Developer: [Your Contact]
- DevOps: [DevOps Contact]
- Database Admin: [DBA Contact]

### Payment Provider
- Payme Support: +998 78 150 01 11
- Payme Email: support@paycom.uz
- Merchant Panel: https://merchant.paycom.uz

## 🎯 Success Criteria

- ✅ Payments processing successfully
- ✅ Webhooks received and processed
- ✅ Premium activating automatically
- ✅ Users receiving notifications
- ✅ No duplicate payments
- ✅ Premium expiration working
- ✅ Error rate < 1%
- ✅ Response time < 500ms

## 📝 Sign-off

### Development Team
- [ ] Code reviewed
- [ ] Tests passed
- [ ] Documentation complete
- [ ] Signed: ___________ Date: ___________

### QA Team
- [ ] Functional tests passed
- [ ] Security tests passed
- [ ] Performance tests passed
- [ ] Signed: ___________ Date: ___________

### DevOps Team
- [ ] Infrastructure ready
- [ ] Monitoring configured
- [ ] Backups enabled
- [ ] Signed: ___________ Date: ___________

### Product Owner
- [ ] Requirements met
- [ ] User acceptance passed
- [ ] Ready for production
- [ ] Signed: ___________ Date: ___________

---

## 🎉 Deployment Complete!

After all checklists are complete:
1. Mark deployment date in documentation
2. Notify stakeholders
3. Monitor first 24 hours closely
4. Collect user feedback
5. Plan improvements

**Deployment Date**: ___________  
**Deployed By**: ___________  
**Version**: 1.0.0  
**Status**: 🚀 LIVE
