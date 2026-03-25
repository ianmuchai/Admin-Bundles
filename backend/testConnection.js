/**
 * testConnection.js — raw RouterOS API connection test
 * Usage: node testConnection.js [host] [password]
 */
const net = require('net');
const crypto = require('crypto');

const HOST = process.argv[2] || '192.168.88.1';
const PASS = process.argv[3] || '';

function encodeLen(len) {
  if (len < 0x80) return Buffer.from([len]);
  if (len < 0x4000) return Buffer.from([((len >> 8) & 0xFF) | 0x80, len & 0xFF]);
  return Buffer.from([((len >> 16) & 0xFF) | 0xC0, (len >> 8) & 0xFF, len & 0xFF]);
}

function encodeWord(word) {
  const b = Buffer.from(word);
  return Buffer.concat([encodeLen(b.length), b]);
}

function buildSentence(words) {
  return Buffer.concat([...words.map(encodeWord), Buffer.from([0])]);
}

function md5Response(pass, challenge) {
  const h = crypto.createHash('md5');
  h.update(Buffer.from([0]));
  h.update(Buffer.from(pass));
  h.update(Buffer.from(challenge, 'hex'));
  return h.digest('hex');
}

function parseSentence(buf) {
  const words = [];
  let i = 0;
  while (i < buf.length) {
    let len = buf[i];
    let skip = 1;
    if ((len & 0x80) === 0) { skip = 1; }
    else if ((len & 0xC0) === 0x80) { len = ((len & 0x3F) << 8) | buf[i+1]; skip = 2; }
    else { len = ((len & 0x1F) << 16) | (buf[i+1] << 8) | buf[i+2]; skip = 3; }
    if (len === 0) { i += skip; words.push('--- [end of sentence] ---'); continue; }
    const word = buf.slice(i + skip, i + skip + len).toString();
    words.push(word);
    i += skip + len;
  }
  return words;
}

let challenged = false;

const s = net.connect(8728, HOST, () => {
  console.log(`TCP connected to ${HOST}:8728`);
  // Send login immediately — new RouterOS (6.43+) client-first protocol
  s.write(buildSentence(['/login', '=name=admin', `=password=${PASS}`]));
  console.log(`Sent login (new protocol, password="${PASS}")`);
});

s.setTimeout(6000);

s.on('data', (d) => {
  console.log('\nRaw hex :', d.toString('hex'));
  const words = parseSentence(d);
  console.log('Parsed response:');
  words.forEach(w => console.log(' ', w));

  // Old RouterOS: sends !done with =ret=<challenge> — do MD5 response
  if (!challenged && words.includes('!done') && words.some(w => w.startsWith('=ret='))) {
    const challenge = words.find(w => w.startsWith('=ret=')).slice(5);
    console.log(`\nOld API detected. Challenge: ${challenge}`);
    const response = md5Response(PASS, challenge);
    challenged = true;
    s.write(buildSentence(['/login', '=name=admin', `=response=00${response}`]));
    console.log('Sent MD5 challenge-response');
    return;
  }

  if (words.includes('!done')) console.log('\n✅ LOGIN SUCCESS');
  if (words.some(w => w.startsWith('!trap') || w.includes('error'))) console.log('\n❌ LOGIN FAILED — wrong password');
  s.destroy();
});

s.on('timeout', () => {
  console.log('\nTIMEOUT - no response from RouterOS after 6s');
  console.log('Port is open but device not responding to API protocol');
  s.destroy();
});

s.on('error', (e) => {
  if (e.code === 'ECONNREFUSED') {
    console.log(`\nCONNECTION REFUSED - port 8728 is NOT open on ${HOST}`);
    console.log('API service may be disabled on MikroTik');
  } else if (e.code === 'ETIMEDOUT' || e.code === 'ENETUNREACH') {
    console.log(`\nNETWORK UNREACHABLE - cannot reach ${HOST}`);
    console.log('Check that LAN cable is plugged in to MikroTik port 1');
  } else {
    console.log('\nERROR:', e.message, `(${e.code})`);
  }
});

s.on('close', () => console.log('\nConnection closed.'));
