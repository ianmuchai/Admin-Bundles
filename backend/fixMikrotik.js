/**
 * fixMikrotik.js
 * Connects to MikroTik RouterOS API on port 8728 and:
 *  1. Prints current interface/IP/service state
 *  2. Enables SSH (port 22) and WebFig (port 80)
 *  3. Prints all results so we can plan next steps
 */
require('dotenv').config();
const { RouterOSAPI } = require('node-routeros');

const HOST = process.env.MIKROTIK_HOST || '192.168.88.1';
const USER = process.env.MIKROTIK_USER || 'admin';
const PASS = process.env.MIKROTIK_PASS || 'password';

async function run() {
  console.log(`\nConnecting to MikroTik at ${HOST}:8728 as "${USER}"...\n`);

  const conn = new RouterOSAPI({
    host: HOST,
    user: USER,
    password: PASS,
    port: 8728,
    timeout: 10
  });

  try {
    await conn.connect();
    console.log('✓ Connected to MikroTik API!\n');

    // 1. Print interfaces
    console.log('=== INTERFACES ===');
    const ifaces = await conn.write('/interface/print');
    ifaces.forEach(i => console.log(`  [${i['.id']}] ${i.name}  type=${i.type}  running=${i.running}  disabled=${i.disabled}`));

    // 2. Print IP addresses
    console.log('\n=== IP ADDRESSES ===');
    const addrs = await conn.write('/ip/address/print');
    addrs.forEach(a => console.log(`  [${a['.id']}] ${a.address}  iface=${a.interface}  disabled=${a.disabled}`));

    // 3. Print DHCP clients
    console.log('\n=== DHCP CLIENTS ===');
    const dhcp = await conn.write('/ip/dhcp-client/print');
    dhcp.forEach(d => console.log(`  [${d['.id']}] iface=${d.interface}  status=${d.status}  ip=${d['bound-address'] || d.address || 'none'}`));

    // 4. Print services
    console.log('\n=== IP SERVICES ===');
    const svcs = await conn.write('/ip/service/print');
    svcs.forEach(s => console.log(`  ${s.name}  port=${s.port}  disabled=${s.disabled}`));

    // 5. Print hotspot
    console.log('\n=== HOTSPOT ===');
    const hs = await conn.write('/ip/hotspot/print');
    if (hs.length === 0) {
      console.log('  No hotspot configured.');
    } else {
      hs.forEach(h => console.log(`  [${h['.id']}] name=${h.name}  iface=${h.interface}  disabled=${h.disabled}`));
    }

    // 6. Print default route
    console.log('\n=== DEFAULT ROUTE ===');
    const routes = await conn.write('/ip/route/print');
    routes.filter(r => r['dst-address'] === '0.0.0.0/0').forEach(r =>
      console.log(`  gateway=${r.gateway}  active=${r.active}  distance=${r.distance}`)
    );

    // 7. Enable SSH and WebFig
    console.log('\n=== ENABLING SSH + WEBFIG ===');
    try {
      await conn.write('/ip/service/set', ['=numbers=ssh', '=disabled=no']);
      console.log('  ✓ SSH enabled (port 22)');
    } catch(e) {
      console.log('  ! SSH enable failed:', e.message);
    }
    try {
      await conn.write('/ip/service/set', ['=numbers=www', '=disabled=no']);
      console.log('  ✓ WebFig enabled (port 80)');
    } catch(e) {
      console.log('  ! WebFig enable failed:', e.message);
    }

    // 8. Enable API explicitly
    try {
      await conn.write('/ip/service/set', ['=numbers=api', '=disabled=no']);
      console.log('  ✓ API confirmed enabled (port 8728)');
    } catch(e) {
      console.log('  ! API enable failed:', e.message);
    }

    console.log('\n✓ Done. Now try: ssh admin@192.168.88.1  OR  http://192.168.88.1 in browser\n');
    await conn.close();

  } catch (err) {
    console.error('\n✗ Connection failed:', err.message);
    console.error('\nThis means port 8728 (RouterOS API) is also disabled or firewalled.');
    console.error('Only option remaining: connect a LAN cable directly to MikroTik and use Winbox/WebFig.\n');
    process.exit(1);
  }
}

run();
