const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const User = require('../models/User');
const { createServiceForSelection } = require('../services/mikrotikService');
const { DarajaService, normalizePhoneNumber, parseDarajaCallbackMetadata } = require('../services/darajaService');
const {
  buildHotspotComment,
  generateHotspotCredentials,
  resolveBundleDurationHours,
  resolveBundleProfile,
} = require('../utils/mikrotikHelpers');

function buildCallbackUrl(req) {
  if (process.env.DARAJA_CALLBACK_URL) {
    return process.env.DARAJA_CALLBACK_URL;
  }

  return `${req.protocol}://${req.get('host')}/api/payment/callback/safaricom`;
}

async function resolveOrCreateGuestUser(phoneNumber) {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  let user = await User.findUserBy('phone_number', normalizedPhone);

  if (!user) {
    user = await User.createUser({
      username: `guest_${normalizedPhone}_${Date.now()}`,
      password: `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      phone_number: normalizedPhone,
      role: 'guest',
      status: 'active',
    });
  }

  return user;
}

async function provisionSuccessfulTransaction(dbClient, transaction, metadata = {}) {
  const bundleResult = await dbClient.query('SELECT * FROM bundles WHERE id = $1', [transaction.bundle_id]);
  if (bundleResult.rows.length === 0) {
    throw new Error(`Bundle ${transaction.bundle_id} not found for transaction provisioning.`);
  }

  const bundle = bundleResult.rows[0];
  const phoneNumber = normalizePhoneNumber(metadata.PhoneNumber || transaction.phone_number);
  const user = transaction.user_id
    ? { id: transaction.user_id }
    : await resolveOrCreateGuestUser(phoneNumber);

  const durationHours = resolveBundleDurationHours(bundle);
  const hotspotProfile = resolveBundleProfile(bundle);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + durationHours);

  const activeSession = await dbClient.query(
    'SELECT id FROM sessions WHERE user_id = $1 AND status = $2',
    [user.id, 'active']
  );

  const sessionStatus = activeSession.rows.length > 0 ? 'queued' : 'active';

  const sessionResult = await dbClient.query(
    `INSERT INTO sessions (user_id, bundle_id, expires_at, status, site_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [user.id, transaction.bundle_id, expiresAt, sessionStatus, transaction.site_id || null]
  );

  const session = sessionResult.rows[0];

  if (sessionStatus !== 'active') {
    await dbClient.query(
      `UPDATE transactions
       SET session_id = $1,
           user_id = COALESCE(user_id, $2),
           status = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [session.id, user.id, 'paid_pending_activation', transaction.id]
    );

    return {
      session,
      sessionStatus,
      hotspotProfile,
      hotspotUsername: null,
      hotspotPassword: null,
    };
  }

  const mikrotik = await createServiceForSelection({
    siteId: transaction.site_id || null,
    siteKey: transaction.site_key || null,
  });
  const { username: hotspotUsername, password: hotspotPassword } =
    generateHotspotCredentials(phoneNumber, session.id);

  await mikrotik.createHotspotUser({
    username: hotspotUsername,
    password: hotspotPassword,
    profile: hotspotProfile,
    limitUptime: `${durationHours}h`,
    comment: buildHotspotComment({
      phoneNumber,
      bundleName: bundle.name,
      expiresAt,
      sessionId: session.id,
    }),
  });

  await dbClient.query(
    `UPDATE sessions
     SET mikrotik_username = $1,
         mikrotik_password = $2,
         provisioning_error = NULL
     WHERE id = $3`,
    [hotspotUsername, hotspotPassword, session.id]
  );

  await dbClient.query(
    `UPDATE transactions
     SET session_id = $1,
         user_id = COALESCE(user_id, $2),
         status = $3,
         updated_at = NOW()
     WHERE id = $4`,
    [session.id, user.id, 'success', transaction.id]
  );

  return {
    session,
    sessionStatus,
    hotspotProfile,
    hotspotUsername,
    hotspotPassword,
  };
}

router.post('/initiate-stk', async (req, res) => {
  const dbClient = await pool.connect();

  try {
    const bundleId = req.body.bundle_id || req.body.bundleId;
    const phoneNumber = req.body.phone_number || req.body.phoneNumber;
    const siteId = req.body.site_id || req.body.siteId || null;

    if (!bundleId || !phoneNumber) {
      return res.status(400).json({ message: 'bundle_id and phone_number are required.' });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      return res.status(400).json({ message: 'A valid phone number is required.' });
    }

    const bundleResult = await dbClient.query('SELECT * FROM bundles WHERE id = $1', [bundleId]);
    if (bundleResult.rows.length === 0) {
      return res.status(404).json({ message: 'Bundle not found.' });
    }

    const bundle = bundleResult.rows[0];
    const amount = Number(bundle.price);
    const externalReference = `BND${bundleId}-${Date.now()}`;
    const transactionDesc = req.body.transaction_desc || req.body.transactionDesc || bundle.name || 'Internet bundle';
    const accountReference = req.body.account_reference || req.body.accountReference || `bundle-${bundleId}`;

    const userId = req.user?.id || null;

    await dbClient.query('BEGIN');

    const transactionResult = await dbClient.query(
      `INSERT INTO transactions (
         bundle_id, user_id, site_id, phone_number, provider, amount, status, external_reference, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [bundleId, userId, siteId, normalizedPhone, 'safaricom', amount, 'pending', externalReference]
    );

    const transaction = transactionResult.rows[0];

    const daraja = new DarajaService({
      callbackUrl: buildCallbackUrl(req),
    });

    const stkResult = await daraja.initiateStkPush({
      phoneNumber: normalizedPhone,
      amount,
      accountReference,
      transactionDesc,
    });

    await dbClient.query(
      `UPDATE transactions
       SET merchant_request_id = $1,
           checkout_request_id = $2,
           status = $3,
           raw_request = $4,
           result_desc = $5,
           updated_at = NOW()
       WHERE id = $6`,
      [
        stkResult.response.MerchantRequestID || null,
        stkResult.response.CheckoutRequestID || null,
        'processing',
        JSON.stringify({
          request: stkResult.request,
          response: stkResult.response,
        }),
        stkResult.response.CustomerMessage || stkResult.response.ResponseDescription || null,
        transaction.id,
      ]
    );

    await dbClient.query('COMMIT');

    res.status(201).json({
      success: true,
      message: stkResult.response.CustomerMessage || 'STK push sent successfully.',
      transaction_id: transaction.id,
      checkout_request_id: stkResult.response.CheckoutRequestID,
      merchant_request_id: stkResult.response.MerchantRequestID,
      status: 'processing',
    });
  } catch (error) {
    await dbClient.query('ROLLBACK');
    console.error('Daraja STK initiation failed:', error.message);
    res.status(500).json({ message: error.message || 'Failed to initiate STK push.' });
  } finally {
    dbClient.release();
  }
});

router.get('/status/:transactionId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, bundle_id, user_id, site_id, phone_number, provider, amount, status,
              external_reference, merchant_request_id, checkout_request_id, provider_receipt,
              result_code, result_desc, paid_at, session_id, created_at, updated_at
       FROM transactions
       WHERE id = $1`,
      [req.params.transactionId]
    );

    if (!rows[0]) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/callback/safaricom', async (req, res) => {
  const dbClient = await pool.connect();

  try {
    const callback = req.body?.Body?.stkCallback;
    if (!callback) {
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Ignored' });
    }

    const checkoutRequestId = callback.CheckoutRequestID;
    const merchantRequestId = callback.MerchantRequestID;
    const metadata = parseDarajaCallbackMetadata(callback.CallbackMetadata?.Item || []);

    await dbClient.query('BEGIN');

    const transactionResult = await dbClient.query(
      `SELECT * FROM transactions
       WHERE checkout_request_id = $1
          OR merchant_request_id = $2
       ORDER BY id DESC
       LIMIT 1`,
      [checkoutRequestId || null, merchantRequestId || null]
    );

    if (transactionResult.rows.length === 0) {
      await dbClient.query('COMMIT');
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Transaction not found but callback accepted.' });
    }

    const transaction = transactionResult.rows[0];

    await dbClient.query(
      `UPDATE transactions
       SET raw_callback = $1,
           result_code = $2,
           result_desc = $3,
           provider_receipt = COALESCE($4, provider_receipt),
           paid_at = COALESCE($5, paid_at),
           updated_at = NOW()
       WHERE id = $6`,
      [
        JSON.stringify(req.body),
        String(callback.ResultCode),
        callback.ResultDesc || null,
        metadata.MpesaReceiptNumber || null,
        metadata.TransactionDate
          ? new Date(String(metadata.TransactionDate).replace(
              /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/,
              '$1-$2-$3T$4:$5:$6'
            ))
          : null,
        transaction.id,
      ]
    );

    if (Number(callback.ResultCode) !== 0) {
      await dbClient.query(
        `UPDATE transactions
         SET status = $1,
             last_error = $2,
             updated_at = NOW()
         WHERE id = $3`,
        ['failed', callback.ResultDesc || 'STK push failed.', transaction.id]
      );

      await dbClient.query('COMMIT');
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    if (!transaction.session_id) {
      await provisionSuccessfulTransaction(dbClient, transaction, metadata);
    } else {
      await dbClient.query(
        `UPDATE transactions
         SET status = $1,
             updated_at = NOW()
         WHERE id = $2`,
        ['success', transaction.id]
      );
    }

    await dbClient.query('COMMIT');
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) {
    await dbClient.query('ROLLBACK');
    console.error('Safaricom callback failed:', error.message);
    res.status(500).json({ message: 'Callback processing failed.' });
  } finally {
    dbClient.release();
  }
});

module.exports = router;
