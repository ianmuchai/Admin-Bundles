require('dotenv').config();
const RouterOSAPI = require('node-routeros').RouterOSAPI;

async function testConnection() {
  console.log('=====================================');
  console.log('MikroTik Connection Test');
  console.log('=====================================');
  console.log('Host:', process.env.MIKROTIK_HOST);
  console.log('User:', process.env.MIKROTIK_USER);
  console.log('Port: 8728');
  console.log('-------------------------------------\n');
  
  const connection = new RouterOSAPI({
    host: process.env.MIKROTIK_HOST,
    user: process.env.MIKROTIK_USER,
    password: process.env.MIKROTIK_PASS,
    port: 8728
  });
  
  try {
    console.log('1. Connecting to MikroTik...');
    await connection.connect();
    console.log('✅ Connected successfully!\n');
    
    console.log('2. Testing API commands...');
    const identity = await connection.write('/system/identity/print');
    console.log('✅ Router name:', identity[0].name);
    
    const users = await connection.write('/user/print');
    console.log('✅ Users found:', users.length);
    
    await connection.close();
    console.log('\n✅ All tests passed! MikroTik is ready.');
    
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check IP in .env matches your gateway');
    console.error('2. Verify API is enabled in IP → Services');
    console.error('3. Confirm username and password');
    console.error('4. Make sure you can ping', process.env.MIKROTIK_HOST);
  }
}

testConnection();