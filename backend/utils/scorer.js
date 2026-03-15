function getRating(score) {
  if (score >= 80) return 'Good';
  if (score >= 50) return 'Needs Improvement';
  return 'Poor';
}

function statusPoints(status) {
  if (status === 'pass') return 100;
  if (status === 'warning') return 60;
  return 20;
}

function scoreChecks(checks) {
  if (!checks.length) return 0;
  const total = checks.reduce((sum, check) => sum + statusPoints(check.status), 0);
  return Math.round(total / checks.length);
}

function buildAuditResult({ url, normalizedUrl, finalUrl, startedAt, checks, jsRendered, cachedResult, lighthouseScores }) {
  const onPageScore = scoreChecks(checks.onPage);
  const technicalScore = scoreChecks(checks.technical);
  const webVitalsScore = scoreChecks(checks.webVitals);
  const socialScore = scoreChecks(checks.social);
  const contentScore = scoreChecks(checks.content);
  const overallScore = Math.round((onPageScore + technicalScore + webVitalsScore + socialScore + contentScore) / 5);

  return {
    url: normalizedUrl || url,
    finalUrl: finalUrl || normalizedUrl || url,
    scannedAt: new Date().toISOString(),
    overallScore,
    overallRating: getRating(overallScore),
    categories: {
      onPage: { score: onPageScore, rating: getRating(onPageScore), checks: checks.onPage },
      technical: { score: technicalScore, rating: getRating(technicalScore), checks: checks.technical },
      webVitals: { score: webVitalsScore, rating: getRating(webVitalsScore), checks: checks.webVitals },
      social: { score: socialScore, rating: getRating(socialScore), checks: checks.social },
      content: { score: contentScore, rating: getRating(contentScore), checks: checks.content },
    },
    lighthouse: lighthouseScores || {
      performance: webVitalsScore,
      accessibility: 0,
      bestPractices: 0,
      seo: onPageScore,
    },
    meta: {
      jsRendered,
      cachedResult,
      auditDuration: Date.now() - startedAt,
    },
  };
}

module.exports = {
  buildAuditResult,
  getRating,
};
