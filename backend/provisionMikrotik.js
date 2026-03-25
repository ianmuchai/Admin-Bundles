/**
 * provisionMikrotik.js
 * ─────────────────────────────────────────────────────────────────────
 * One-shot provisioning script for any fresh/reset MikroTik device.
 * Run this immediately after factory reset, before anything else.
 *
 * Usage:
 *   node provisionMikrotik.js [host] [user] [password]
 *
 * Defaults (from .env):
 *   host     = MIKROTIK_HOST or 192.168.88.1
 *   user     = MIKROTIK_USER or admin
 *   password = MIKROTIK_PASS or ''  (blank after factory reset)
 *
 * What this script does:
 *   1. Locks management access open permanently (can never be blocked again)
 *   2. Renames ether1 → WAN, sets DHCP client (gets internet from upstream router)
 *   3. Creates bridge-LAN with ether2/ether3/ether4
 *   4. Assigns 192.168.10.1/24 to bridge-LAN (hotspot network)
 *   5. Creates DHCP server for hotspot clients (192.168.10.10–254)
 *   6. Sets up NAT masquerade
 *   7. Configures hotspot on bridge-LAN (no wizard)
 *   8. Enables API on port 8728 (for this system's backend)
 *   9. Sets admin password to value in .env
 *  10. Prints a summary of what was done
 * ─────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const { RouterOSAPI } = require('node-routeros');

const HOST     = process.argv[2] || process.env.MIKROTIK_HOST || '192.168.89.1';
const USER     = process.argv[3] || process.env.MIKROTIK_USER || 'admin';
const PASS_OLD = process.argv[4] || '';                          // blank after factory reset
const PASS_NEW = process.env.MIKROTIK_PASS                || 'password';

// Hotspot / LAN config — change these to suit each site if needed
const LAN_IP        = '192.168.10.1';
const LAN_CIDR      = '192.168.10.1/24';
const LAN_NETWORK   = '192.168.10.0/24';
const POOL_FROM     = '192.168.10.10';
const POOL_TO       = '192.168.10.254';
const DNS_SERVERS   = '8.8.8.8,8.8.4.4';
const HOTSPOT_NAME  = 'hotspot1';

let conn;

async function write(cmd, params = []) {
  const result = await conn.write(cmd, params);
  return result;
}

async function run() {
  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║       MikroTik Auto-Provisioning Script          ║`);
  console.log(`╚══════════════════════════════════════════════════╝`);
  console.log(`\nTarget: ${HOST}  User: ${USER}\n`);

  conn = new RouterOSAPI({
    host: HOST, user: USER, password: PASS_OLD,
    port: 8728, timeout: 15
  });

  try {
    await conn.connect();
    console.log('✓ Connected to MikroTik API\n');
  } catch (e) {
    console.error(`✗ Cannot connect to ${HOST}:8728`);
    console.error(`  Error: ${e.message}`);
    console.error(`\n  Make sure you are connected to MikroTik WiFi and the device was just reset.`);
    console.error(`  After a factory reset, connect to WiFi "MikroTik" (no password) and retry.\n`);
    process.exit(1);
  }

  // ── STEP 1: Unlock management permanently ────────────────────────
  step('1', 'Unlocking management access permanently');
  await safeWrite('/ip/firewall/filter/add', [
    '=chain=input',
    '=action=accept',
    '=comment=PERMANENT mgmt - do not remove',
    '=place-before=0'
  ]);
  await safeWrite('/ip/service/set', ['=numbers=api',     '=disabled=no', '=port=8728']);
  await safeWrite('/ip/service/set', ['=numbers=ssh',     '=disabled=no']);
  await safeWrite('/ip/service/set', ['=numbers=www',     '=disabled=no']);
  await safeWrite('/ip/service/set', ['=numbers=telnet',  '=disabled=no']);
  await safeWrite('/ip/service/set', ['=numbers=winbox',  '=disabled=no']);
  ok('All management services enabled, firewall accept rule added at top');

  // ── STEP 2: Rename ether1 → WAN ──────────────────────────────────
  step('2', 'Configuring WAN interface (ether1)');
  const ifaces = await write('/interface/print');
  const ether1 = ifaces.find(i => i.name === 'ether1' || i.name === 'WAN');
  if (ether1 && ether1.name !== 'WAN') {
    await safeWrite('/interface/set', [`=.id=${ether1['.id']}`, '=name=WAN']);
    ok('ether1 renamed to WAN');
  } else if (ether1) {
    ok('WAN interface already named correctly');
  } else {
    warn('Could not find ether1 — skipping rename');
  }

  // Remove existing DHCP clients to avoid conflicts
  const existingDhcp = await write('/ip/dhcp-client/print');
  for (const d of existingDhcp) {
    await safeWrite('/ip/dhcp-client/remove', [`=.id=${d['.id']}`]);
  }
  // Try WAN name first, fall back to ether1 if rename hasn't taken effect yet
  const dhcpIface = (await write('/interface/print')).find(i => i.name === 'WAN') ? 'WAN' : 'ether1';
  await safeWrite('/ip/dhcp-client/add', [`=interface=${dhcpIface}`, '=disabled=no', '=add-default-route=yes']);
  ok('DHCP client added on WAN — will get internet from upstream router');

  // ── STEP 3: Remove conflicting LAN IPs (never touch management IP) ─
  step('3', 'Cleaning up conflicting IP addresses');
  const existingAddrs = await write('/ip/address/print');
  for (const a of existingAddrs) {
    // Never remove the IP we are currently connected through (192.168.88.x on ether1/WAN)
    const isManagementIP = (a.interface === 'WAN' || a.interface === 'ether1' || (a.address && a.address.startsWith('192.168.88.')));
    // Only remove addresses that conflict with our target LAN (192.168.10.x), or are on bridge-LAN
    const isConflicting = (a.interface === 'bridge-LAN' || (a.address && a.address.startsWith('192.168.10.')));
    if (!isManagementIP && isConflicting) {
      await safeWrite('/ip/address/remove', [`=.id=${a['.id']}`]);
    }
  }
  ok('Conflicting LAN addresses cleared (management IP preserved)');

  // ── STEP 4: Create bridge-LAN ─────────────────────────────────────
  step('4', 'Creating bridge-LAN');
  const bridges = await write('/interface/bridge/print');
  const existingBridge = bridges.find(b => b.name === 'bridge-LAN');
  if (!existingBridge) {
    await safeWrite('/interface/bridge/add', ['=name=bridge-LAN', '=protocol-mode=rstp', '=comment=Hotspot LAN bridge']);
    ok('bridge-LAN created');
  } else {
    ok('bridge-LAN already exists');
  }

  // Add ether2, ether3, ether4 to bridge (if they exist)
  const allIfaces = await write('/interface/print');
  const bridgePorts = await write('/interface/bridge/port/print');
  const alreadyBridged = bridgePorts.map(p => p.interface);
  for (const ethName of ['ether2', 'ether3', 'ether4', 'ether5']) {
    const found = allIfaces.find(i => i.name === ethName);
    if (found && !alreadyBridged.includes(ethName)) {
      await safeWrite('/interface/bridge/port/add', [`=interface=${ethName}`, '=bridge=bridge-LAN']);
      ok(`${ethName} added to bridge-LAN`);
    }
  }

  // Add wlan1 to bridge if it exists (for MikroTik devices with built-in WiFi used as AP)
  const wlan = allIfaces.find(i => i.name === 'wlan1');
  if (wlan && !alreadyBridged.includes('wlan1')) {
    // Don't bridge wlan1 if it's the management interface we're connected through
    warn('wlan1 found but NOT added to bridge (keeping it as management WiFi)');
  }

  // ── STEP 5: Assign IP to bridge-LAN ──────────────────────────────
  step('5', `Assigning ${LAN_CIDR} to bridge-LAN`);
  await safeWrite('/ip/address/add', [`=address=${LAN_CIDR}`, '=interface=bridge-LAN', '=comment=Hotspot LAN gateway']);
  ok(`${LAN_CIDR} assigned to bridge-LAN`);

  // ── STEP 6: DHCP server for hotspot clients ───────────────────────
  step('6', 'Setting up DHCP server for hotspot clients');

  // Remove existing pools/servers that conflict
  const existingPools = await write('/ip/pool/print');
  for (const p of existingPools) {
    if (p.name === 'hotspot-pool') await safeWrite('/ip/pool/remove', [`=.id=${p['.id']}`]);
  }
  const existingServers = await write('/ip/dhcp-server/print');
  for (const s of existingServers) {
    if (s.interface === 'bridge-LAN') await safeWrite('/ip/dhcp-server/remove', [`=.id=${s['.id']}`]);
  }
  const existingNetworks = await write('/ip/dhcp-server/network/print');
  for (const n of existingNetworks) {
    if (n.address === LAN_NETWORK) await safeWrite('/ip/dhcp-server/network/remove', [`=.id=${n['.id']}`]);
  }

  await safeWrite('/ip/pool/add', [`=name=hotspot-pool`, `=ranges=${POOL_FROM}-${POOL_TO}`]);
  await safeWrite('/ip/dhcp-server/add', ['=name=hotspot-dhcp', '=interface=bridge-LAN', '=address-pool=hotspot-pool', '=disabled=no']);
  await safeWrite('/ip/dhcp-server/network/add', [`=address=${LAN_NETWORK}`, `=gateway=${LAN_IP}`, `=dns-server=${DNS_SERVERS}`]);
  ok(`DHCP server ready: ${POOL_FROM} – ${POOL_TO}`);

  // ── STEP 7: NAT masquerade ────────────────────────────────────────
  step('7', 'Setting up NAT (internet sharing)');
  const natRules = await write('/ip/firewall/nat/print');
  const hasNat = natRules.some(r => r.chain === 'srcnat' && r.action === 'masquerade');
  if (!hasNat) {
    await safeWrite('/ip/firewall/nat/add', ['=chain=srcnat', '=out-interface=WAN', '=action=masquerade', '=comment=NAT to upstream router']);
    ok('NAT masquerade rule added');
  } else {
    ok('NAT masquerade already exists');
  }

  // ── STEP 8: Set up Hotspot profile and server (no wizard) ─────────
  step('8', 'Configuring hotspot server');
  const hsServers = await write('/ip/hotspot/print');
  const existingHs = hsServers.find(h => h.name === HOTSPOT_NAME || h.interface === 'bridge-LAN');
  if (!existingHs) {
    // Create hotspot server profile first
    const profiles = await write('/ip/hotspot/profile/print');
    const hasProfile = profiles.find(p => p.name === 'hsprof1');
    if (!hasProfile) {
      await safeWrite('/ip/hotspot/profile/add', [
        '=name=hsprof1',
        `=dns-name=hotspot.lan`,
        `=hotspot-address=${LAN_IP}`,
        '=html-directory=hotspot',
        '=login-by=http-chap,http-pap',
        '=use-radius=no'
      ]);
    }
    await safeWrite('/ip/hotspot/add', [
      `=name=${HOTSPOT_NAME}`,
      '=interface=bridge-LAN',
      '=profile=hsprof1',
      `=address-pool=hotspot-pool`,
      '=disabled=no'
    ]);
    ok('Hotspot server created on bridge-LAN');
  } else {
    ok('Hotspot already exists on bridge-LAN');
  }

  // ── STEP 9: Set admin password ────────────────────────────────────
  step('9', 'Setting admin password');
  await safeWrite('/user/set', [`=.id=*1`, `=password=${PASS_NEW}`]);
  ok(`Admin password set to: ${PASS_NEW}`);

  // ── STEP 10: Final verification ───────────────────────────────────
  step('10', 'Final verification');
  const finalAddrs = await write('/ip/address/print');
  const finalServices = await write('/ip/service/print');
  const finalHotspot = await write('/ip/hotspot/print');

  console.log('\n  IP Addresses:');
  finalAddrs.forEach(a => console.log(`    ${a.address}  on  ${a.interface}`));
  console.log('\n  Services:');
  finalServices.forEach(s => console.log(`    ${s.name.padEnd(10)} port=${s.port}  disabled=${s.disabled}`));
  console.log('\n  Hotspot:');
  finalHotspot.length === 0
    ? console.log('    none')
    : finalHotspot.forEach(h => console.log(`    ${h.name}  iface=${h.interface}  disabled=${h.disabled}`));

  await conn.close();

  console.log(`
╔══════════════════════════════════════════════════════╗
║  ✓ PROVISIONING COMPLETE                             ║
╠══════════════════════════════════════════════════════╣
║  MikroTik is now configured:                         ║
║                                                      ║
║  WAN   → ether1  (DHCP from upstream router)         ║
║  LAN   → bridge-LAN  @ 192.168.10.1/24              ║
║  Hotspot clients → 192.168.10.10 – .254              ║
║  Management → always accessible (firewall unlocked)  ║
║  API port 8728 → ENABLED for this system             ║
║                                                      ║
║  Next: update backend/.env                           ║
║    MIKROTIK_HOST = 192.168.88.1  (or WAN IP)         ║
║    MIKROTIK_PASS = ${PASS_NEW.padEnd(33)}║
╚══════════════════════════════════════════════════════╝
`);
}

// ── Helpers ────────────────────────────────────────────────────────
async function safeWrite(cmd, params = []) {
  try {
    return await conn.write(cmd, params);
  } catch (e) {
    // Ignore "already exists" type errors
    if (!e.message.includes('already') && !e.message.includes('exist') && !e.message.includes('Failure')) {
      warn(`${cmd} → ${e.message}`);
    }
    return [];
  }
}

function step(n, msg) { console.log(`\n[Step ${n}] ${msg}`); }
function ok(msg)       { console.log(`  ✓ ${msg}`); }
function warn(msg)     { console.log(`  ⚠ ${msg}`); }

process.on('uncaughtException', e => {
  console.error('\nFatal error:', e.message);
  process.exit(1);
});

run().catch(e => {
  console.error('\nFatal error:', e.message);
  process.exit(1);
});
