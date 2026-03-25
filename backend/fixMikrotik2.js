const { RouterOSAPI } = require('node-routeros');

const passwords = ['', 'password', 'Password', 'admin', '1234', '12345', 'mikrotik'];

async function tryAll() {
  for (const pass of passwords) {
    const conn = new RouterOSAPI({
      host: '192.168.88.1',
      user: 'admin',
      password: pass,
      port: 8728,
      timeout: 8
    });
    try {
      await conn.connect();
      console.log(`\n*** SUCCESS with password: "${pass}" ***`);
      const id = await conn.write('/system/identity/print');
      console.log('Identity:', id);
      const res = await conn.write('/system/resource/print');
      console.log('Version:', res[0]['version']);
      
      // Fix everything right here
      console.log('\n--- Fixing config ---');
      
      // Enable WiFi
      try {
        await conn.write('/interface/wireless/enable', ['=.id=*1']);
        console.log('WiFi enabled');
      } catch(e) { console.log('WiFi enable:', e.message); }
      
      // Reset password to blank so Winbox works
      try {
        await conn.write('/user/set', ['=.id=*1', '=password=']);
        console.log('Password reset to blank');
      } catch(e) { console.log('Password reset:', e.message); }
      
      // Print current config
      const addrs = await conn.write('/ip/address/print');
      console.log('\nIP Addresses:');
      addrs.forEach(a => console.log(`  ${a.address} on ${a.interface}`));
      
      const bridges = await conn.write('/interface/bridge/print');
      console.log('\nBridges:');
      bridges.forEach(b => console.log(`  ${b.name}`));
      
      const ports = await conn.write('/interface/bridge/port/print');
      console.log('\nBridge Ports:');
      ports.forEach(p => console.log(`  ${p.interface} -> ${p.bridge}`));
      
      const wlan = await conn.write('/interface/wireless/print');
      console.log('\nWireless:');
      wlan.forEach(w => console.log(`  ${w.name} ssid=${w.ssid} disabled=${w.disabled}`));
      
      await conn.close();
      return;
    } catch(e) {
      console.log(`FAIL "${pass}": ${e.message || 'no message'}`);
      try { await conn.close(); } catch(_) {}
    }
  }
  console.log('\nAll passwords failed.');
}

tryAll();
