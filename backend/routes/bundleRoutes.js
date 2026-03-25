const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const MikrotikService = require('../services/mikroticServices');

// Get all bundles (public route)
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM bundles ORDER BY price ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bundles', error: error.message });
  }
});

// Purchase bundle (can be protected or guest)
router.post('/purchase', async (req, res) => {
  try {
    const { bundle_id, price, phone_number } = req.body;
    console.log('Purchase request received:', { bundle_id, price, phone_number });
    let user_id;

    // If authenticated user
    if (req.user) {
      user_id = req.user.id;
      console.log('Authenticated user purchase:', user_id);
    } 
    // If guest purchase - create/find user by phone number
    else if (phone_number) {
      console.log('Guest purchase attempt with phone:', phone_number);
      const User = require('../models/User');
      let user = await User.findUserBy('phone_number', phone_number);
      
      // Create guest user if doesn't exist
      if (!user) {
        console.log('Creating new guest user for phone:', phone_number);
        const guestUsername = `guest_${phone_number}_${Date.now()}`;
        user = await User.createUser({
          username: guestUsername,
          password: Math.random().toString(36),
          phone_number: phone_number,
          role: 'guest',
          status: 'active'
        });
        console.log('Guest user created:', user.id);
      } else {
        console.log('Guest user already exists:', user.id);
      }
      user_id = user.id;
    } else {
      console.log('No user or phone number provided');
      return res.status(400).json({ message: 'Phone number required for guest purchase' });
    }

    if (!bundle_id) {
      console.log('No bundle_id provided');
      return res.status(400).json({ message: 'Bundle ID is required' });
    }

    // Get bundle details
    console.log('Fetching bundle:', bundle_id);
    const bundleResult = await pool.query('SELECT * FROM bundles WHERE id = $1', [bundle_id]);
    if (bundleResult.rows.length === 0) {
      console.log('Bundle not found:', bundle_id);
      return res.status(404).json({ message: 'Bundle not found' });
    }    const bundle = bundleResult.rows[0];
    console.log('Bundle found:', bundle);

    // Create session
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + bundle.duration);
    console.log('Session expires at:', expiresAt);

    // Check if user already has an active session
    console.log('Checking for existing active session for user:', user_id);
    const activeSession = await pool.query(
      'SELECT * FROM sessions WHERE user_id = $1 AND status = $2',
      [user_id, 'active']
    );

    let sessionStatus = 'active'; // Default: new bundle will be active
    
    if (activeSession.rows.length > 0) {
      console.log('Existing active session found, new bundle will be queued');
      sessionStatus = 'queued'; // Put new bundle in queue
    }

    // Insert new session with appropriate status
    const sessionQuery = `
      INSERT INTO sessions (user_id, bundle_id, expires_at, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    console.log('Inserting session for user:', user_id, 'bundle:', bundle_id, 'status:', sessionStatus);
    const sessionResult = await pool.query(sessionQuery, [user_id, bundle_id, expiresAt, sessionStatus]);
    const session = sessionResult.rows[0];
    console.log('Session created:', session);

    // If bundle is active, create MikroTik hotspot user
    if (sessionStatus === 'active') {
      try {
        console.log('Creating MikroTik hotspot user...');
        const mikrotik = new MikrotikService();
        
        // Generate credentials for hotspot user
        const hotspotUsername = `${phone_number}_${session.id}`; // e.g., 0742866949_123
        const hotspotPassword = Math.random().toString(36).substring(2, 10); // Random 8-char password
        
        // Add hotspot user with bundle profile
        await mikrotik.addHotspotUser(hotspotUsername, hotspotPassword, bundle.profile);
        console.log('MikroTik user created:', hotspotUsername);

        // Update session with MikroTik credentials
        await pool.query(
          'UPDATE sessions SET mikrotik_username = $1, mikrotik_password = $2 WHERE id = $3',
          [hotspotUsername, hotspotPassword, session.id]
        );
        console.log('Session updated with MikroTik credentials');

        res.status(201).json({
          message: 'Bundle activated successfully! You are now connected.',
          session: {
            ...session,
            mikrotik_username: hotspotUsername,
            mikrotik_password: hotspotPassword
          }
        });
      } catch (mikroError) {
        console.error('MikroTik error:', mikroError.message);
        // Still return success for database, but note the MikroTik error
        res.status(201).json({
          message: 'Bundle purchased but MikroTik connection failed. Please contact support.',
          session: session,
          warning: mikroError.message
        });
      }
    } else {
      res.status(201).json({
        message: 'Bundle added to queue. Will activate after your current bundle expires.',
        session: session
      });
    }
  } catch (error) {
    console.error('Purchase error:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Purchase failed', 
      error: error.message 
    });
  }
});

module.exports = router;