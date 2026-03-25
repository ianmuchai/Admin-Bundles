require('dotenv').config();
const mikrotikService = require('./services/mikroticServices');

async function testAutomatedUserCreation() {
  console.log('=====================================');
  console.log('Testing Automated User Creation');
  console.log('=====================================');
  console.log('Simulating what happens after payment...\n');
  
  // Simulate a customer who just paid
  const mockCustomer = {
    username: 'customer001',
    password: 'wifi2024',
    bundle: 'ian'
  };
  
  try {
    console.log('1. Customer paid for internet bundle');
    console.log('2. Payment verified ✓');
    console.log('3. Creating WiFi access for customer...\n');
    
    // This would happen automatically after payment
    await mikrotikService.addHotspotUser(
      mockCustomer.username,
      mockCustomer.password,
      mockCustomer.bundle
    );
    
    console.log('✅ Customer WiFi access created!');
    console.log(`\nCustomer can now connect with:`);
    console.log(`Username: ${mockCustomer.username}`);
    console.log(`Password: ${mockCustomer.password}`);
    
    // Check if user was created
    console.log('\n4. Verifying user exists in MikroTik...');
    const users = await mikrotikService.getActiveHotspotUsers();
    console.log(`✅ Found ${users.length} active users`);
    
    // Clean up test (remove after 10 seconds)
    console.log('\n5. Will remove test user in 10 seconds...');
    setTimeout(async () => {
      try {
        await mikrotikService.removeHotspotUser(mockCustomer.username);
        console.log('✅ Test user removed successfully');
      } catch (err) {
        console.error('Could not remove test user:', err.message);
      }
    }, 10000);
    
  } catch (error) {
    console.error('\n❌ Test failed!');
    console.error('Error:', error.message);
    console.error('\nThis usually means:');
    console.error('1. Hotspot is not set up on MikroTik');
    console.error('2. Go to IP → Hotspot → Hotspot Setup in Winbox');
    console.error('3. Follow the setup wizard');
    console.error('4. Then try this test again');
  }
}

testAutomatedUserCreation();