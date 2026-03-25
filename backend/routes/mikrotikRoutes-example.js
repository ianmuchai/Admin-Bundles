/**
 * EXAMPLE: MikroTik Bundle System - Express API Routes
 * Integrate with enhanced mikroticServices to manage users, monitor data, and handle subscriptions
 * 
 * Installation:
 * 1. Copy mikroticServices-enhanced.js to backend/services/
 * 2. Add these routes to your Express server
 * 3. Update .env with MIKROTIK_HOST, MIKROTIK_USER, MIKROTIK_PASS, MIKROTIK_PORT
 * 4. Test endpoints via Postman or curl
 */

const express = require('express');
const router = express.Router();
const { MikrotikService, loadSites } = require('../services/mikroticServices-enhanced');

// Initialize service (support multi-site)
const sites = loadSites();
let mikrotikService = new MikrotikService(sites.default || sites.site1);

// Middleware to log requests
router.use((req, res, next) => {
  console.log(`[BUNDLE API] ${req.method} ${req.path}`);
  next();
});

// ==================== HEALTH CHECK ====================

/**
 * GET /api/mikrotik/health
 * Check if router is online and responsive
 */
router.get('/health', async (req, res) => {
  try {
    const result = await mikrotikService.testConnection();
    res.status(result.success ? 200 : 503).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== USER MANAGEMENT ====================

/**
 * POST /api/mikrotik/users/create
 * Create a new hotspot bundle user
 * 
 * Body: {
 *   "username": "john",
 *   "password": "pass123",
 *   "profile": "daily-1gb",
 *   "bundleExpiry": "2026-12-31",
 *   "comment": "John Doe - Daily 1GB"
 * }
 */
router.post('/users/create', async (req, res) => {
  try {
    const { username, password, profile = 'daily-1gb', bundleExpiry, comment } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Format expiry date for comment
    let fullComment = comment || `User: ${username}`;
    if (bundleExpiry) {
      const expiryDate = new Date(bundleExpiry);
      const formattedDate = expiryDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: '2-digit' 
      });
      fullComment += ` | expires:${formattedDate}`;
    }

    // Create user in MikroTik
    const result = await mikrotikService.addHotspotUser(
      username,
      password,
      profile,
      fullComment
    );

    res.json({
      success: true,
      message: `User '${username}' created with '${profile}' profile`,
      expiresOn: bundleExpiry,
      data: result
    });
  } catch (error) {
    console.error('[ERROR] User creation failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mikrotik/users
 * List all hotspot users
 */
router.get('/users', async (req, res) => {
  try {
    const users = await mikrotikService.getHotspotUsers();
    res.json({
      total: users.length,
      users: users
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mikrotik/users/:username
 * Get specific user details
 */
router.get('/users/:username', async (req, res) => {
  try {
    const users = await mikrotikService.getHotspotUsers();
    const user = users.find(u => u.name === req.params.username);

    if (!user) {
      return res.status(404).json({ error: `User '${req.params.username}' not found` });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/mikrotik/users/:username
 * Update user (profile, disable/enable, etc.)
 * 
 * Body: {
 *   "profile": "monthly-20gb",
 *   "disabled": false,
 *   "comment": "John Doe - Upgraded to Monthly 20GB"
 * }
 */
router.put('/users/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const updates = {};

    // Map request fields to RouterOS fields
    if (req.body.profile) updates.profile = req.body.profile;
    if (req.body.disabled !== undefined) updates.disabled = req.body.disabled ? 'true' : 'false';
    if (req.body.comment) updates.comment = req.body.comment;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No update fields provided' });
    }

    const result = await mikrotikService.updateHotspotUser(username, updates);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/mikrotik/users/:username
 * Remove a hotspot user
 */
router.delete('/users/:username', async (req, res) => {
  try {
    const result = await mikrotikService.removeHotspotUser(req.params.username);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mikrotik/users/:username/disable
 * Disable user (subscription expired)
 */
router.post('/users/:username/disable', async (req, res) => {
  try {
    const result = await mikrotikService.disableHotspotUser(req.params.username);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mikrotik/users/:username/enable
 * Re-enable user (payment received)
 */
router.post('/users/:username/enable', async (req, res) => {
  try {
    const result = await mikrotikService.enableHotspotUser(req.params.username);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== DATA USAGE & MONITORING ====================

/**
 * GET /api/mikrotik/sessions
 * Get all active hotspot sessions (currently online users)
 */
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await mikrotikService.getActiveHotspotSessions();
    res.json({
      total_active: sessions.length,
      sessions: sessions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mikrotik/sessions/users/:username
 * Get active session for specific user
 */
router.get('/sessions/users/:username', async (req, res) => {
  try {
    const sessions = await mikrotikService.getActiveHotspotSessions();
    const session = sessions.find(s => s.user === req.params.username);

    if (!session) {
      return res.status(404).json({ 
        error: `User '${req.params.username}' not currently active` 
      });
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/mikrotik/sessions/:sessionId/disconnect
 * Forcefully disconnect an active session
 */
router.post('/sessions/:sessionId/disconnect', async (req, res) => {
  try {
    const result = await mikrotikService.disconnectHotspotSession(req.params.sessionId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mikrotik/data-usage
 * Get data usage for all active users
 */
router.get('/data-usage', async (req, res) => {
  try {
    const usage = await mikrotikService.getAllUserDataUsage();
    
    // Categorize by status
    const exceeded = usage.filter(u => u.status === 'EXCEEDED');
    const warning = usage.filter(u => u.status === 'WARNING');
    const ok = usage.filter(u => u.status === 'OK');

    res.json({
      total_users: usage.length,
      exceeded_count: exceeded.length,
      warning_count: warning.length,
      ok_count: ok.length,
      breakdown: {
        exceeded: exceeded,
        warning: warning,
        ok: ok
      },
      all_users: usage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mikrotik/data-usage/users/:username
 * Get data usage for specific user
 */
router.get('/data-usage/users/:username', async (req, res) => {
  try {
    const usage = await mikrotikService.getUserDataUsage(req.params.username);

    if (usage.error) {
      return res.status(404).json(usage);
    }

    res.json(usage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SYSTEM MONITORING ====================

/**
 * GET /api/mikrotik/system/wan
 * Get WAN connection status (IP, gateway, dual-WAN failover info)
 */
router.get('/system/wan', async (req, res) => {
  try {
    const wanStatus = await mikrotikService.getWANStatus();
    res.json(wanStatus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mikrotik/system/resources
 * Get system health (CPU, Memory, Uptime, Version)
 */
router.get('/system/resources', async (req, res) => {
  try {
    const resources = await mikrotikService.getSystemResources();
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mikrotik/system/logs
 * Get system logs (last 50 entries or specified count)
 * 
 * Query: ?count=100&topic=hotspot
 */
router.get('/system/logs', async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 50;
    const topic = req.query.topic || null;
    
    const logs = await mikrotikService.getSystemLogs(count, topic);
    res.json({
      total: logs.length,
      logs: logs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/mikrotik/system/dashboard
 * Comprehensive system dashboard (all stats)
 */
router.get('/system/dashboard', async (req, res) => {
  try {
    const [wan, resources, sessions, usage] = await Promise.all([
      mikrotikService.getWANStatus(),
      mikrotikService.getSystemResources(),
      mikrotikService.getActiveHotspotSessions(),
      mikrotikService.getAllUserDataUsage()
    ]);

    const exceededUsers = usage.filter(u => u.status === 'EXCEEDED');
    const warningUsers = usage.filter(u => u.status === 'WARNING');

    res.json({
      timestamp: new Date().toISOString(),
      system: {
        uptime: resources?.uptime,
        version: resources?.version,
        cpu_load: resources?.cpu_load,
        memory_usage_percent: resources?.memory_usage_percent,
        memory_free_mb: (resources?.free_memory / 1048576).toFixed(2)
      },
      network: {
        wan: wan,
        active_sessions: sessions.length,
        total_data_usage_mb: (
          sessions.reduce((sum, s) => sum + s.total_bytes, 0) / 1048576
        ).toFixed(2)
      },
      users: {
        total_active: sessions.length,
        data_exceeded: exceededUsers.length,
        data_warning: warningUsers.length,
        data_ok: usage.length - exceededUsers.length - warningUsers.length
      },
      alerts: [
        ...exceededUsers.map(u => ({
          type: 'DATA_EXCEEDED',
          user: u.username,
          message: `${u.username} exceeded ${u.limit_mb}MB limit`,
          severity: 'high'
        })),
        ...warningUsers.slice(0, 5).map(u => ({
          type: 'DATA_WARNING',
          user: u.username,
          message: `${u.username} at ${u.percentage_used}% of ${u.limit_mb}MB limit`,
          severity: 'medium'
        }))
      ]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ERROR HANDLING ====================

/**
 * Handle 404 - Route not found
 */
router.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

module.exports = router;

// ==================== EXAMPLE USAGE ====================
/*

// 1. Create a new user with 30-day expiry
curl -X POST http://localhost:5000/api/mikrotik/users/create \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "secure_pass_123",
    "profile": "daily-1gb",
    "bundleExpiry": "2026-04-21",
    "comment": "John Doe - Tech Support"
  }'

// 2. Get all active sessions
curl http://localhost:5000/api/mikrotik/sessions

// 3. Check data usage for all users
curl http://localhost:5000/api/mikrotik/data-usage

// 4. Check data usage for specific user
curl http://localhost:5000/api/mikrotik/data-usage/users/john_doe

// 5. Disable user (subscription expired)
curl -X POST http://localhost:5000/api/mikrotik/users/john_doe/disable

// 6. Re-enable user (payment received)
curl -X POST http://localhost:5000/api/mikrotik/users/john_doe/enable

// 7. Disconnect active session
curl -X POST http://localhost:5000/api/mikrotik/sessions/1/disconnect

// 8. Get system dashboard
curl http://localhost:5000/api/mikrotik/system/dashboard

// 9. Get WAN status (Starlink/4G failover info)
curl http://localhost:5000/api/mikrotik/system/wan

// 10. Get system resources
curl http://localhost:5000/api/mikrotik/system/resources

*/
