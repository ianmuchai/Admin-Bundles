const RouterOSAPI = require('node-routeros').RouterOSAPI;

/**
 * Loads all configured MikroTik sites from environment variables.
 * Supports unlimited sites via:
 *   MIKROTIK_HOST (legacy single-site)
 *   SITE_1_HOST, SITE_1_NAME, SITE_1_USER, SITE_1_PASS
 *   SITE_2_HOST, SITE_2_NAME, ...
 */
function loadSites() {
  const sites = {};

  // Legacy single-site support
  if (process.env.MIKROTIK_HOST) {
    sites['default'] = {
      name: 'Default Site',
      host: process.env.MIKROTIK_HOST,
      user: process.env.MIKROTIK_USER || 'admin',
      pass: process.env.MIKROTIK_PASS || 'password',
      port: parseInt(process.env.MIKROTIK_PORT || '8728'),
    };
  }

  // Multi-site support: SITE_1_HOST, SITE_2_HOST, ...
  let i = 1;
  while (process.env[`SITE_${i}_HOST`]) {
    const key = `site${i}`;
    sites[key] = {
      name: process.env[`SITE_${i}_NAME`] || `Site ${i}`,
      host: process.env[`SITE_${i}_HOST`],
      user: process.env[`SITE_${i}_USER`] || process.env.MIKROTIK_USER || 'admin',
      pass: process.env[`SITE_${i}_PASS`] || process.env.MIKROTIK_PASS || 'password',
      port: parseInt(process.env[`SITE_${i}_PORT`] || process.env.MIKROTIK_PORT || '8728'),
    };
    i++;
  }

  return sites;
}

class MikrotikService {
  constructor(siteConfig) {
    this.connection = null;
    // Accept explicit config or fall back to env
    this.config = siteConfig || {
      host: process.env.MIKROTIK_HOST,
      user: process.env.MIKROTIK_USER || 'admin',
      pass: process.env.MIKROTIK_PASS || 'password',
      port: parseInt(process.env.MIKROTIK_PORT || '8728'),
      name: 'Default',
    };
  }

  async connect() {
    try {
      this.connection = new RouterOSAPI({
        host: this.config.host,
        user: this.config.user,
        password: this.config.pass,
        port: this.config.port || 8728
      });
      await this.connection.connect();
      console.log(`Connected to MikroTik [${this.config.name}] at ${this.config.host}`);
      return true;
    } catch (error) {
      console.error(`MikroTik connection error [${this.config.name}]:`, error);
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.close();
      console.log(`Disconnected from MikroTik [${this.config.name}]`);
    }
  }

  // Test MikroTik connection
  async testConnection() {
    try {
      await this.connect();
      await this.disconnect();
      return { success: true, message: 'Successfully connected to MikroTik.' };
    } catch (error) {
      return { success: false, message: 'Failed to connect to MikroTik.', error: error.message };
    }
  }

  // Add Hotspot User
  async addHotspotUser(username, password, profile = 'default') {
    try {
      // Validation and debug logging
      if (!username || typeof username !== 'string' || username.trim() === '') {
        throw new Error('Username is missing or invalid');
      }
      if (!password || typeof password !== 'string' || password.trim() === '') {
        throw new Error('Password is missing or invalid');
      }
      if (!profile || typeof profile !== 'string' || profile.trim() === '') {
        throw new Error('Profile is missing or invalid');
      }
      console.log('Adding Hotspot User:', { username, password, profile });
      await this.connect();
      const result = await this.connection.write('/ip/hotspot/user/add', {
        name: username,
        password: password,
        profile: profile,
        'limit-uptime': '1d' // Example: 1 day access
      });
      await this.disconnect();
      return result;
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  // Remove Hotspot User
  async removeHotspotUser(username) {
    try {
      await this.connect();
      const users = await this.connection.write('/ip/hotspot/user/print', {
        where: `name=${username}`
      });
      if (users.length > 0) {
        await this.connection.write('/ip/hotspot/user/remove', {
          numbers: users[0]['.id']
        });
      }
      await this.disconnect();
      return true;
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  // Add PPPoE User
  async addPPPoEUser(username, password, profile = 'default') {
    try {
      await this.connect();
      const result = await this.connection.write('/ppp/secret/add', {
        name: username,
        password: password,
        profile: profile,
        service: 'pppoe'
      });
      await this.disconnect();
      return result;
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  // Get Active Hotspot Users
  async getActiveHotspotUsers() {
    try {
      await this.connect();
      const users = await this.connection.write('/ip/hotspot/active/print');
      await this.disconnect();
      return users;
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  // Disconnect Active User
  async disconnectUser(username) {
    try {
      await this.connect();
      const activeUsers = await this.connection.write('/ip/hotspot/active/print', {
        where: `user=${username}`
      });
      if (activeUsers.length > 0) {
        await this.connection.write('/ip/hotspot/active/remove', {
          numbers: activeUsers[0]['.id']
        });
      }
      await this.disconnect();
      return true;
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  // Create Bandwidth Profile
  async createProfile(name, rateLimit) {
    try {
      await this.connect();
      const result = await this.connection.write('/ip/hotspot/user/profile/add', {
        name: name,
        'rate-limit': rateLimit // Format: "upload/download" e.g., "512k/1M"
      });
      await this.disconnect();
      return result;
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  // Get user usage statistics
  async getUserStats(username) {
    try {
      await this.connect();
      const stats = await this.connection.write('/ip/hotspot/user/print', {
        where: `name=${username}`
      });
      await this.disconnect();
      return stats[0] || null;
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  // Update user profile (for upgrading/downgrading bundles)
  async updateUserProfile(username, newProfile) {
    try {
      await this.connect();
      const users = await this.connection.write('/ip/hotspot/user/print', {
        where: `name=${username}`
      });
      if (users.length > 0) {
        await this.connection.write('/ip/hotspot/user/set', {
          numbers: users[0]['.id'],
          profile: newProfile
        });
      }
      await this.disconnect();
      return true;
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }
}

// ── Exports ──
// Default single-site instance (backwards compatible)
const defaultService = new MikrotikService();
module.exports = defaultService;

// Multi-site factory: get a service for a specific site
// Usage: const { getMikrotikForSite, getAllSites } = require('./mikroticServices');
module.exports.getMikrotikForSite = function(siteKey) {
  const sites = loadSites();
  const cfg = sites[siteKey];
  if (!cfg) throw new Error(`MikroTik site "${siteKey}" not found in environment config`);
  return new MikrotikService(cfg);
};

module.exports.getAllSites = function() {
  return loadSites();
};

module.exports.MikrotikService = MikrotikService;