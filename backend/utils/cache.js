const NodeCache = require('node-cache');

const ttlSeconds = Number(process.env.CACHE_TTL_SECONDS || 900);

const urlCache = new NodeCache({ stdTTL: ttlSeconds, useClones: false });
const domainCache = new NodeCache({ stdTTL: ttlSeconds, useClones: false });
const pageSpeedCache = new NodeCache({ stdTTL: ttlSeconds, useClones: false });

module.exports = {
  urlCache,
  domainCache,
  pageSpeedCache,
};
