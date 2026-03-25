/**
 * Direct RouterOS API login — handles both old (pre-6.43) and new (6.43+) auth
 * Outputs EVERYTHING for debugging
 */
const net = require('net');
const crypto = require('crypto');

const HOST = '192.168.88.1';
const PORT = 8728;
const PASSWORDS = ['', 'password'];

function encodeLength(len) {
  if (len < 0x80) return Buffer.from([len]);
  if (len < 0x4000) {
    const b = Buffer.alloc(2);
    b[0] = ((len >> 8) & 0x3F) | 0x80;
    b[1] = len & 0xFF;
    return b;
  }
  const b = Buffer.alloc(3);
  b[0] = ((len >> 16) & 0x1F) | 0xC0;
  b[1] = (len >> 8) & 0xFF;
  b[2] = len & 0xFF;
  return b;
}

function encodeWord(word) {
  const wb = Buffer.from(word, 'utf8');
  return Buffer.concat([encodeLength(wb.length), wb]);
}

function encodeSentence(words) {
  const parts = words.map(w => encodeWord(w));
  parts.push(Buffer.from([0])); // end of sentence
  return Buffer.concat(parts);
}

function decodeLength(buf, offset) {
  const b = buf[offset];
  if ((b & 0x80) === 0) return { len: b, bytes: 1 };
  if ((b & 0xC0) === 0x80) return { len: ((b & 0x3F) << 8) | buf[offset + 1], bytes: 2 };
  if ((b & 0xE0) === 0xC0) return { len: ((b & 0x1F) << 16) | (buf[offset + 1] << 8) | buf[offset + 2], bytes: 3 };
  return { len: ((b & 0x0F) << 24) | (buf[offset + 1] << 16) | (buf[offset + 2] << 8) | buf[offset + 3], bytes: 4 };
}

function decodeSentences(buf) {
  const sentences = [];
  let words = [];
  let i = 0;
  while (i < buf.length) {
    const { len, bytes } = decodeLength(buf, i);
    i += bytes;
    if (len === 0) {
      if (words.length > 0) sentences.push(words);
      words = [];
      continue;
    }
    if (i + len > buf.length) break;
    words.push(buf.slice(i, i + len).toString('utf8'));
    i += len;
  }
  if (words.length > 0) sentences.push(words);
  return sentences;
}

function md5challenge(pass, challenge) {
  const challBuf = Buffer.from(challenge, 'hex');
  const md5 = crypto.createHash('md5');
  md5.update(Buffer.from([0]));
  md5.update(Buffer.from(pass, 'utf8'));
  md5.update(challBuf);
  return '00' + md5.digest('hex');
}

function tryPassword(pass) {
  return new Promise((resolve) => {
    console.log(`\n--- Trying password: "${pass}" ---`);
    let allData = Buffer.alloc(0);
    let phase = 'login-sent';
    
    const sock = net.connect(PORT, HOST, () => {
      console.log('  TCP connected');
      // Send new-style login (RouterOS >= 6.43)
      const loginMsg = encodeSentence(['/login', `=name=admin`, `=password=${pass}`]);
      console.log('  Sending login...');
      console.log('  Hex:', loginMsg.toString('hex'));
      sock.write(loginMsg);
    });

    sock.setTimeout(8000);
    
    sock.on('data', (chunk) => {
      console.log('  Received data:', chunk.length, 'bytes');
      console.log('  Hex:', chunk.toString('hex'));
      allData = Buffer.concat([allData, chunk]);
      
      const sentences = decodeSentences(allData);
      console.log('  Decoded sentences:', JSON.stringify(sentences));
      
      for (const s of sentences) {
        if (s[0] === '!done' && s.length === 1) {
          console.log('  >> LOGIN SUCCESS <<');
          resolve({ success: true, pass });
          sock.destroy();
          return;
        }
        if (s[0] === '!done' && s.some(w => w.startsWith('=ret='))) {
          // Old-style challenge-response
          const ret = s.find(w => w.startsWith('=ret=')).slice(5);
          console.log('  Old-style auth, challenge:', ret);
          const resp = md5challenge(pass, ret);
          console.log('  Sending challenge response...');
          phase = 'challenge-sent';
          allData = Buffer.alloc(0);
          sock.write(encodeSentence(['/login', `=name=admin`, `=response=${resp}`]));
          return;
        }
        if (s[0] === '!trap') {
          const msg = s.find(w => w.startsWith('=message='));
          console.log('  >> LOGIN FAILED:', msg || 'unknown error');
          resolve({ success: false, pass });
          sock.destroy();
          return;
        }
      }
    });

    sock.on('timeout', () => {
      console.log('  TIMEOUT - no response');
      resolve({ success: false, pass, timeout: true });
      sock.destroy();
    });

    sock.on('error', (e) => {
      console.log('  ERROR:', e.code, e.message);
      resolve({ success: false, pass, error: e.code });
      sock.destroy();
    });

    sock.on('close', () => {
      console.log('  Connection closed');
    });
  });
}

async function main() {
  console.log(`Connecting to ${HOST}:${PORT} over ethernet...`);
  for (const pass of PASSWORDS) {
    const result = await tryPassword(pass);
    if (result.success) {
      console.log(`\n=== PASSWORD FOUND: "${result.pass}" ===`);
      return;
    }
  }
  console.log('\n=== All passwords failed ===');
}

main();
