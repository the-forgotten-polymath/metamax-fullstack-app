const axios = require('axios');
const { pageSpeedCache } = require('../utils/cache');

const pageSpeedTimeoutMs = Number(process.env.PAGESPEED_TIMEOUT_MS || 60000);

function buildCheck({ id, label, status, value, rating, humanMessage, fix, suggestion }) {
  return {
    id,
    label,
    status,
    value,
    rating,
    jsDependent: false,
    humanMessage,
    fix,
    suggestion,
  };
}

function metricStatus(value, good, warning) {
  if (value <= good) return 'pass';
  if (value <= warning) return 'warning';
  return 'fail';
}

function toRating(status) {
  if (status === 'pass') return 'Good';
  if (status === 'warning') return 'Needs Improvement';
  return 'Poor';
}

function msToSecondsLabel(value) {
  return `${(value / 1000).toFixed(1)}s`;
}

function getCategoryScore(categories, key) {
  const score = categories[key]?.score;
  return Math.round((typeof score === 'number' ? score : 0) * 100);
}

async function getPageSpeedData(url) {
  const cacheKey = `pagespeed:${url}`;
  const cached = pageSpeedCache.get(cacheKey);
  if (cached) {
    return { raw: cached, cached: true };
  }

  const apiKey = process.env.PAGESPEED_API_KEY;
  const params = new URLSearchParams({
    url,
    strategy: 'mobile',
    category: 'performance',
  });

  params.append('category', 'accessibility');
  params.append('category', 'best-practices');
  params.append('category', 'seo');

  if (apiKey) {
    params.set('key', apiKey);
  }

  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`;
  const response = await axios.get(apiUrl, { timeout: pageSpeedTimeoutMs });

  pageSpeedCache.set(cacheKey, response.data);
  return { raw: response.data, cached: false };
}

function unavailablePageSpeedResult(error) {
  const reason = error?.response?.data?.error?.message || error?.message || 'PageSpeed data was unavailable.';
  const unavailableChecks = [
    ['lcp', 'Largest Contentful Paint', 'Aim for LCP under 2.5 seconds'],
    ['fcp', 'First Contentful Paint', 'Aim for FCP under 1.8 seconds'],
    ['inp', 'Interaction to Next Paint', 'Aim for INP under 200 ms'],
    ['cls', 'Cumulative Layout Shift', 'Aim for CLS under 0.1'],
    ['ttfb', 'Time to First Byte', 'Aim for TTFB under 0.8 seconds'],
    ['performance_score', 'Performance Score', 'Aim for a Lighthouse performance score of 80 or higher'],
  ];

  return {
    cached: false,
    lighthouseScores: {
      performance: null,
      accessibility: null,
      bestPractices: null,
      seo: null,
    },
    checks: unavailableChecks.map(([id, label, suggestion]) =>
      buildCheck({
        id,
        label,
        status: 'warning',
        value: 'Unavailable',
        rating: 'Needs Improvement',
        humanMessage: `PageSpeed data could not be loaded. ${reason}`,
        fix: ['Retry later', 'Check PageSpeed API access', 'Review network timeout settings'],
        suggestion,
      })
    ),
  };
}

async function runPageSpeedChecks(url) {
  let pageSpeedData;
  try {
    pageSpeedData = await getPageSpeedData(url);
  } catch (error) {
    return unavailablePageSpeedResult(error);
  }

  const { raw, cached } = pageSpeedData;
  const lighthouse = raw.lighthouseResult || {};
  const audits = lighthouse.audits || {};
  const categories = lighthouse.categories || {};
  const loadingExperience = raw.loadingExperience || {};
  const metrics = loadingExperience.metrics || {};

  const lcpValue = metrics.LARGEST_CONTENTFUL_PAINT_MS?.percentile ?? audits['largest-contentful-paint']?.numericValue ?? 0;
  const fcpValue = metrics.FIRST_CONTENTFUL_PAINT_MS?.percentile ?? audits['first-contentful-paint']?.numericValue ?? 0;
  const inpValue = metrics.INTERACTION_TO_NEXT_PAINT?.percentile ?? audits.interactive?.numericValue ?? 0;
  const clsValue = metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile
    ? metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100
    : audits['cumulative-layout-shift']?.numericValue ?? 0;
  const ttfbValue = audits['server-response-time']?.numericValue ?? audits['network-server-latency']?.numericValue ?? 0;
  const performanceScore = getCategoryScore(categories, 'performance');
  const accessibilityScore = getCategoryScore(categories, 'accessibility');
  const bestPracticesScore = getCategoryScore(categories, 'best-practices');
  const seoScore = getCategoryScore(categories, 'seo');

  const lcpStatus = metricStatus(lcpValue, 2500, 4000);
  const fcpStatus = metricStatus(fcpValue, 1800, 3000);
  const inpStatus = metricStatus(inpValue, 200, 500);
  const clsStatus = metricStatus(clsValue, 0.1, 0.25);
  const ttfbStatus = metricStatus(ttfbValue, 800, 1800);
  const perfStatus = performanceScore >= 80 ? 'pass' : performanceScore >= 50 ? 'warning' : 'fail';

  return {
    cached,
    lighthouseScores: {
      performance: performanceScore,
      accessibility: accessibilityScore,
      bestPractices: bestPracticesScore,
      seo: seoScore,
    },
    checks: [
      buildCheck({
        id: 'lcp',
        label: 'Largest Contentful Paint',
        status: lcpStatus,
        value: msToSecondsLabel(lcpValue),
        rating: toRating(lcpStatus),
        humanMessage: 'LCP measures when the main content becomes visible.',
        fix: ['Optimize hero assets', 'Improve server speed', 'Reduce render blocking'],
        suggestion: 'Aim for LCP under 2.5 seconds',
      }),
      buildCheck({
        id: 'fcp',
        label: 'First Contentful Paint',
        status: fcpStatus,
        value: msToSecondsLabel(fcpValue),
        rating: toRating(fcpStatus),
        humanMessage: 'FCP measures when the first text or image is painted.',
        fix: ['Reduce render blocking resources', 'Inline critical CSS', 'Improve server response time'],
        suggestion: 'Aim for FCP under 1.8 seconds',
      }),
      buildCheck({
        id: 'inp',
        label: 'Interaction to Next Paint',
        status: inpStatus,
        value: `${Math.round(inpValue)} ms`,
        rating: toRating(inpStatus),
        humanMessage: 'INP reflects how responsive the page feels to user input.',
        fix: ['Reduce JS work', 'Split long tasks', 'Trim event handlers'],
        suggestion: 'Aim for INP under 200 ms',
      }),
      buildCheck({
        id: 'cls',
        label: 'Cumulative Layout Shift',
        status: clsStatus,
        value: String(Number(clsValue.toFixed(2))),
        rating: toRating(clsStatus),
        humanMessage: 'CLS captures unexpected layout movement during load.',
        fix: ['Set image dimensions', 'Reserve layout space', 'Avoid injected shifts'],
        suggestion: 'Aim for CLS under 0.1',
      }),
      buildCheck({
        id: 'ttfb',
        label: 'Time to First Byte',
        status: ttfbStatus,
        value: msToSecondsLabel(ttfbValue),
        rating: toRating(ttfbStatus),
        humanMessage: 'TTFB shows how quickly the server begins responding.',
        fix: ['Speed up backend', 'Use caching', 'Optimize hosting path'],
        suggestion: 'Aim for TTFB under 0.8 seconds',
      }),
      buildCheck({
        id: 'performance_score',
        label: 'Performance Score',
        status: perfStatus,
        value: `${performanceScore}/100`,
        rating: toRating(perfStatus),
        humanMessage: 'The Lighthouse performance score combines lab-based speed signals.',
        fix: ['Reduce JS', 'Compress assets', 'Optimize images'],
        suggestion: 'Aim for a Lighthouse performance score of 80 or higher',
      }),
    ],
  };
}

module.exports = { runPageSpeedChecks };
