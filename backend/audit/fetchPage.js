const axios = require('axios');
const { domainCache } = require('../utils/cache');

const MAX_BYTES = 5 * 1024 * 1024;

async function fetchText(url, options = {}) {
  const response = await axios.get(url, {
    timeout: 10000,
    maxRedirects: 3,
    responseType: 'text',
    validateStatus: () => true,
    maxContentLength: MAX_BYTES,
    headers: {
      'User-Agent': 'MetamaxAuditBot/1.0',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    ...options,
  });

  const contentLength = Number(response.headers['content-length'] || 0);
  if (contentLength > MAX_BYTES) {
    throw new Error('Response exceeded 5MB limit.');
  }

  return response;
}

async function fetchPage(url) {
  const startedAt = Date.now();
  const response = await fetchText(url);
  const duration = Date.now() - startedAt;

  if (response.status >= 400) {
    throw new Error(`Failed to fetch page: HTTP ${response.status}`);
  }

  return {
    html: response.data,
    finalUrl: response.request?.res?.responseUrl || response.config.url || url,
    statusCode: response.status,
    headers: response.headers,
    loadTimeMs: duration,
  };
}

async function fetchDomainFile(url, type) {
  const parsed = new URL(url);
  const key = `${type}:${parsed.origin}`;
  const cached = domainCache.get(key);

  if (cached) {
    return cached;
  }

  const targetUrl = `${parsed.origin}/${type === 'robots' ? 'robots.txt' : 'sitemap.xml'}`;

  try {
    const response = await fetchText(targetUrl, {
      headers: {
        'User-Agent': 'MetamaxAuditBot/1.0',
        Accept: 'text/plain,application/xml,text/xml,*/*;q=0.8',
      },
    });

    const value = {
      exists: response.status < 400,
      statusCode: response.status,
      body: typeof response.data === 'string' ? response.data : '',
      url: targetUrl,
    };
    domainCache.set(key, value);
    return value;
  } catch (error) {
    const value = {
      exists: false,
      statusCode: null,
      body: '',
      url: targetUrl,
    };
    domainCache.set(key, value);
    return value;
  }
}

module.exports = {
  fetchPage,
  fetchDomainFile,
};
