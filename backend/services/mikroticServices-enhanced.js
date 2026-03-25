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
      console.error(`MikroTik connection error [${this.config.name}]:`, error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      try {
        await this.connection.close();
        console.log(`Disconnected from MikroTik [${this.config.name}]`);
      } catch (error) {
        console.warn(`Disconnect warning [${this.config.name}]:`, error.message);
      }
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

  // ==================== HOTSPOT USER MANAGEMENT ====================

  /**
   * Add Hotspot User with Bundle Profile
   * @param {string} username - Username
   * @param {string} password - Password
   * @param {string} profile - Bundle profile (daily-500mb, daily-1gb, weekly-5gb, monthly-20gb, unlimited)
   * @param {string} comment - Optional comment with expiry date format: "User Name | expires:Dec/01/2026"
   */
  async addHotspotUser(username, password, profile = 'daily-1gb', comment = '') {
    try {
      // Validation
      if (!username || typeof username !== 'string' || username.trim() === '') {
        throw new Error('Username is missing or invalid');
      }
      if (!password || typeof password !== 'string' || password.trim() === '') {
        throw new Error('Password is missing or invalid');
      }
      if (!profile || typeof profile !== 'string' || profile.trim() === '') {
        throw new Error('Profile is missing or invalid');
      }

      console.log(`[HOTSPOT] Adding user: ${username} with profile: ${profile}`);
      
      await this.connect();
      
      const userConfig = {
        name: username,
        password: password,
        profile: profile,
      };

      // Add comment if provided
      if (comment && comment.trim() !== '') {
        userConfig.comment = comment;
      }

      const result = await this.connection.write('/ip/hotspot/user/add', userConfig);
      await this.disconnect();
      
      return {
        success: true,
        message: `User ${username} created successfully with ${profile} profile`,
        data: result
      };
    } catch (error) {
      await this.disconnect();
      console.error(`[HOTSPOT ERROR] Failed to add user ${username}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all hotspot users
   */
  async getHotspotUsers() {
    try {
      await this.connect();
      const users = await this.connection.write('/ip/hotspot/user/print');
      await this.disconnect();
      
      return users.map(user => ({
        id: user['.id'],
        name: user['name'],
        profile: user['profile'],
        comment: user['comment'] || '',
        disabled: user['disabled'] === 'true',
        limit_uptime: user['limit-uptime'] || ''
      }));
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  /**
   * Remove Hotspot User by username
   */
  async removeHotspotUser(username) {
    try {
      console.log(`[HOTSPOT] Removing user: ${username}`);
      await this.connect();
      
      const users = await this.connection.write('/ip/hotspot/user/print', {
        '.proplist': '.id,name'
      });
      
      const user = users.find(u => u['name'] === username);
      if (!user) {
        throw new Error(`User ${username} not found`);
      }
      
      await this.connection.write('/ip/hotspot/user/remove', {
        numbers: user['.id']
      });
      
      await this.disconnect();
      return { success: true, message: `User ${username} removed` };
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  /**
   * Update Hotspot User profile/status
   */
  async updateHotspotUser(username, updates = {}) {
    try {
      console.log(`[HOTSPOT] Updating user: ${username}`, updates);
      await this.connect();
      
      const users = await this.connection.write('/ip/hotspot/user/print', {
        '.proplist': '.id,name'
      });
      
      const user = users.find(u => u['name'] === username);
      if (!user) {
        throw new Error(`User ${username} not found`);
      }
      
      const updateConfig = { numbers: user['.id'] };
      Object.assign(updateConfig, updates);
      
      await this.connection.write('/ip/hotspot/user/set', updateConfig);
      await this.disconnect();
      
      return { success: true, message: `User ${username} updated` };
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  /**
   * Disable hotspot user (for expired subscriptions)
   */
  async disableHotspotUser(username) {
    return this.updateHotspotUser(username, { disabled: 'true' });
  }

  /**
   * Enable hotspot user
   */
  async enableHotspotUser(username) {
    return this.updateHotspotUser(username, { disabled: 'false' });
  }

  // ==================== HOTSPOT SESSION MONITORING ====================

  /**
   * Get active hotspot sessions (currently logged-in users)
   * Returns: [ { user, address, bytesIn, bytesOut, uptime, ... } ]
   */
  async getActiveHotspotSessions() {
    try {
      await this.connect();
      
      const sessions = await this.connection.write('/ip/hotspot/active/print');
      await this.disconnect();
      
      return sessions.map(session => ({
        id: session['.id'],
        user: session['user'] || 'guest',
        address: session['address'],
        mac_address: session['mac-address'],
        login_by: session['login-by'],
        bytes_in: parseInt(session['bytes-in'] || '0'),
        bytes_out: parseInt(session['bytes-out'] || '0'),
        total_bytes: parseInt(session['bytes-in'] || '0') + parseInt(session['bytes-out'] || '0'),
        session_timeout: session['session-timeout'],
        idle_timeout: session['idle-timeout'],
        uptime: session['uptime'],
        comment: session['comment'] || ''
      }));
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  /**
   * Disconnect an active hotspot session
   */
  async disconnectHotspotSession(sessionId) {
    try {
      console.log(`[HOTSPOT] Disconnecting session: ${sessionId}`);
      await this.connect();
      
      await this.connection.write('/ip/hotspot/active/remove', {
        numbers: sessionId
      });
      
      await this.disconnect();
      return { success: true, message: `Session ${sessionId} disconnected` };
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  // ==================== DATA CAP & USAGE MONITORING ====================

  /**
   * Check data usage for active user
   * Returns: { bytesIn, bytesOut, totalBytes, profile, percentage }
   */
  async getUserDataUsage(username) {
    try {
      const sessions = await this.getActiveHotspotSessions();
      const userSession = sessions.find(s => s.user === username);
      
      if (!userSession) {
        return { error: `User ${username} not currently active` };
      }

      // Get user profile to calculate percentage
      const users = await this.getHotspotUsers();
      const user = users.find(u => u.name === username);
      
      if (!user) {
        return { error: `User ${username} not found` };
      }

      // Data limits in bytes
      const limits = {
        'daily-500mb': 536870912,      // 500MB
        'daily-1gb': 1073741824,        // 1GB
        'weekly-5gb': 5368709120,       // 5GB
        'monthly-20gb': 21474836480,    // 20GB
        'unlimited': 999999999999       // No limit
      };

      const limit = limits[user.profile] || 999999999999;
      const used = userSession.total_bytes;
      const percentage = Math.round((used / limit) * 100);

      return {
        username: username,
        profile: user.profile,
        bytes_in: userSession.bytes_in,
        bytes_out: userSession.bytes_out,
        total_bytes: used,
        total_mb: (used / 1048576).toFixed(2),
        limit_bytes: limit,
        limit_mb: (limit / 1048576).toFixed(2),
        percentage_used: percentage,
        bytes_remaining: Math.max(0, limit - used),
        status: percentage >= 100 ? 'EXCEEDED' : percentage >= 80 ? 'WARNING' : 'OK'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get data usage for all active users
   */
  async getAllUserDataUsage() {
    try {
      const sessions = await this.getActiveHotspotSessions();
      const users = await this.getHotspotUsers();

      const limits = {
        'daily-500mb': 536870912,
        'daily-1gb': 1073741824,
        'weekly-5gb': 5368709120,
        'monthly-20gb': 21474836480,
        'unlimited': 999999999999
      };

      return sessions.map(session => {
        const user = users.find(u => u.name === session.user);
        const profile = user?.profile || 'unknown';
        const limit = limits[profile] || 999999999999;
        const used = session.total_bytes;
        const percentage = Math.round((used / limit) * 100);

        return {
          username: session.user,
          profile: profile,
          total_mb: (used / 1048576).toFixed(2),
          limit_mb: (limit / 1048576).toFixed(2),
          percentage_used: percentage,
          status: percentage >= 100 ? 'EXCEEDED' : percentage >= 80 ? 'WARNING' : 'OK'
        };
      });
    } catch (error) {
      throw error;
    }
  }

  // ==================== PPPOE USER MANAGEMENT (Alternative) ====================

  /**
   * Add PPPoE User (for PPPoE-based connections instead of hotspot)
   */
  async addPPPoEUser(username, password, profile = 'default') {
    try {
      console.log(`[PPPOE] Adding user: ${username}`);
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

  /**
   * Get all PPPoE users
   */
  async getPPPoEUsers() {
    try {
      await this.connect();
      const users = await this.connection.write('/ppp/secret/print');
      await this.disconnect();
      return users;
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  /**
   * Remove PPPoE user
   */
  async removePPPoEUser(username) {
    try {
      console.log(`[PPPOE] Removing user: ${username}`);
      await this.connect();
      
      const users = await this.connection.write('/ppp/secret/print', {
        '.proplist': '.id,name'
      });
      
      const user = users.find(u => u['name'] === username);
      if (!user) {
        throw new Error(`PPPoE user ${username} not found`);
      }
      
      await this.connection.write('/ppp/secret/remove', {
        numbers: user['.id']
      });
      
      await this.disconnect();
      return { success: true, message: `PPPoE user ${username} removed` };
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  // ==================== SYSTEM MONITORING ====================

  /**
   * Get WAN connection status (IP address and gateway)
   */
  async getWANStatus() {
    try {
      await this.connect();
      
      const addresses = await this.connection.write('/ip/address/print');
      const routes = await this.connection.write('/ip/route/print');
      
      await this.disconnect();

      // Find WAN interfaces (typically ether1 or ether2)
      const wans = addresses.filter(addr => 
        !addr['interface'].includes('bridge') && 
        !addr['interface'].includes('loopback')
      );

      return {
        wan_interfaces: wans.map(wan => ({
          interface: wan['interface'],
          address: wan['address'],
          disabled: wan['disabled'] === 'true'
        })),
        default_routes: routes.filter(r => r['dst-address'] === '0.0.0.0/0').map(r => ({
          gateway: r['gateway'],
          distance: r['distance'],
          interface: r['to route-interface']
        }))
      };
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  /**
   * Get system resource usage (CPU, Memory, Disk)
   */
  async getSystemResources() {
    try {
      await this.connect();
      
      const resources = await this.connection.write('/system/resource/print');
      await this.disconnect();
      
      if (Array.isArray(resources) && resources.length > 0) {
        const res = resources[0];
        return {
          uptime: res['uptime'],
          cpu_load: res['cpu-load'],
          total_memory: parseInt(res['total-memory']),
          free_memory: parseInt(res['free-memory']),
          memory_usage_percent: Math.round(((parseInt(res['total-memory']) - parseInt(res['free-memory'])) / parseInt(res['total-memory'])) * 100),
          disk_free: parseInt(res['disk-free']),
          disk_total: parseInt(res['disk']),
          version: res['version']
        };
      }
      return null;
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  /**
   * Get system logs (last N entries)
   */
  async getSystemLogs(count = 50, topic = null) {
    try {
      await this.connect();
      
      const query = { '.proplist': '=time,=topics,=message' };
      const logs = await this.connection.write('/log/print', query);
      
      await this.disconnect();

      return logs.slice(-count).reverse().map(log => ({
        time: log['time'],
        topics: log['topics']?.split(',') || [],
        message: log['message']
      }));
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }
}

// Export class and site loader
module.exports = {
  MikrotikService,
  loadSites
};
