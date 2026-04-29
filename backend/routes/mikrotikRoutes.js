const express = require('express');
const {
  createServiceForSelection,
  getSiteConfigById,
} = require('../services/mikrotikService');
const { protect } = require('../middleware/adminAuth');
const {
  buildHotspotComment,
  resolveBundleDurationHours,
} = require('../utils/mikrotikHelpers');

const router = express.Router();

router.use(protect);

router.post('/sites/:id/test-connection', async (req, res, next) => {
  try {
    const service = await createServiceForSelection({ siteId: Number(req.params.id) });
    const result = await service.testConnection();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/sites/:id/hotspot-users', async (req, res, next) => {
  try {
    const service = await createServiceForSelection({ siteId: Number(req.params.id) });
    const users = await service.getHotspotUsers();
    res.json({ total: users.length, users });
  } catch (error) {
    next(error);
  }
});

router.post('/sites/:id/hotspot-users', async (req, res, next) => {
  try {
    const { username, password, profile, comment, bundle_name, expires_at, limit_uptime } = req.body;
    const service = await createServiceForSelection({ siteId: Number(req.params.id) });
    const site = await getSiteConfigById(Number(req.params.id));

    const result = await service.createHotspotUser({
      username,
      password,
      profile,
      limitUptime: limit_uptime || `${resolveBundleDurationHours({ duration: 24 })}h`,
      comment:
        comment ||
        buildHotspotComment({
          phoneNumber: username,
          bundleName: bundle_name,
          expiresAt: expires_at,
        }),
    });

    res.status(201).json({
      ...result,
      site: site.name,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/sites/:id/active-sessions', async (req, res, next) => {
  try {
    const service = await createServiceForSelection({ siteId: Number(req.params.id) });
    const sessions = await service.getActiveHotspotUsers();
    res.json({ total: sessions.length, sessions });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
