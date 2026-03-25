const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Safaricom Daraja API configuration (placeholder)
const SAFARICOM_CONFIG = {
  consumerKey: process.env.SAFARICOM_CONSUMER_KEY || 'your_consumer_key',
  consumerSecret: process.env.SAFARICOM_CONSUMER_SECRET || 'your_consumer_secret',
  baseUrl: 'https://sandbox.safaricom.co.ke',
  callbackUrl: 'http://localhost:5000/api/payment/callback/safaricom',
};

// Airtel Money configuration (placeholder)
const AIRTEL_CONFIG = {
  clientId: process.env.AIRTEL_CLIENT_ID || 'your_client_id',
  clientSecret: process.env.AIRTEL_CLIENT_SECRET || 'your_client_secret',
  baseUrl: 'https://api.sandbox.airtel.africa',
  callbackUrl: 'http://localhost:5000/api/payment/callback/airtel',
};

/**
 * POST /api/payment/initiate-stk
 * Initiates STK push for a bundle purchase
 */
router.post('/initiate-stk', async (req, res) => {
  try {
    const { bundleId, phoneNumber, provider } = req.body;

    // Validate inputs
    if (!bundleId || !phoneNumber || !provider) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!['safaricom', 'airtel'].includes(provider)) {
      return res.status(400).json({ message: 'Invalid provider. Must be safaricom or airtel' });
    }

    // Fetch bundle details
    const bundleResult = await pool.query('SELECT * FROM bundles WHERE id = $1', [bundleId]);
    if (bundleResult.rows.length === 0) {
      return res.status(404).json({ message: 'Bundle not found' });
    }

    const bundle = bundleResult.rows[0];
    const amount = Math.round(bundle.price * 100); // Convert to smallest currency unit

    // Create a pending transaction record
    const transactionResult = await pool.query(
      `INSERT INTO transactions (bundle_id, phone_number, provider, amount, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [bundleId, phoneNumber, provider, amount, 'pending']
    );

    const transactionId = transactionResult.rows[0].id;

    // Initiate STK push based on provider
    let stkResponse;
    if (provider === 'safaricom') {
      stkResponse = await initiateSafaricomSTK(phoneNumber, amount, transactionId);
    } else if (provider === 'airtel') {
      stkResponse = await initiateAirtelSTK(phoneNumber, amount, transactionId);
    }

    res.json({
      success: true,
      message: `STK push sent to ${phoneNumber}. Complete the payment on your phone.`,
      transactionId: transactionId,
    });
  } catch (error) {
    console.error('Error initiating STK:', error);
    res.status(500).json({ message: 'Failed to initiate payment', error: error.message });
  }
});

/**
 * POST /api/payment/callback/safaricom
 * Handles Safaricom payment callback
 */
router.post('/callback/safaricom', async (req, res) => {
  try {
    const { Body } = req.body;
    const result = Body.stkCallback;

    const transactionId = result.CheckoutRequestID;
    const resultCode = result.ResultCode;
    const resultDesc = result.ResultDesc;

    // Update transaction status
    if (resultCode === 0) {
      // Payment successful
      const mpesaReceiptNumber = result.CallbackMetadata?.Item?.[1]?.Value;
      
      // Get transaction details
      const transactionResult = await pool.query(
        'SELECT * FROM transactions WHERE id = $1',
        [transactionId]
      );
      
      if (transactionResult.rows.length > 0) {
        const transaction = transactionResult.rows[0];
        
        // Create user session
        await createUserSession(transaction.phone_number, transaction.bundle_id);
        
        // Update transaction as successful
        await pool.query(
          'UPDATE transactions SET status = $1, mpesa_receipt = $2 WHERE id = $3',
          ['success', mpesaReceiptNumber, transactionId]
        );
      }
    } else {
      // Payment failed
      await pool.query(
        'UPDATE transactions SET status = $1 WHERE id = $2',
        ['failed', transactionId]
      );
    }

    res.json({ ResponseCode: '00000' });
  } catch (error) {
    console.error('Error handling Safaricom callback:', error);
    res.status(500).json({ message: 'Callback processing failed' });
  }
});

/**
 * POST /api/payment/callback/airtel
 * Handles Airtel payment callback
 */
router.post('/callback/airtel', async (req, res) => {
  try {
    const { id, status, reference } = req.body;

    if (status === 'Success') {
      const transactionResult = await pool.query(
        'SELECT * FROM transactions WHERE id = $1',
        [id]
      );

      if (transactionResult.rows.length > 0) {
        const transaction = transactionResult.rows[0];
        
        // Create user session
        await createUserSession(transaction.phone_number, transaction.bundle_id);
        
        // Update transaction
        await pool.query(
          'UPDATE transactions SET status = $1, airtel_reference = $2 WHERE id = $3',
          ['success', reference, id]
        );
      }
    } else {
      await pool.query('UPDATE transactions SET status = $1 WHERE id = $2', ['failed', id]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error handling Airtel callback:', error);
    res.status(500).json({ message: 'Callback processing failed' });
  }
});

/**
 * Helper: Initiate Safaricom STK Push
 */
async function initiateSafaricomSTK(phoneNumber, amount, transactionId) {
  // TODO: Implement Safaricom Daraja API integration
  // Get access token, generate password & timestamp, then call STK push endpoint
  
  console.log(`[DEMO] Safaricom STK Push initiated for ${phoneNumber}, amount: ${amount}`);
  console.log(`Transaction ID: ${transactionId}`);
  
  return { success: true };
}

/**
 * Helper: Initiate Airtel STK Push
 */
async function initiateAirtelSTK(phoneNumber, amount, transactionId) {
  // TODO: Implement Airtel Money API integration
  // Use Airtel API to initiate STK push
  
  console.log(`[DEMO] Airtel STK Push initiated for ${phoneNumber}, amount: ${amount}`);
  console.log(`Transaction ID: ${transactionId}`);
  
  return { success: true };
}

/**
 * Helper: Create user session after successful payment
 */
async function createUserSession(phoneNumber, bundleId) {
  try {
    // Check if user exists
    let userResult = await pool.query(
      'SELECT id FROM users WHERE pppoe_username = $1',
      [phoneNumber]
    );

    let userId;
    if (userResult.rows.length === 0) {
      // Create new user
      const newUserResult = await pool.query(
        `INSERT INTO users (username, email, password, pppoe_username, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          phoneNumber,
          `${phoneNumber}@bundles.local`,
          'temp_password', // Will be replaced with MAC address on device
          phoneNumber,
          'active',
        ]
      );
      userId = newUserResult.rows[0].id;
    } else {
      userId = userResult.rows[0].id;
    }

    // Get bundle details
    const bundleResult = await pool.query('SELECT * FROM bundles WHERE id = $1', [bundleId]);
    const bundle = bundleResult.rows[0];

    // Create session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + bundle.duration_days);

    await pool.query(
      `INSERT INTO sessions (user_id, bundle_id, expires_at, status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, status) DO UPDATE SET bundle_id = $2, expires_at = $3`,
      [userId, bundleId, expiresAt, 'active']
    );

    console.log(`Session created for user ${userId} on bundle ${bundleId}`);
  } catch (error) {
    console.error('Error creating user session:', error);
  }
}

module.exports = router;
