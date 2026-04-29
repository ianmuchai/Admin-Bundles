const { Buffer } = require('buffer');

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return null;
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatTimestamp(date = new Date()) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

function normalizePhoneNumber(phoneNumber) {
  const digits = String(phoneNumber || '').replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  if (digits.startsWith('254') && digits.length === 12) {
    return digits;
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return `254${digits.slice(1)}`;
  }

  if (digits.length === 9) {
    return `254${digits}`;
  }

  return digits;
}

function parseDarajaCallbackMetadata(items = []) {
  const metadata = {};

  for (const item of items) {
    if (item && item.Name) {
      metadata[item.Name] = item.Value;
    }
  }

  return metadata;
}

class DarajaService {
  constructor(config = {}) {
    this.config = {
      consumerKey: firstNonEmpty(config.consumerKey, process.env.DARAJA_CONSUMER_KEY, process.env.SAFARICOM_CONSUMER_KEY),
      consumerSecret: firstNonEmpty(config.consumerSecret, process.env.DARAJA_CONSUMER_SECRET, process.env.SAFARICOM_CONSUMER_SECRET),
      shortCode: firstNonEmpty(config.shortCode, process.env.DARAJA_SHORTCODE, process.env.SAFARICOM_SHORTCODE),
      passKey: firstNonEmpty(config.passKey, process.env.DARAJA_PASSKEY, process.env.SAFARICOM_PASSKEY),
      callbackUrl: firstNonEmpty(config.callbackUrl, process.env.DARAJA_CALLBACK_URL, process.env.SAFARICOM_CALLBACK_URL),
      transactionType: firstNonEmpty(
        config.transactionType,
        process.env.DARAJA_TRANSACTION_TYPE,
        process.env.SAFARICOM_TRANSACTION_TYPE,
        'CustomerPayBillOnline'
      ),
      environment: firstNonEmpty(config.environment, process.env.DARAJA_ENV, process.env.SAFARICOM_ENV, 'sandbox'),
      timeoutMs: Number(firstNonEmpty(config.timeoutMs, process.env.DARAJA_TIMEOUT_MS, 15000)),
    };
  }

  get baseUrl() {
    return this.config.environment === 'live'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  validateConfig() {
    const required = ['consumerKey', 'consumerSecret', 'shortCode', 'passKey', 'callbackUrl'];

    for (const key of required) {
      if (!this.config[key]) {
        throw new Error(`Daraja config is missing ${key}.`);
      }
    }
  }

  async getAccessToken() {
    this.validateConfig();

    const credentials = Buffer.from(
      `${this.config.consumerKey}:${this.config.consumerSecret}`
    ).toString('base64');

    const response = await fetch(
      `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${credentials}`,
        },
        signal: AbortSignal.timeout(this.config.timeoutMs),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.access_token) {
      throw new Error(data.errorMessage || data.error_description || 'Failed to get Daraja access token.');
    }

    return data.access_token;
  }

  async initiateStkPush({
    phoneNumber,
    amount,
    accountReference,
    transactionDesc,
  }) {
    const accessToken = await this.getAccessToken();
    const timestamp = formatTimestamp();
    const password = Buffer.from(
      `${this.config.shortCode}${this.config.passKey}${timestamp}`
    ).toString('base64');
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    if (!normalizedPhone) {
      throw new Error('A valid phone number is required for STK push.');
    }

    const payload = {
      BusinessShortCode: this.config.shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: this.config.transactionType,
      Amount: Math.round(Number(amount)),
      PartyA: normalizedPhone,
      PartyB: this.config.shortCode,
      PhoneNumber: normalizedPhone,
      CallBackURL: this.config.callbackUrl,
      AccountReference: String(accountReference || 'Bundle Purchase').slice(0, 12),
      TransactionDesc: String(transactionDesc || 'Internet bundle payment').slice(0, 13),
    };

    const response = await fetch(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    const data = await response.json();

    if (!response.ok || data.ResponseCode !== '0') {
      throw new Error(data.errorMessage || data.ResponseDescription || 'Daraja STK push request failed.');
    }

    return {
      request: payload,
      response: data,
    };
  }
}

module.exports = {
  DarajaService,
  formatTimestamp,
  normalizePhoneNumber,
  parseDarajaCallbackMetadata,
};
