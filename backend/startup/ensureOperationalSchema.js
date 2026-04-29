const pool = require('../config/db');
const { encryptSecret, isEncryptedSecret } = require('../utils/routerCredentialCrypto');

async function ensureOperationalSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      bundle_id INTEGER NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      site_id INTEGER REFERENCES sites(id) ON DELETE SET NULL,
      session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
      phone_number VARCHAR(20) NOT NULL,
      provider VARCHAR(20) NOT NULL DEFAULT 'safaricom',
      amount NUMERIC(12, 2) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      external_reference VARCHAR(120),
      merchant_request_id VARCHAR(120),
      checkout_request_id VARCHAR(120),
      provider_receipt VARCHAR(120),
      result_code VARCHAR(20),
      result_desc TEXT,
      raw_request JSONB,
      raw_callback JSONB,
      paid_at TIMESTAMPTZ,
      last_error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE IF EXISTS transactions
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS external_reference VARCHAR(120),
    ADD COLUMN IF NOT EXISTS merchant_request_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS checkout_request_id VARCHAR(120),
    ADD COLUMN IF NOT EXISTS provider_receipt VARCHAR(120),
    ADD COLUMN IF NOT EXISTS result_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS result_desc TEXT,
    ADD COLUMN IF NOT EXISTS raw_request JSONB,
    ADD COLUMN IF NOT EXISTS raw_callback JSONB,
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_error TEXT
  `);

  await pool.query(`
    ALTER TABLE IF EXISTS sites
    ADD COLUMN IF NOT EXISTS api_host VARCHAR(255),
    ADD COLUMN IF NOT EXISTS api_port INTEGER DEFAULT 8729,
    ADD COLUMN IF NOT EXISTS api_username VARCHAR(80),
    ADD COLUMN IF NOT EXISTS api_password_encrypted TEXT,
    ADD COLUMN IF NOT EXISTS api_use_tls BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS api_allow_self_signed BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS api_enabled BOOLEAN DEFAULT TRUE
  `);

  await pool.query(`
    ALTER TABLE IF EXISTS sessions
    ADD COLUMN IF NOT EXISTS site_id INTEGER,
    ADD COLUMN IF NOT EXISTS provisioning_error TEXT,
    ADD COLUMN IF NOT EXISTS mikrotik_username VARCHAR(120),
    ADD COLUMN IF NOT EXISTS mikrotik_password VARCHAR(255)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_sessions_site_status
    ON sessions (site_id, status)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_transactions_checkout_request_id
    ON transactions (checkout_request_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_transactions_status_created_at
    ON transactions (status, created_at DESC)
  `);

  const { rows: sites } = await pool.query(`
    SELECT id, ip_address, mikrotik_user, mikrotik_pass, api_host, api_username, api_password_encrypted
    FROM sites
  `);

  for (const site of sites) {
    const updates = [];
    const values = [];
    let index = 1;

    if (!site.api_host && site.ip_address) {
      updates.push(`api_host = $${index++}`);
      values.push(site.ip_address);
    }

    if (!site.api_username && site.mikrotik_user) {
      updates.push(`api_username = $${index++}`);
      values.push(site.mikrotik_user);
    }

    if (!site.api_password_encrypted && site.mikrotik_pass) {
      const encryptedPassword = isEncryptedSecret(site.mikrotik_pass)
        ? site.mikrotik_pass
        : encryptSecret(site.mikrotik_pass);
      updates.push(`api_password_encrypted = $${index++}`);
      values.push(encryptedPassword);
    }

    if (updates.length > 0) {
      values.push(site.id);
      await pool.query(
        `UPDATE sites SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${index}`,
        values
      );
    }
  }
}

module.exports = {
  ensureOperationalSchema,
};
