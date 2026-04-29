const crypto = require('crypto');

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

function normalizePhone(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(-12);
}

function generateHotspotCredentials(phoneNumber, sessionId) {
  const phonePart = normalizePhone(phoneNumber) || `user${sessionId}`;
  const username = `${phonePart}_${sessionId}`;
  const password = crypto.randomBytes(6).toString('base64url');

  return { username, password };
}

function resolveBundleDurationHours(bundle) {
  if (Number.isFinite(Number(bundle?.duration))) {
    return Number(bundle.duration);
  }

  if (Number.isFinite(Number(bundle?.duration_hours))) {
    return Number(bundle.duration_hours);
  }

  if (Number.isFinite(Number(bundle?.duration_days))) {
    return Number(bundle.duration_days) * 24;
  }

  return 24;
}

function resolveBundleProfile(bundle) {
  if (bundle?.profile) {
    return bundle.profile;
  }

  const durationDays = Number(bundle?.duration_days);
  if (Number.isFinite(durationDays)) {
    if (durationDays <= 1) return 'daily-1gb';
    if (durationDays <= 7) return 'weekly-5gb';
    if (durationDays >= 30) return 'monthly-20gb';
  }

  const bundleName = String(bundle?.name || '').toLowerCase();
  if (bundleName.includes('500')) return 'daily-500mb';
  if (bundleName.includes('1gb') || bundleName.includes('daily')) return 'daily-1gb';
  if (bundleName.includes('weekly')) return 'weekly-5gb';
  if (bundleName.includes('monthly')) return 'monthly-20gb';
  if (bundleName.includes('unlimited')) return 'unlimited';

  return process.env.MIKROTIK_DEFAULT_PROFILE || 'daily-1gb';
}

function buildHotspotComment({ phoneNumber, bundleName, expiresAt, sessionId }) {
  const parts = [];

  if (phoneNumber) {
    parts.push(`phone:${normalizePhone(phoneNumber)}`);
  }

  if (bundleName) {
    parts.push(`bundle:${String(bundleName).replace(/\s+/g, '-')}`);
  }

  if (expiresAt) {
    parts.push(`expires:${new Date(expiresAt).toISOString()}`);
  }

  if (sessionId) {
    parts.push(`session:${sessionId}`);
  }

  return parts.join(' | ');
}

module.exports = {
  buildHotspotComment,
  generateHotspotCredentials,
  normalizePhone,
  parseBoolean,
  resolveBundleDurationHours,
  resolveBundleProfile,
};
