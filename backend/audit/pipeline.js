const { mockAuditData } = require('../mock/mockAuditData');
const { fetchPage, fetchDomainFile } = require('./fetchPage');
const { runCheerioChecks } = require('./cheerioChecks');
const { runPageSpeedChecks } = require('./pagespeed');
const { buildAuditResult } = require('../utils/scorer');
const { urlCache } = require('../utils/cache');

const USE_MOCK = process.env.NODE_ENV === 'development';

const STEP_LABELS = [
  'Fetching page HTML',
  'Running 28 SEO checks',
  'Checking robots.txt & sitemap',
  'Running Core Web Vitals',
  'Checking social tags',
  'Compiling results',
];

function createSteps() {
  return STEP_LABELS.map((label, index) => ({
    label,
    status: index === 0 ? 'processing' : 'pending',
  }));
}

function updateStep(job, currentIndex, status) {
  job.steps = job.steps.map((step, index) => {
    if (index === currentIndex) {
      return { ...step, status };
    }

    if (status === 'done' && index === currentIndex + 1 && step.status === 'pending') {
      return { ...step, status: 'processing' };
    }

    return step;
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runMockPipeline(job, normalizedUrl) {
  const delays = [1200, 2200, 1400, 2800, 1300, 1600];

  for (let index = 0; index < delays.length; index += 1) {
    await sleep(delays[index]);
    updateStep(job, index, 'done');
  }

  const data = {
    ...mockAuditData,
    url: normalizedUrl,
    finalUrl: normalizedUrl,
    scannedAt: new Date().toISOString(),
    meta: {
      ...mockAuditData.meta,
      cachedResult: false,
      auditDuration: delays.reduce((sum, delay) => sum + delay, 0),
    },
  };

  job.status = 'done';
  job.meta = data.meta;
  job.data = {
    url: data.url,
    finalUrl: data.finalUrl,
    scannedAt: data.scannedAt,
    overallScore: data.overallScore,
    overallRating: data.overallRating,
    categories: data.categories,
    lighthouse: data.lighthouse,
  };
}

async function runRealPipeline(job, normalizedUrl) {
  const startedAt = Date.now();
  const page = await fetchPage(normalizedUrl);
  updateStep(job, 0, 'done');

  const robotsData = await fetchDomainFile(page.finalUrl, 'robots');
  const sitemapData = await fetchDomainFile(page.finalUrl, 'sitemap');
  const cheerioChecks = await runCheerioChecks({
    url: normalizedUrl,
    html: page.html,
    finalUrl: page.finalUrl,
    headers: page.headers,
    loadTimeMs: page.loadTimeMs,
    robotsData,
    sitemapData,
  });
  updateStep(job, 1, 'done');

  updateStep(job, 2, 'done');

  const pageSpeed = await runPageSpeedChecks(normalizedUrl);
  updateStep(job, 3, 'done');

  updateStep(job, 4, 'done');

  const fullChecks = {
    onPage: cheerioChecks.onPage,
    technical: cheerioChecks.technical,
    webVitals: pageSpeed.checks,
    social: cheerioChecks.social,
    content: cheerioChecks.content,
  };

  const result = buildAuditResult({
    url: normalizedUrl,
    normalizedUrl,
    finalUrl: page.finalUrl,
    startedAt,
    checks: fullChecks,
    jsRendered: /<script[^>]+(react|next|vue|nuxt|angular)/i.test(page.html),
    cachedResult: false,
    lighthouseScores: pageSpeed.lighthouseScores,
  });

  updateStep(job, 5, 'done');

  job.status = 'done';
  job.meta = result.meta;
  job.data = {
    url: result.url,
    finalUrl: result.finalUrl,
    scannedAt: result.scannedAt,
    overallScore: result.overallScore,
    overallRating: result.overallRating,
    categories: result.categories,
    lighthouse: result.lighthouse,
  };

  urlCache.set(normalizedUrl, {
    meta: result.meta,
    data: job.data,
  });
}

async function runAuditPipeline(job, normalizedUrl) {
  if (USE_MOCK) {
    return runMockPipeline(job, normalizedUrl);
  }

  return runRealPipeline(job, normalizedUrl);
}

module.exports = {
  STEP_LABELS,
  createSteps,
  runAuditPipeline,
};
