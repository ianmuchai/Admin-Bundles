-- ============================================================
-- AdminISP Full Database Schema
-- PostgreSQL
-- ============================================================

-- Admin users (ISP staff)
CREATE TABLE IF NOT EXISTS admin_users (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  email       VARCHAR(120) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  role        VARCHAR(30) NOT NULL DEFAULT 'admin',  -- 'superadmin' | 'admin' | 'support'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Internet packages / plans
CREATE TABLE IF NOT EXISTS packages (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(120) NOT NULL,
  type            VARCHAR(50) NOT NULL DEFAULT 'PPPOE',  -- PPPOE | Hotspot | Data Plans | Free Trial
  upload_speed    NUMERIC(10,2) NOT NULL,   -- Mbps
  download_speed  NUMERIC(10,2) NOT NULL,   -- Mbps
  burst           BOOLEAN NOT NULL DEFAULT FALSE,
  period          NUMERIC(6,2) NOT NULL,    -- numeric value
  unit            VARCHAR(20) NOT NULL DEFAULT 'Month(s)',  -- Hour(s) | Day(s) | Month(s)
  price           NUMERIC(12,2) NOT NULL,
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ISP clients / subscribers
CREATE TABLE IF NOT EXISTS clients (
  id              SERIAL PRIMARY KEY,
  username        VARCHAR(80) UNIQUE NOT NULL,
  first_name      VARCHAR(80) NOT NULL,
  last_name       VARCHAR(80) NOT NULL,
  phone           VARCHAR(30) NOT NULL,
  email           VARCHAR(120),
  house_no        VARCHAR(40),
  apartment       VARCHAR(80),
  location        VARCHAR(120),
  connection_type VARCHAR(30) NOT NULL DEFAULT 'PPPoE',  -- PPPoE | Static | DHCP | Hotspot
  package_id      INTEGER REFERENCES packages(id) ON DELETE SET NULL,
  online          BOOLEAN NOT NULL DEFAULT FALSE,
  status          VARCHAR(20) NOT NULL DEFAULT 'Active',  -- Active | Expired | Suspended
  installation_fee BOOLEAN NOT NULL DEFAULT FALSE,
  expiry_date     DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Active user sessions (from MikroTik / live data)
CREATE TABLE IF NOT EXISTS active_sessions (
  id              SERIAL PRIMARY KEY,
  username        VARCHAR(80) NOT NULL,
  ip_address      VARCHAR(45),
  mac_address     VARCHAR(20),
  router          VARCHAR(80),
  session_start   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_end     TIMESTAMPTZ,
  session_type    VARCHAR(20) NOT NULL DEFAULT 'hotspot',  -- hotspot | pppoe | expiry
  bytes_in        BIGINT DEFAULT 0,
  bytes_out       BIGINT DEFAULT 0
);

-- Payments / transactions
CREATE TABLE IF NOT EXISTS payments (
  id              SERIAL PRIMARY KEY,
  client_id       INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  user_name       VARCHAR(120) NOT NULL,
  phone           VARCHAR(30),
  receipt         VARCHAR(80) UNIQUE NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'unchecked',  -- checked | unchecked
  payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Support tickets
CREATE TABLE IF NOT EXISTS tickets (
  id              SERIAL PRIMARY KEY,
  ticket_number   VARCHAR(30) UNIQUE NOT NULL,
  client_id       INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  customer_name   VARCHAR(120) NOT NULL,
  subject         VARCHAR(255) NOT NULL,
  description     TEXT NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'open',    -- open | closed | in_progress
  priority        VARCHAR(20) NOT NULL DEFAULT 'medium',  -- low | medium | high
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vouchers
CREATE TABLE IF NOT EXISTS vouchers (
  id              SERIAL PRIMARY KEY,
  code            VARCHAR(80) UNIQUE NOT NULL,
  package_id      INTEGER REFERENCES packages(id) ON DELETE SET NULL,
  package_name    VARCHAR(120),
  max_uses        INTEGER NOT NULL DEFAULT 1,
  used_count      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Network sites / MikroTik boards
CREATE TABLE IF NOT EXISTS sites (
  id              SERIAL PRIMARY KEY,
  board_name      VARCHAR(120) UNIQUE NOT NULL,
  provisioning    VARCHAR(30) NOT NULL DEFAULT 'Pending',  -- Pending | Completed
  cpu_percent     NUMERIC(5,2) DEFAULT 0,
  memory_mb       NUMERIC(10,2) DEFAULT 0,
  status          VARCHAR(20) NOT NULL DEFAULT 'Offline',  -- Online | Offline
  remote_winbox   VARCHAR(120),
  ip_address      VARCHAR(45),
  mikrotik_user   VARCHAR(80),
  mikrotik_pass   VARCHAR(255),    -- stored encrypted
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leads (potential clients)
CREATE TABLE IF NOT EXISTS leads (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  email       VARCHAR(120),
  phone       VARCHAR(30),
  address     VARCHAR(255),
  status      VARCHAR(30) NOT NULL DEFAULT 'new',  -- new | contacted | qualified | lost
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  category    VARCHAR(80),
  amount      NUMERIC(12,2) NOT NULL,
  notes       TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SMS / Messages log
CREATE TABLE IF NOT EXISTS messages (
  id          SERIAL PRIMARY KEY,
  client_id   INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  recipient   VARCHAR(30) NOT NULL,
  body        TEXT NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'sent',  -- sent | failed | pending
  gateway     VARCHAR(50),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email log
CREATE TABLE IF NOT EXISTS emails (
  id          SERIAL PRIMARY KEY,
  client_id   INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  recipient   VARCHAR(120) NOT NULL,
  subject     VARCHAR(255) NOT NULL,
  body        TEXT NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'sent',  -- sent | failed | pending
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id              SERIAL PRIMARY KEY,
  title           VARCHAR(255) NOT NULL,
  type            VARCHAR(30) NOT NULL DEFAULT 'sms',  -- sms | email | both
  message         TEXT NOT NULL,
  target_group    VARCHAR(80),   -- all | active | expired | leads
  status          VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft | sent | scheduled
  scheduled_at    TIMESTAMPTZ,
  sent_count      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Seed default superadmin (password: Admin@1234 – change this!)
-- ============================================================
-- Password hash for 'Admin@1234' using bcrypt rounds=12
-- Run node -e "const b=require('bcryptjs');b.hash('Admin@1234',12).then(console.log)"
-- and replace the hash below before deploying to production.
INSERT INTO admin_users (name, email, password, role)
VALUES ('Super Admin', 'admin@isp.local', '$2a$12$placeholderHashReplaceMe', 'superadmin')
ON CONFLICT (email) DO NOTHING;
