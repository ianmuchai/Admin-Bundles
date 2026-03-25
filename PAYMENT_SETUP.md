# Payment System Setup Guide

## Overview
This system integrates STK push payments through Safaricom M-Pesa and Airtel Money. Users select a bundle, enter their phone number, and receive an STK push to complete payment.

---

## Quick Start

### 1. Initialize Transactions Table
Run this once to create the transactions table in your database:

```powershell
cd backend
node initTransactionsTable.js
```

You should see: `✓ Transactions table created successfully`

### 2. Update Environment Variables
Add these to your `backend/.env` file:

```env
# Safaricom Daraja API (get from https://developer.safaricom.co.ke/)
SAFARICOM_CONSUMER_KEY=your_consumer_key
SAFARICOM_CONSUMER_SECRET=your_consumer_secret

# Airtel Money API (get from https://developers.airtel.africa/)
AIRTEL_CLIENT_ID=your_client_id
AIRTEL_CLIENT_SECRET=your_client_secret
```

### 3. Start Backend & Frontend
```powershell
# Terminal 1: Backend
cd backend
node app.js

# Terminal 2: Frontend
cd frontend
npm start
```

### 4. Test Payment Flow
- Open `http://localhost:3000`
- Click "Buy" on any bundle
- Enter a test phone number (07XXXXXXXX)
- Select provider (Safaricom/Airtel)
- Click "Send STK Push"

---

## Architecture

### Frontend Flow
1. User browses bundles (compact row layout)
2. Click "Buy" → Modal opens with:
   - Bundle preview (name & price)
   - Phone number input
   - Provider selector (Safaricom/Airtel)
3. Click "Send STK Push" → Calls backend API
4. Backend sends STK to user's phone
5. User completes payment on their device

### Backend Flow
1. **POST /api/payment/initiate-stk** receives:
   ```json
   {
     "bundleId": 1,
     "phoneNumber": "254702123456",
     "provider": "safaricom"
   }
   ```

2. Creates a **transaction record** in database with status `pending`

3. Initiates STK push via:
   - **Safaricom**: Daraja API M-Pesa STK Push
   - **Airtel**: Airtel Money API

4. Returns success message to frontend

5. **Callbacks** (Safaricom & Airtel) update transaction status and create user session

### Session Management
Once payment is confirmed:
- User record created (if new) with phone as PPPoE username
- Session created linking user → bundle → expiry date
- MAC address used for device authentication on the network

---

## API Integration (TODO)

### Safaricom Setup
Replace placeholder in `paymentRoutes.js`:
```javascript
async function initiateSafaricomSTK(phoneNumber, amount, transactionId) {
  // 1. Get access token using consumer key/secret
  // 2. Generate password & timestamp
  // 3. Call M-Pesa STK Push endpoint with:
  //    - Phone number (formatted: 254702123456)
  //    - Amount
  //    - Business code
  //    - Callback URL (/api/payment/callback/safaricom)
  // 4. Return response
}
```

**Safaricom Daraja Docs**: https://developer.safaricom.co.ke/apis

### Airtel Setup
Replace placeholder in `paymentRoutes.js`:
```javascript
async function initiateAirtelSTK(phoneNumber, amount, transactionId) {
  // 1. Get access token using client ID/secret
  // 2. Call Airtel Money API with:
  //    - Phone number
  //    - Amount
  //    - Callback URL (/api/payment/callback/airtel)
  // 3. Return response
}
```

**Airtel Money API Docs**: https://developers.airtel.africa/

---

## Database Schema

### transactions table
| Column | Type | Purpose |
|--------|------|---------|
| id | SERIAL | Unique transaction ID |
| bundle_id | INT | Which bundle was purchased |
| phone_number | VARCHAR(20) | Customer's phone |
| provider | VARCHAR(20) | 'safaricom' or 'airtel' |
| amount | DECIMAL | Payment amount |
| status | VARCHAR(20) | 'pending', 'success', 'failed' |
| mpesa_receipt | VARCHAR(100) | M-Pesa receipt (if Safaricom) |
| airtel_reference | VARCHAR(100) | Airtel reference (if Airtel) |
| created_at | TIMESTAMP | When initiated |
| updated_at | TIMESTAMP | Last update |

---

## Frontend Components

### App.js
- Fetches bundles from `/api/bundles`
- Manages payment modal state
- Integrates with payment API

### App.css
- Glossy, animated dark purple design
- Compact row-based bundle display
- Modern modal UI with provider selection
- Smooth transitions & hover effects

---

## Security Notes

1. **MAC Address Extraction**:
   - In captive portal: Extract from DHCP/ARP tables on the router
   - In backend: Can get from request headers if configured
   - Used alongside JWT tokens for session validation

2. **STK Security**:
   - All transactions logged in DB
   - Payment callbacks verified via provider signatures
   - Session tokens expire after bundle duration

3. **Future Improvements**:
   - Add SMS confirmation codes
   - Implement rate limiting on STK requests
   - Add transaction receipt generation
   - Email notifications on successful payment

---

## Testing Checklist

- [ ] Frontend loads and displays bundles
- [ ] Modal opens on "Buy" button click
- [ ] Phone number validation works
- [ ] Provider selection toggles correctly
- [ ] API call to `/api/payment/initiate-stk` succeeds
- [ ] Backend creates transaction record
- [ ] Transaction status updates on payment callback
- [ ] User session created after successful payment
- [ ] MAC address used for authentication

---

## Troubleshooting

**"Failed to load bundles"**
- Backend not running on port 5000
- Check backend logs for errors

**"Payment initiation failed"**
- Invalid phone number format
- Bundle doesn't exist
- Check backend logs for API errors

**"Callback not received"**
- Verify callback URLs in Safaricom/Airtel dashboards
- Check if ngrok or tunnel is needed for local testing
- Monitor backend logs for incoming callbacks

---

## Next Steps

1. ✅ Frontend payment modal complete
2. ✅ Backend payment routes created
3. ⏳ **TODO**: Integrate Safaricom Daraja API
4. ⏳ **TODO**: Integrate Airtel Money API
5. ⏳ **TODO**: Test with real M-Pesa/Airtel accounts
6. ⏳ **TODO**: Add MAC address extraction
7. ⏳ **TODO**: Deploy to production
