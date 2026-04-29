const { RouterOSAPI } = require('node-routeros');
const pool = require('../config/db');
const { decryptSecret } = require('../utils/routerCredentialCrypto');
const { parseBoolean } = require('../utils/mikrotikHelpers');

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return null;
}

function sanitizeSite(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    key: row.key || row.site_key || null,
    name: row.name || row.board_name || 'Default Site',
    host: row.host || row.api_host || row.ip_address || null,
    port: Number(row.port || row.api_port || process.env.MIKROTIK_PORT || 8729),
    user: row.user || row.api_username || row.mikrotik_user || process.env.MIKROTIK_USER || 'admin',
    password: firstDefined(
      row.password,
      decryptSecret(row.api_password_encrypted),
      decryptSecret(row.mikrotik_pass),
      process.env.MIKROTIK_PASS
    ),
    tls: parseBoolean(
      row.tls ?? row.api_use_tls ?? process.env.MIKROTIK_TLS,
      true
    ),
    allowSelfSigned: parseBoolean(
      row.allowSelfSigned ?? row.api_allow_self_signed ?? process.env.MIKROTIK_ALLOW_SELF_SIGNED,
      true
    ),
    enabled: parseBoolean(row.enabled ?? row.api_enabled, true),
    source: row.source || 'database',
  };
}

function loadSitesFromEnv() {
  const sites = {};

  if (process.env.MIKROTIK_HOST) {
    sites.default = sanitizeSite({
      key: 'default',
      name: process.env.MIKROTIK_NAME || 'Default Site',
      host: process.env.MIKROTIK_HOST,
      port: process.env.MIKROTIK_PORT,
      user: process.env.MIKROTIK_USER,
      password: process.env.MIKROTIK_PASS,
      tls: process.env.MIKROTIK_TLS,
      allowSelfSigned: process.env.MIKROTIK_ALLOW_SELF_SIGNED,
      enabled: true,
      source: 'env',
    });
  }

  for (let i = 1; process.env[`SITE_${i}_HOST`]; i += 1) {
    const key = process.env[`SITE_${i}_KEY`] || `site${i}`;
    sites[key] = sanitizeSite({
      key,
      name: process.env[`SITE_${i}_NAME`] || `Site ${i}`,
      host: process.env[`SITE_${i}_HOST`],
      port: process.env[`SITE_${i}_PORT`],
      user: process.env[`SITE_${i}_USER`] || process.env.MIKROTIK_USER,
      password: process.env[`SITE_${i}_PASS`] || process.env.MIKROTIK_PASS,
      tls: process.env[`SITE_${i}_TLS`] ?? process.env.MIKROTIK_TLS,
      allowSelfSigned:
        process.env[`SITE_${i}_ALLOW_SELF_SIGNED`] ?? process.env.MIKROTIK_ALLOW_SELF_SIGNED,
      enabled: process.env[`SITE_${i}_ENABLED`] ?? 'true',
      source: 'env',
    });
  }

  return sites;
}

async function getSiteConfigById(siteId) {
  const { rows } = await pool.query(
    `SELECT
      id,
      board_name,
      api_host,
      api_port,
      api_username,
      api_password_encrypted,
      api_use_tls,
      api_allow_self_signed,
      api_enabled,
      ip_address,
      mikrotik_user,
      mikrotik_pass
    FROM sites
    WHERE id = $1`,
    [siteId]
  );

  if (!rows[0]) {
    throw new Error(`Site ${siteId} not found.`);
  }

  return sanitizeSite(rows[0]);
}

async function resolveSiteConfig(selection = {}) {
  if (selection.siteId) {
    const site = await getSiteConfigById(selection.siteId);
    if (!site.enabled) {
      throw new Error(`Site ${selection.siteId} is disabled for API provisioning.`);
    }
    return site;
  }

  const envSites = loadSitesFromEnv();
  const siteKey = selection.siteKey || 'default';
  if (envSites[siteKey]) {
    return envSites[siteKey];
  }

  if (Object.keys(envSites).length > 0) {
    return envSites.default || Object.values(envSites)[0];
  }

  throw new Error(
    'No MikroTik site configuration found. Set MIKROTIK_HOST in .env or create a site in the database.'
  );
}

class MikrotikService {
  constructor(siteConfig) {
    this.config = sanitizeSite(siteConfig);
    this.connection = null;
  }

  validateConfig() {
    if (!this.config?.host) {
      throw new Error('MikroTik host is missing.');
    }

    if (!this.config?.user) {
      throw new Error('MikroTik username is missing.');
    }

    if (this.config?.password === null || this.config?.password === undefined) {
      throw new Error('MikroTik password is missing.');
    }
  }

  async connect() {
    this.validateConfig();

    const options = {
      host: this.config.host,
      user: this.config.user,
      password: this.config.password,
      port: this.config.port,
      timeout: Number(process.env.MIKROTIK_TIMEOUT_MS || 10000),
    };

    if (this.config.tls) {
      options.tls = {
        rejectUnauthorized: !this.config.allowSelfSigned,
      };
    }

    this.connection = new RouterOSAPI(options);
    await this.connection.connect();
    return this.connection;
  }

  async disconnect() {
    if (!this.connection) {
      return;
    }

    try {
      await this.connection.close();
    } catch (error) {
      console.warn(`[MikroTik] Disconnect warning for ${this.config.name}: ${error.message}`);
    } finally {
      this.connection = null;
    }
  }

  async withConnection(task) {
    await this.connect();

    try {
      return await task(this.connection);
    } finally {
      await this.disconnect();
    }
  }

  async testConnection() {
    return this.withConnection(async (conn) => {
      const identity = await conn.write('/system/identity/print');
      const resource = await conn.write('/system/resource/print');
      const router = identity[0] || {};
      const stats = resource[0] || {};

      return {
        success: true,
        site: this.config.name,
        host: this.config.host,
        tls: this.config.tls,
        identity: router.name || this.config.name,
        version: stats.version || null,
        uptime: stats.uptime || null,
      };
    });
  }

  async getHotspotUsers() {
    return this.withConnection((conn) => conn.write('/ip/hotspot/user/print'));
  }

  async getActiveHotspotUsers() {
    return this.withConnection((conn) => conn.write('/ip/hotspot/active/print'));
  }

  async getActiveHotspotSessions() {
    return this.getActiveHotspotUsers();
  }

  async addHotspotUser(username, password, profile, comment = '') {
    return this.createHotspotUser({
      username,
      password,
      profile,
      comment,
    });
  }

  async createHotspotUser({ username, password, profile, comment, limitUptime }) {
    if (!username || !password || !profile) {
      throw new Error('username, password, and profile are required for hotspot user creation.');
    }

    return this.withConnection(async (conn) => {
      const existingUsers = await conn.write('/ip/hotspot/user/print');
      const existingUser = existingUsers.find((user) => user.name === username);

      const payload = {
        name: username,
        password,
        profile,
      };

      if (comment) {
        payload.comment = comment;
      }

      if (limitUptime) {
        payload['limit-uptime'] = limitUptime;
      }

      if (existingUser) {
        await conn.write('/ip/hotspot/user/set', {
          numbers: existingUser['.id'],
          ...payload,
        });

        return {
          success: true,
          action: 'updated',
          username,
          profile,
        };
      }

      await conn.write('/ip/hotspot/user/add', payload);

      return {
        success: true,
        action: 'created',
        username,
        profile,
      };
    });
  }

  async removeHotspotUser(username) {
    return this.withConnection(async (conn) => {
      const existingUsers = await conn.write('/ip/hotspot/user/print');
      const existingUser = existingUsers.find((user) => user.name === username);

      if (!existingUser) {
        return { success: true, action: 'noop', username };
      }

      await conn.write('/ip/hotspot/user/remove', {
        numbers: existingUser['.id'],
      });

      return { success: true, action: 'removed', username };
    });
  }
}

async function createServiceForSelection(selection) {
  const siteConfig = await resolveSiteConfig(selection);
  return new MikrotikService(siteConfig);
}

module.exports = {
  MikrotikService,
  createServiceForSelection,
  getSiteConfigById,
  loadSites: loadSitesFromEnv,
  loadSitesFromEnv,
  resolveSiteConfig,
};
