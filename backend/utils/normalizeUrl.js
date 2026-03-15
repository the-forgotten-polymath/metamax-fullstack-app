function normalizeUrl(input) {
  const parsed = new URL(input);
  parsed.hash = '';
  parsed.hostname = parsed.hostname.toLowerCase();

  if ((parsed.protocol === 'https:' && parsed.port === '443') || (parsed.protocol === 'http:' && parsed.port === '80')) {
    parsed.port = '';
  }

  if (parsed.pathname.length > 1) {
    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
  }

  parsed.searchParams.sort();
  return parsed.toString();
}

module.exports = { normalizeUrl };
