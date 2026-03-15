const dns = require('dns').promises;
const net = require('net');

const BLOCKED_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^169\.254\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^::1$/,
  /^fc/i,
  /^fd/i,
  /\.internal$/i,
  /\.local$/i,
];

function isBlockedHostname(hostname) {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(hostname));
}

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    return (
      /^127\./.test(ip) ||
      /^0\.0\.0\.0$/.test(ip) ||
      /^10\./.test(ip) ||
      /^169\.254\./.test(ip) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
      /^192\.168\./.test(ip)
    );
  }

  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:');
  }

  return false;
}

async function validateUrl(input) {
  let parsed;

  try {
    parsed = new URL(input);
  } catch (error) {
    throw new Error('Invalid URL.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https URLs are allowed.');
  }

  if (isBlockedHostname(parsed.hostname)) {
    throw new Error('This URL target is not allowed.');
  }

  const lookups = await dns.lookup(parsed.hostname, { all: true });
  if (lookups.some((entry) => isPrivateIp(entry.address))) {
    throw new Error('This URL resolves to a private or local address.');
  }

  return parsed.toString();
}

module.exports = {
  validateUrl,
  isPrivateIp,
  isBlockedHostname,
};
