const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { createServiceForSelection } = require('../services/mikrotikService');
const {
  buildHotspotComment,
  generateHotspotCredentials,
  resolveBundleDurationHours,
  resolveBundleProfile,
} = require('../utils/mikrotikHelpers');

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM bundles ORDER BY price ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bundles', error: error.message });
  }
});

router.post('/purchase', async (req, res) => {
  const dbClient = await pool.connect();

  try {
    const { bundle_id, phone_number, site_id, site_key } = req.body;
    console.log('Purchase request received:', { bundle_id, phone_number, site_id, site_key });

    if (!bundle_id) {
      return res.status(400).json({ message: 'Bundle ID is required' });
    }

    if (!req.user && !phone_number) {
      return res.status(400).json({ message: 'Phone number required for guest purchase' });
    }

    await dbClient.query('BEGIN');

    let userId;

    if (req.user) {
      userId = req.user.id;
    } else {
      const User = require('../models/User');
      let user = await User.findUserBy('phone_number', phone_number);

      if (!user) {
        const guestUsername = `guest_${phone_number}_${Date.now()}`;
        user = await User.createUser({
          username: guestUsername,
          password: `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          phone_number,
          role: 'guest',
          status: 'active',
        });
      }

      userId = user.id;
    }

    const bundleResult = await dbClient.query('SELECT * FROM bundles WHERE id = $1', [bundle_id]);
    if (bundleResult.rows.length === 0) {
      await dbClient.query('ROLLBACK');
      return res.status(404).json({ message: 'Bundle not found' });
    }

    const bundle = bundleResult.rows[0];
    const durationHours = resolveBundleDurationHours(bundle);
    const hotspotProfile = resolveBundleProfile(bundle);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + durationHours);

    const activeSession = await dbClient.query(
      'SELECT id FROM sessions WHERE user_id = $1 AND status = $2',
      [userId, 'active']
    );

    const sessionStatus = activeSession.rows.length > 0 ? 'queued' : 'active';

    const sessionResult = await dbClient.query(
      `INSERT INTO sessions (user_id, bundle_id, expires_at, status, site_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, bundle_id, expiresAt, sessionStatus, site_id || null]
    );

    const session = sessionResult.rows[0];

    if (sessionStatus !== 'active') {
      await dbClient.query('COMMIT');
      return res.status(201).json({
        message: 'Bundle added to queue. Will activate after your current bundle expires.',
        session,
      });
    }

    try {
      const mikrotik = await createServiceForSelection({ siteId: site_id, siteKey: site_key });
      const { username: hotspotUsername, password: hotspotPassword } =
        generateHotspotCredentials(phone_number, session.id);

      await mikrotik.createHotspotUser({
        username: hotspotUsername,
        password: hotspotPassword,
        profile: hotspotProfile,
        limitUptime: `${durationHours}h`,
        comment: buildHotspotComment({
          phoneNumber: phone_number,
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

      await dbClient.query('COMMIT');

      return res.status(201).json({
        message: 'Bundle activated successfully! You are now connected.',
        session: {
          ...session,
          mikrotik_username: hotspotUsername,
          mikrotik_password: hotspotPassword,
          site_id: site_id || null,
          hotspot_profile: hotspotProfile,
        },
      });
    } catch (mikroError) {
      await dbClient.query(
        `UPDATE sessions
         SET status = $1,
             provisioning_error = $2
         WHERE id = $3`,
        ['provisioning_failed', mikroError.message, session.id]
      );

      await dbClient.query('COMMIT');

      return res.status(201).json({
        message: 'Bundle purchased but MikroTik connection failed. Please contact support.',
        session: {
          ...session,
          status: 'provisioning_failed',
          site_id: site_id || null,
        },
        warning: mikroError.message,
      });
    }
  } catch (error) {
    await dbClient.query('ROLLBACK');
    console.error('Purchase error:', error.message);
    res.status(500).json({
      message: 'Purchase failed',
      error: error.message,
    });
  } finally {
    dbClient.release();
  }
});

module.exports = router;
