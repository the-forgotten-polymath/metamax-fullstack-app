const axios = require('axios');
const cheerio = require('cheerio');
const { checkBrokenLinks } = require('./brokenLinks');

function buildCheck({ id, label, status, value, rating, jsDependent = false, humanMessage, fix, suggestion }) {
  return {
    id,
    label,
    status,
    value,
    rating,
    jsDependent,
    humanMessage,
    fix,
    suggestion,
  };
}

function toRating(status) {
  if (status === 'pass') return 'Good';
  if (status === 'warning') return 'Needs Improvement';
  return 'Poor';
}

function pickStatus(isPass, isWarning = false) {
  if (isPass) return 'pass';
  if (isWarning) return 'warning';
  return 'fail';
}

function getTextWordCount($) {
  const clone = $.root().clone();
  clone.find('script, style, noscript').remove();
  const text = clone.text().replace(/\s+/g, ' ').trim();
  return text ? text.split(' ').length : 0;
}

function getVisibleWords($) {
  const clone = $.root().clone();
  clone.find('script, style, noscript').remove();
  return clone
    .text()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

function pickTargetKeyword(title, h1, words) {
  const stopWords = new Set([
    'and',
    'are',
    'for',
    'from',
    'has',
    'have',
    'the',
    'this',
    'that',
    'with',
    'your',
  ]);
  const candidates = `${title} ${h1}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word));

  return candidates.find((word) => words.includes(word)) || candidates[0] || '';
}

function isLogicalHeadingOrder(levels) {
  for (let i = 1; i < levels.length; i += 1) {
    if (levels[i] - levels[i - 1] > 1) {
      return false;
    }
  }
  return true;
}

function getAbsoluteUrl(baseUrl, href) {
  try {
    return new URL(href, baseUrl).toString();
  } catch (error) {
    return null;
  }
}

async function doesFaviconExist(faviconUrl) {
  if (!faviconUrl) return false;
  try {
    const response = await axios.head(faviconUrl, {
      timeout: 5000,
      maxRedirects: 3,
      validateStatus: () => true,
    });
    return response.status < 400;
  } catch (error) {
    return false;
  }
}

async function runCheerioChecks({ url, html, finalUrl, headers, loadTimeMs, robotsData, sitemapData }) {
  const $ = cheerio.load(html);
  const pageUrl = new URL(finalUrl || url);
  const pageOrigin = pageUrl.origin;
  const title = $('title').first().text().trim();
  const metaDescription = $('meta[name="description"]').attr('content')?.trim() || '';
  const firstH1 = $('h1').first().text().replace(/\s+/g, ' ').trim();
  const h1Count = $('h1').length;
  const headingLevels = $('h1, h2, h3, h4, h5, h6')
    .map((_, el) => Number(el.tagName.slice(1)))
    .get();
  const images = $('img').toArray();
  const imagesWithAlt = images.filter((img) => ($(img).attr('alt') || '').trim().length > 0).length;
  const links = $('a[href]')
    .map((_, el) => getAbsoluteUrl(pageOrigin, $(el).attr('href')))
    .get()
    .filter(Boolean);
  const internalLinks = links.filter((link) => new URL(link).origin === pageOrigin);
  const externalLinks = links.filter((link) => new URL(link).origin !== pageOrigin);
  const slug = pageUrl.pathname;
  const wordCount = getTextWordCount($);
  const duplicateMetaDescription = $('meta[name="description"]').length > 1;
  const duplicateTitle = $('title').length > 1;
  const canonical = $('link[rel="canonical"]').attr('href');
  const robotsMeta = $('meta[name="robots"]').attr('content') || '';
  const viewport = $('meta[name="viewport"]').attr('content') || '';
  const charset = $('meta[charset]').attr('charset') || headers['content-type']?.match(/charset=([^;]+)/i)?.[1] || '';
  const lang = $('html').attr('lang') || '';
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim() || '';
  const ogDescription = $('meta[property="og:description"]').attr('content')?.trim() || '';
  const ogImage = $('meta[property="og:image"]').attr('content')?.trim() || '';
  const twitterCard = $('meta[name="twitter:card"]').attr('content')?.trim() || '';
  const twitterTitle = $('meta[name="twitter:title"]').attr('content')?.trim() || '';
  const twitterDescription = $('meta[name="twitter:description"]').attr('content')?.trim() || '';
  const faviconHref = $('link[rel="icon"], link[rel="shortcut icon"]').first().attr('href') || '/favicon.ico';
  const faviconUrl = getAbsoluteUrl(pageOrigin, faviconHref);
  const hasSchema = $('script[type="application/ld+json"]').length > 0;
  const inlineStyledNodes = $('[style]').length;
  const totalNodes = $('*').length || 1;
  const inlineStyleRatio = Math.round((inlineStyledNodes / totalNodes) * 100);
  const visibleWords = getVisibleWords($);
  const targetKeyword = pickTargetKeyword(title, firstH1, visibleWords);
  const keywordHits = targetKeyword ? visibleWords.filter((word) => word === targetKeyword).length : 0;
  const keywordDensity = visibleWords.length ? (keywordHits / visibleWords.length) * 100 : 0;
  const brokenLinks = await checkBrokenLinks(links);
  const faviconExists = await doesFaviconExist(faviconUrl);

  const checks = {
    onPage: [
      (() => {
        const status = pickStatus(title.length >= 50 && title.length <= 60, title.length >= 40 && title.length <= 70);
        return buildCheck({
          id: 'title_length',
          label: 'Title Tag Length',
          status,
          value: title ? `"${title}" - ${title.length} chars` : 'Missing',
          rating: toRating(status),
          humanMessage: title
            ? status === 'pass'
              ? 'Your title length is in the ideal range.'
              : 'Your title length could be improved for search results.'
            : 'Your page is missing a title tag.',
          fix: title
            ? ['Keep title concise', 'Lead with keyword', 'Avoid filler words']
            : ['Add a title tag', 'Use main keyword', 'Stay under 60 chars'],
          suggestion: 'Suggested length: 50 to 60 characters',
        });
      })(),
      (() => {
        const status = pickStatus(metaDescription.length >= 150 && metaDescription.length <= 160, metaDescription.length >= 120 && metaDescription.length <= 170);
        return buildCheck({
          id: 'meta_description',
          label: 'Meta Description',
          status,
          value: metaDescription ? `"${metaDescription}" - ${metaDescription.length} chars` : 'Missing',
          rating: toRating(status),
          humanMessage: metaDescription
            ? 'Your meta description length affects search snippet quality.'
            : 'Your page is missing a meta description.',
          fix: metaDescription ? ['Trim description length', 'Lead with benefit', 'Remove filler words'] : ['Add meta description', 'Summarize the page', 'Keep under 160 chars'],
          suggestion: 'Suggested length: 150 to 160 characters',
        });
      })(),
      (() => {
        const status = pickStatus(h1Count === 1, h1Count > 1 || h1Count === 0);
        return buildCheck({
          id: 'h1_presence',
          label: 'H1 Structure',
          status: h1Count === 1 ? 'pass' : h1Count > 1 ? 'warning' : 'fail',
          value: h1Count === 1 ? `"${firstH1}" - single H1 present` : `${h1Count} H1 tag${h1Count === 1 ? '' : 's'}`,
          rating: toRating(h1Count === 1 ? 'pass' : h1Count > 1 ? 'warning' : 'fail'),
          humanMessage: h1Count === 1 ? 'Your page has a single primary heading.' : 'Your page should have exactly one clear H1 heading.',
          fix: ['Keep one H1', 'Reflect page topic', 'Avoid duplicate H1s'],
          suggestion: 'Use exactly one H1 that matches the page topic',
        });
      })(),
      (() => {
        const logical = isLogicalHeadingOrder(headingLevels);
        const status = logical ? 'pass' : 'warning';
        return buildCheck({
          id: 'heading_hierarchy',
          label: 'Heading Hierarchy',
          status,
          value: headingLevels.length ? `Levels: ${headingLevels.join(', ')}` : 'No headings found',
          rating: toRating(status),
          humanMessage: logical ? 'Your headings follow a logical structure.' : 'Your heading levels skip steps, which weakens structure.',
          fix: ['Avoid skipped levels', 'Nest headings clearly', 'Keep sections ordered'],
          suggestion: 'Use H2 after H1, H3 after H2, and so on',
        });
      })(),
      (() => {
        const ratio = images.length ? Math.round((imagesWithAlt / images.length) * 100) : 100;
        const status = pickStatus(ratio >= 90, ratio >= 60);
        return buildCheck({
          id: 'image_alt_tags',
          label: 'Image Alt Text',
          status,
          value: `${ratio}% of images include alt text`,
          rating: toRating(status),
          humanMessage: ratio >= 90 ? 'Most images include descriptive alt text.' : 'Missing alt text hurts accessibility and image SEO.',
          fix: ['Describe each image', 'Avoid empty alts', 'Match image intent'],
          suggestion: 'Aim for alt text on every meaningful image',
        });
      })(),
      (() => {
        const count = internalLinks.length;
        const status = count >= 3 ? 'pass' : count >= 1 ? 'warning' : 'fail';
        return buildCheck({
          id: 'internal_links',
          label: 'Internal Links',
          status,
          value: `${count} internal links`,
          rating: toRating(status),
          humanMessage: count ? 'Internal links help crawlers discover related pages.' : 'No internal links found on this page.',
          fix: ['Link related pages', 'Use descriptive anchors', 'Add navigation paths'],
          suggestion: 'Add contextual links to important internal pages',
        });
      })(),
      (() => {
        const count = externalLinks.length;
        const status = count >= 1 ? 'pass' : 'warning';
        return buildCheck({
          id: 'external_links',
          label: 'External Links',
          status,
          value: `${count} external links`,
          rating: toRating(status),
          humanMessage: count ? 'External citations can reinforce trust when relevant.' : 'No external references were found.',
          fix: ['Cite trusted sources', 'Link authoritative pages', 'Avoid excess links'],
          suggestion: 'Include relevant references when they add trust',
        });
      })(),
      (() => {
        const clean = /^\/[a-z0-9\-\/]*$/i.test(slug) && slug.length <= 80;
        const status = pickStatus(clean, slug.length <= 100);
        return buildCheck({
          id: 'url_slug',
          label: 'URL Slug',
          status,
          value: slug || '/',
          rating: toRating(status),
          humanMessage: clean ? 'Your URL slug is readable and clean.' : 'Your URL slug could be cleaner for users and search engines.',
          fix: ['Use readable words', 'Remove special chars', 'Keep it short'],
          suggestion: 'Use short lowercase words separated by hyphens',
        });
      })(),
      (() => {
        const status = pickStatus(wordCount >= 300, wordCount >= 150);
        return buildCheck({
          id: 'word_count',
          label: 'Page Word Count',
          status,
          value: `${wordCount} words`,
          rating: toRating(status),
          jsDependent: true,
          humanMessage: wordCount >= 300 ? 'Your page has enough text for context.' : 'Thin content may limit ranking opportunities.',
          fix: ['Add more detail', 'Answer user intent', 'Expand key sections'],
          suggestion: 'Aim for at least 300 useful words',
        });
      })(),
      (() => {
        const hasKeyword = Boolean(targetKeyword);
        const status = hasKeyword && keywordDensity >= 0.5 ? 'pass' : hasKeyword ? 'warning' : 'warning';
        return buildCheck({
          id: 'keyword_density',
          label: 'Keyword Density',
          status,
          value: hasKeyword ? `"${targetKeyword}" appears ${keywordHits}x (${keywordDensity.toFixed(2)}%)` : 'No clear keyword detected',
          rating: toRating(status),
          jsDependent: true,
          humanMessage:
            hasKeyword && keywordDensity >= 0.5
              ? 'The target keyword appears in the body content.'
              : 'The likely target keyword appears very little in body content.',
          fix: ['Use target keyword naturally', 'Add supporting copy', 'Avoid keyword stuffing'],
          suggestion: 'Mention the target keyword where it helps explain the page.',
        });
      })(),
      (() => {
        const hasDuplicates = duplicateMetaDescription || duplicateTitle;
        const status = hasDuplicates ? 'fail' : 'pass';
        return buildCheck({
          id: 'duplicate_meta_tags',
          label: 'Duplicate Meta Tags',
          status,
          value: hasDuplicates ? 'Duplicate title or description found' : 'No duplicate title or description tags',
          rating: toRating(status),
          humanMessage: hasDuplicates ? 'Duplicate meta tags can confuse crawlers.' : 'Your key meta tags are unique.',
          fix: ['Keep one title', 'Keep one description', 'Remove duplicate tags'],
          suggestion: 'Only include one title and one description tag',
        });
      })(),
    ],
    technical: [
      buildCheck({
        id: 'robots_txt',
        label: 'Robots.txt',
        status: robotsData.exists ? 'pass' : 'fail',
        value: robotsData.exists ? `Accessible (${robotsData.statusCode})` : 'Missing or inaccessible',
        rating: toRating(robotsData.exists ? 'pass' : 'fail'),
        humanMessage: robotsData.exists ? 'Search bots can find your robots.txt file.' : 'Your robots.txt file could not be reached.',
        fix: ['Create robots.txt', 'Allow key crawlers', 'Host at root'],
        suggestion: 'Serve robots.txt from the site root',
      }),
      buildCheck({
        id: 'sitemap_xml',
        label: 'Sitemap.xml',
        status: sitemapData.exists ? 'pass' : 'warning',
        value: sitemapData.exists ? `Accessible (${sitemapData.statusCode})` : 'Missing or inaccessible',
        rating: toRating(sitemapData.exists ? 'pass' : 'warning'),
        humanMessage: sitemapData.exists ? 'Your XML sitemap is accessible.' : 'A sitemap helps search engines find your pages faster.',
        fix: ['Generate sitemap', 'Submit in Search Console', 'Keep it updated'],
        suggestion: 'Serve sitemap.xml from the site root',
      }),
      buildCheck({
        id: 'canonical_tag',
        label: 'Canonical Tag',
        status: canonical ? 'pass' : 'fail',
        value: canonical || 'Missing',
        rating: toRating(canonical ? 'pass' : 'fail'),
        humanMessage: canonical ? 'A canonical URL is declared for this page.' : 'No canonical tag found on the page.',
        fix: ['Add canonical tag', 'Use final page URL', 'Keep one canonical'],
        suggestion: 'Add <link rel="canonical" href="...">',
      }),
      buildCheck({
        id: 'noindex_tag',
        label: 'Noindex Meta Tag',
        status: /noindex/i.test(robotsMeta) ? 'fail' : 'pass',
        value: robotsMeta || 'Not present',
        rating: toRating(/noindex/i.test(robotsMeta) ? 'fail' : 'pass'),
        humanMessage: /noindex/i.test(robotsMeta) ? 'Search engines are told not to index this page.' : 'No noindex directive was found.',
        fix: ['Remove noindex', 'Check CMS settings', 'Re-test after publish'],
        suggestion: 'Use noindex only when you want the page hidden',
      }),
      buildCheck({
        id: 'https_ssl',
        label: 'HTTPS / SSL',
        status: pageUrl.protocol === 'https:' ? 'pass' : 'fail',
        value: pageUrl.protocol === 'https:' ? 'HTTPS enabled' : 'HTTP only',
        rating: toRating(pageUrl.protocol === 'https:' ? 'pass' : 'fail'),
        humanMessage: pageUrl.protocol === 'https:' ? 'The page is served securely over HTTPS.' : 'The page is not using HTTPS.',
        fix: ['Enable SSL', 'Redirect HTTP to HTTPS', 'Update canonical links'],
        suggestion: 'Use HTTPS for all public pages',
      }),
      buildCheck({
        id: 'mobile_viewport',
        label: 'Mobile Viewport',
        status: viewport ? 'pass' : 'fail',
        value: viewport || 'Missing',
        rating: toRating(viewport ? 'pass' : 'fail'),
        humanMessage: viewport ? 'A mobile viewport tag is present.' : 'Missing viewport meta tag for mobile layout.',
        fix: ['Add viewport tag', 'Use responsive layout', 'Test mobile rendering'],
        suggestion: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">',
      }),
      buildCheck({
        id: 'charset_declared',
        label: 'Charset Declaration',
        status: charset ? 'pass' : 'warning',
        value: charset || 'Not declared',
        rating: toRating(charset ? 'pass' : 'warning'),
        humanMessage: charset ? 'A character encoding is declared.' : 'Missing charset can cause rendering issues.',
        fix: ['Declare UTF-8', 'Place it early', 'Match server header'],
        suggestion: 'Use <meta charset="utf-8">',
      }),
      buildCheck({
        id: 'html_lang',
        label: 'HTML Lang Attribute',
        status: lang ? 'pass' : 'warning',
        value: lang || 'Missing',
        rating: toRating(lang ? 'pass' : 'warning'),
        humanMessage: lang ? 'The document language is declared.' : 'Missing language attribute reduces accessibility clarity.',
        fix: ['Set html lang', 'Match primary language', 'Keep it accurate'],
        suggestion: 'Add a lang attribute on the html element',
      }),
    ],
    social: [
      buildCheck({
        id: 'og_title',
        label: 'Open Graph Title',
        status: ogTitle ? 'pass' : 'warning',
        value: ogTitle || 'Missing',
        rating: toRating(ogTitle ? 'pass' : 'warning'),
        humanMessage: ogTitle ? 'OG title is ready for social sharing.' : 'Missing OG title for rich social previews.',
        fix: ['Add og:title', 'Match page message', 'Keep it concise'],
        suggestion: 'Include a clear Open Graph title',
      }),
      buildCheck({
        id: 'og_description',
        label: 'Open Graph Description',
        status: ogDescription ? 'pass' : 'warning',
        value: ogDescription || 'Missing',
        rating: toRating(ogDescription ? 'pass' : 'warning'),
        humanMessage: ogDescription ? 'OG description is present.' : 'Missing OG description for social preview text.',
        fix: ['Add og:description', 'Summarize value', 'Keep it concise'],
        suggestion: 'Include a short Open Graph description',
      }),
      buildCheck({
        id: 'og_image',
        label: 'Open Graph Image',
        status: ogImage ? 'pass' : 'warning',
        value: ogImage || 'Missing',
        rating: toRating(ogImage ? 'pass' : 'warning'),
        humanMessage: ogImage ? 'An OG image is present for shared links.' : 'Missing OG image for social cards.',
        fix: ['Add og:image', 'Use large image', 'Avoid broken URLs'],
        suggestion: 'Include a 1200x630 social image when possible',
      }),
      buildCheck({
        id: 'twitter_card',
        label: 'Twitter Card',
        status: twitterCard ? 'pass' : 'warning',
        value: twitterCard || 'Missing',
        rating: toRating(twitterCard ? 'pass' : 'warning'),
        humanMessage: twitterCard ? 'Twitter card metadata is present.' : 'Missing Twitter card type tag.',
        fix: ['Add twitter:card', 'Use summary_large_image', 'Keep tags consistent'],
        suggestion: 'Add a Twitter card type meta tag',
      }),
      buildCheck({
        id: 'twitter_title_description',
        label: 'Twitter Title and Description',
        status: twitterTitle && twitterDescription ? 'pass' : twitterTitle || twitterDescription ? 'warning' : 'fail',
        value: twitterTitle && twitterDescription ? 'Both present' : twitterTitle || twitterDescription ? 'Partial metadata' : 'Missing both',
        rating: toRating(twitterTitle && twitterDescription ? 'pass' : twitterTitle || twitterDescription ? 'warning' : 'fail'),
        humanMessage: twitterTitle && twitterDescription ? 'Twitter metadata is complete.' : 'Twitter title and description should both be present.',
        fix: ['Add twitter:title', 'Add twitter:description', 'Match page intent'],
        suggestion: 'Include both twitter:title and twitter:description',
      }),
    ],
    content: [
      buildCheck({
        id: 'favicon',
        label: 'Favicon',
        status: faviconExists ? 'pass' : 'warning',
        value: faviconUrl || 'Missing',
        rating: toRating(faviconExists ? 'pass' : 'warning'),
        humanMessage: faviconExists ? 'A favicon is available for the site.' : 'No working favicon was detected.',
        fix: ['Add favicon file', 'Link it in head', 'Use square icon'],
        suggestion: 'Serve a favicon from /favicon.ico or a linked icon file',
      }),
      buildCheck({
        id: 'structured_data',
        label: 'Structured Data',
        status: hasSchema ? 'pass' : 'warning',
        value: hasSchema ? 'JSON-LD detected' : 'Not found',
        rating: toRating(hasSchema ? 'pass' : 'warning'),
        humanMessage: hasSchema ? 'Structured data was found on the page.' : 'No JSON-LD structured data was found.',
        fix: ['Add JSON-LD', 'Use relevant schema', 'Validate markup'],
        suggestion: 'Add schema.org JSON-LD where relevant',
      }),
      buildCheck({
        id: 'broken_links',
        label: 'Broken Links',
        status: brokenLinks.brokenCount === 0 ? 'pass' : brokenLinks.brokenCount <= 2 ? 'warning' : 'fail',
        value: `${brokenLinks.brokenCount} broken out of ${brokenLinks.checkedCount} checked`,
        rating: toRating(brokenLinks.brokenCount === 0 ? 'pass' : brokenLinks.brokenCount <= 2 ? 'warning' : 'fail'),
        jsDependent: true,
        humanMessage: brokenLinks.brokenCount === 0 ? 'No broken links were found in the sampled links.' : 'Broken links can hurt trust and crawl efficiency.',
        fix: ['Fix dead URLs', 'Update old links', 'Monitor redirects'],
        suggestion: 'Keep broken links at zero when possible',
      }),
      buildCheck({
        id: 'inline_styles_ratio',
        label: 'Inline Styles Ratio',
        status: inlineStyleRatio <= 10 ? 'pass' : inlineStyleRatio <= 25 ? 'warning' : 'fail',
        value: `${inlineStyleRatio}% of elements use inline styles`,
        rating: toRating(inlineStyleRatio <= 10 ? 'pass' : inlineStyleRatio <= 25 ? 'warning' : 'fail'),
        humanMessage: inlineStyleRatio <= 10 ? 'Inline styling is kept under control.' : 'Heavy inline styling can complicate maintenance.',
        fix: ['Move styles to CSS', 'Reuse utility classes', 'Reduce inline overrides'],
        suggestion: 'Keep inline styles limited to edge cases',
      }),
      buildCheck({
        id: 'page_load_time',
        label: 'Page Load Time',
        status: loadTimeMs <= 1500 ? 'pass' : loadTimeMs <= 3000 ? 'warning' : 'fail',
        value: `${loadTimeMs} ms`,
        rating: toRating(loadTimeMs <= 1500 ? 'pass' : loadTimeMs <= 3000 ? 'warning' : 'fail'),
        jsDependent: true,
        humanMessage: loadTimeMs <= 1500 ? 'The raw page responded quickly.' : 'The initial page response took longer than ideal.',
        fix: ['Optimize server time', 'Reduce payload size', 'Use caching'],
        suggestion: 'Aim for a server response under 1500 ms',
      }),
    ],
  };

  return checks;
}

module.exports = { runCheerioChecks };
