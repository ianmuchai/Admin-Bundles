const pool = require('../config/db');
const { createServiceForSelection } = require('../services/mikrotikService');
const { encryptSecret } = require('../utils/routerCredentialCrypto');
const { parseBoolean } = require('../utils/mikrotikHelpers');

function sanitizeSiteRow(row) {
  if (!row) {
    return row;
  }

  return {
    id: row.id,
    board_name: row.board_name,
    provisioning: row.provisioning,
    cpu_percent: row.cpu_percent,
    memory_mb: row.memory_mb,
    status: row.status,
    remote_winbox: row.remote_winbox,
    ip_address: row.ip_address,
    api_host: row.api_host,
    api_port: row.api_port,
    api_username: row.api_username,
    api_use_tls: row.api_use_tls,
    api_allow_self_signed: row.api_allow_self_signed,
    api_enabled: row.api_enabled,
    has_router_credentials: Boolean(row.api_username && row.api_password_encrypted),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

exports.listSites = async (req, res) => {
  try {
    const { tab, search } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (tab === 'operational') {
      conditions.push(`status = 'Online'`);
    }

    if (search) {
      conditions.push(`(board_name ILIKE $${idx} OR COALESCE(remote_winbox,'') ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx += 1;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT id, board_name, provisioning, cpu_percent, memory_mb, status, remote_winbox, ip_address,
              api_host, api_port, api_username, api_use_tls, api_allow_self_signed, api_enabled,
              api_password_encrypted, created_at, updated_at
       FROM sites ${where}
       ORDER BY created_at DESC`,
      params
    );

    const total = rows.length;
    const active = rows.filter((site) => site.status === 'Online').length;
    const offline = total - active;

    res.json({ total, active, offline, data: rows.map(sanitizeSiteRow) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getSite = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, board_name, provisioning, cpu_percent, memory_mb, status, remote_winbox, ip_address,
              api_host, api_port, api_username, api_use_tls, api_allow_self_signed, api_enabled,
              api_password_encrypted, created_at, updated_at
       FROM sites
       WHERE id = $1`,
      [req.params.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ message: 'Site not found' });
    }

    res.json(sanitizeSiteRow(rows[0]));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createSite = async (req, res) => {
  try {
    const {
      board_name,
      ip_address,
      remote_winbox,
      mikrotik_user,
      mikrotik_pass,
      api_host,
      api_port,
      api_username,
      api_use_tls,
      api_allow_self_signed,
      api_enabled,
    } = req.body;

    if (!board_name) {
      return res.status(400).json({ message: 'board_name is required' });
    }

    const duplicate = await pool.query('SELECT id FROM sites WHERE board_name = $1', [board_name]);
    if (duplicate.rows.length > 0) {
      return res.status(409).json({ message: 'Board name already exists' });
    }

    const routerUsername = api_username || mikrotik_user || null;
    const encryptedPassword = mikrotik_pass ? encryptSecret(mikrotik_pass) : null;

    const { rows } = await pool.query(
      `INSERT INTO sites (
         board_name, ip_address, remote_winbox, mikrotik_user, mikrotik_pass,
         api_host, api_port, api_username, api_password_encrypted,
         api_use_tls, api_allow_self_signed, api_enabled, provisioning, status
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'Pending','Offline')
       RETURNING id, board_name, provisioning, cpu_percent, memory_mb, status, remote_winbox, ip_address,
                 api_host, api_port, api_username, api_use_tls, api_allow_self_signed, api_enabled,
                 api_password_encrypted, created_at, updated_at`,
      [
        board_name,
        ip_address || null,
        remote_winbox || null,
        routerUsername,
        null,
        api_host || ip_address || null,
        api_port || Number(process.env.MIKROTIK_PORT || 8729),
        routerUsername,
        encryptedPassword,
        parseBoolean(api_use_tls, true),
        parseBoolean(api_allow_self_signed, true),
        parseBoolean(api_enabled, true),
      ]
    );

    res.status(201).json(sanitizeSiteRow(rows[0]));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateSite = async (req, res) => {
  try {
    const {
      board_name,
      ip_address,
      remote_winbox,
      provisioning,
      status,
      cpu_percent,
      memory_mb,
      mikrotik_user,
      mikrotik_pass,
      api_host,
      api_port,
      api_username,
      api_use_tls,
      api_allow_self_signed,
      api_enabled,
    } = req.body;

    const encryptedPassword = mikrotik_pass ? encryptSecret(mikrotik_pass) : null;

    const { rows } = await pool.query(
      `UPDATE sites SET
         board_name = COALESCE($1, board_name),
         ip_address = COALESCE($2, ip_address),
         remote_winbox = COALESCE($3, remote_winbox),
         provisioning = COALESCE($4, provisioning),
         status = COALESCE($5, status),
         cpu_percent = COALESCE($6, cpu_percent),
         memory_mb = COALESCE($7, memory_mb),
         mikrotik_user = COALESCE($8, mikrotik_user),
         api_host = COALESCE($9, api_host),
         api_port = COALESCE($10, api_port),
         api_username = COALESCE($11, api_username),
         api_password_encrypted = COALESCE($12, api_password_encrypted),
         api_use_tls = COALESCE($13, api_use_tls),
         api_allow_self_signed = COALESCE($14, api_allow_self_signed),
         api_enabled = COALESCE($15, api_enabled),
         updated_at = NOW()
       WHERE id = $16
       RETURNING id, board_name, provisioning, cpu_percent, memory_mb, status, remote_winbox, ip_address,
                 api_host, api_port, api_username, api_use_tls, api_allow_self_signed, api_enabled,
                 api_password_encrypted, created_at, updated_at`,
      [
        board_name,
        ip_address,
        remote_winbox,
        provisioning,
        status,
        cpu_percent,
        memory_mb,
        api_username || mikrotik_user,
        api_host || ip_address,
        api_port,
        api_username || mikrotik_user,
        encryptedPassword,
        api_use_tls === undefined ? null : parseBoolean(api_use_tls, true),
        api_allow_self_signed === undefined ? null : parseBoolean(api_allow_self_signed, true),
        api_enabled === undefined ? null : parseBoolean(api_enabled, true),
        req.params.id,
      ]
    );

    if (!rows[0]) {
      return res.status(404).json({ message: 'Site not found' });
    }

    res.json(sanitizeSiteRow(rows[0]));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.testSiteConnection = async (req, res) => {
  try {
    const service = await createServiceForSelection({ siteId: Number(req.params.id) });
    const result = await service.testConnection();
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteSite = async (req, res) => {
  try {
    await pool.query('DELETE FROM sites WHERE id = $1', [req.params.id]);
    res.json({ message: 'Site deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
