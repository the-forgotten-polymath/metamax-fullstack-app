const mockAuditData = {
  url: 'https://www.greenframe.studio/services/technical-seo-audits',
  finalUrl: 'https://www.greenframe.studio/services/technical-seo-audits',
  scannedAt: '2026-05-10T10:00:00.000Z',
  overallScore: 74,
  overallRating: 'Needs Improvement',
  categories: {
    onPage: {
      score: 78,
      rating: 'Needs Improvement',
      checks: [
        { id: 'title_length', label: 'Title Tag Length', status: 'pass', value: '56 characters', rating: 'Good', jsDependent: false, humanMessage: 'Your title length is in the ideal range.', fix: ['Keep title concise', 'Lead with keyword', 'Avoid filler words'], suggestion: 'Suggested length: 50 to 60 characters' },
        { id: 'meta_description', label: 'Meta Description', status: 'warning', value: '168 characters', rating: 'Needs Improvement', jsDependent: false, humanMessage: 'Your meta description is slightly longer than ideal.', fix: ['Trim description length', 'Lead with value', 'Remove filler words'], suggestion: 'Suggested length: 150 to 160 characters' },
        { id: 'h1_presence', label: 'H1 Structure', status: 'pass', value: '1 H1 tag', rating: 'Good', jsDependent: false, humanMessage: 'Your page has a single primary heading.', fix: ['Keep one H1', 'Reflect page topic', 'Avoid duplicate H1s'], suggestion: 'Use exactly one H1 that matches the page topic' },
        { id: 'heading_hierarchy', label: 'Heading Hierarchy', status: 'warning', value: 'Levels: 1, 2, 4, 2, 3', rating: 'Needs Improvement', jsDependent: false, humanMessage: 'Your heading levels skip steps, which weakens structure.', fix: ['Avoid skipped levels', 'Nest headings clearly', 'Keep sections ordered'], suggestion: 'Use H2 after H1, H3 after H2, and so on' },
        { id: 'image_alt_tags', label: 'Image Alt Text', status: 'pass', value: '92% of images include alt text', rating: 'Good', jsDependent: false, humanMessage: 'Most images include descriptive alt text.', fix: ['Describe each image', 'Avoid empty alts', 'Match image intent'], suggestion: 'Aim for alt text on every meaningful image' },
        { id: 'internal_links', label: 'Internal Links', status: 'warning', value: '2 internal links', rating: 'Needs Improvement', jsDependent: false, humanMessage: 'Internal links help crawlers discover related pages.', fix: ['Link related pages', 'Use descriptive anchors', 'Add navigation paths'], suggestion: 'Add contextual links to important internal pages' },
        { id: 'external_links', label: 'External Links', status: 'pass', value: '4 external links', rating: 'Good', jsDependent: false, humanMessage: 'External citations can reinforce trust when relevant.', fix: ['Cite trusted sources', 'Link authoritative pages', 'Avoid excess links'], suggestion: 'Include relevant references when they add trust' },
        { id: 'url_slug', label: 'URL Slug', status: 'pass', value: '/services/technical-seo-audits', rating: 'Good', jsDependent: false, humanMessage: 'Your URL slug is readable and clean.', fix: ['Use readable words', 'Remove special chars', 'Keep it short'], suggestion: 'Use short lowercase words separated by hyphens' },
        { id: 'word_count', label: 'Page Word Count', status: 'pass', value: '1284 words', rating: 'Good', jsDependent: true, humanMessage: 'Your page has enough text for context.', fix: ['Add more detail', 'Answer user intent', 'Expand key sections'], suggestion: 'Aim for at least 300 useful words' },
        { id: 'duplicate_meta_tags', label: 'Duplicate Meta Tags', status: 'fail', value: 'Duplicate description tags found', rating: 'Poor', jsDependent: false, humanMessage: 'Duplicate meta tags can confuse crawlers.', fix: ['Keep one description', 'Remove duplicate tags', 'Review head output'], suggestion: 'Only include one title and one description tag' }
      ]
    },
    technical: {
      score: 68,
      rating: 'Needs Improvement',
      checks: [
        { id: 'robots_txt', label: 'Robots.txt', status: 'pass', value: 'Accessible (200)', rating: 'Good', jsDependent: false, humanMessage: 'Search bots can find your robots.txt file.', fix: ['Keep it accessible', 'Allow key crawlers', 'Review disallow rules'], suggestion: 'Serve robots.txt from the site root' },
        { id: 'sitemap_xml', label: 'Sitemap.xml', status: 'pass', value: 'Accessible (200)', rating: 'Good', jsDependent: false, humanMessage: 'Your XML sitemap is accessible.', fix: ['Keep it updated', 'List canonical URLs', 'Submit it to Google'], suggestion: 'Serve sitemap.xml from the site root' },
        { id: 'canonical_tag', label: 'Canonical Tag', status: 'fail', value: 'Missing', rating: 'Poor', jsDependent: false, humanMessage: 'No canonical tag found on the page.', fix: ['Add canonical tag', 'Use final page URL', 'Keep one canonical'], suggestion: 'Add <link rel=\"canonical\" href=\"...\">' },
        { id: 'noindex_tag', label: 'Noindex Meta Tag', status: 'pass', value: 'Not present', rating: 'Good', jsDependent: false, humanMessage: 'No noindex directive was found.', fix: ['Keep pages indexable', 'Review CMS settings', 'Avoid accidental noindex'], suggestion: 'Use noindex only when you want the page hidden' },
        { id: 'https_ssl', label: 'HTTPS / SSL', status: 'pass', value: 'HTTPS enabled', rating: 'Good', jsDependent: false, humanMessage: 'The page is served securely over HTTPS.', fix: ['Keep SSL valid', 'Redirect HTTP to HTTPS', 'Renew certificates'], suggestion: 'Use HTTPS for all public pages' },
        { id: 'mobile_viewport', label: 'Mobile Viewport', status: 'pass', value: 'width=device-width, initial-scale=1', rating: 'Good', jsDependent: false, humanMessage: 'A mobile viewport tag is present.', fix: ['Keep responsive settings', 'Test mobile layouts', 'Avoid fixed widths'], suggestion: 'Add a mobile viewport tag' },
        { id: 'charset_declared', label: 'Charset Declaration', status: 'warning', value: 'Not declared', rating: 'Needs Improvement', jsDependent: false, humanMessage: 'Missing charset can cause rendering issues.', fix: ['Declare UTF-8', 'Place it early', 'Match server header'], suggestion: 'Use <meta charset=\"utf-8\">' },
        { id: 'html_lang', label: 'HTML Lang Attribute', status: 'warning', value: 'Missing', rating: 'Needs Improvement', jsDependent: false, humanMessage: 'Missing language attribute reduces accessibility clarity.', fix: ['Set html lang', 'Match primary language', 'Keep it accurate'], suggestion: 'Add a lang attribute on the html element' }
      ]
    },
    webVitals: {
      score: 60,
      rating: 'Needs Improvement',
      checks: [
        { id: 'lcp', label: 'Largest Contentful Paint', status: 'warning', value: '2.9s', rating: 'Needs Improvement', jsDependent: false, humanMessage: 'LCP measures when the main content becomes visible.', fix: ['Optimize hero assets', 'Improve server speed', 'Reduce render blocking'], suggestion: 'Aim for LCP under 2.5 seconds' },
        { id: 'inp', label: 'Interaction to Next Paint', status: 'pass', value: '184 ms', rating: 'Good', jsDependent: false, humanMessage: 'INP reflects how responsive the page feels to user input.', fix: ['Reduce JS work', 'Split long tasks', 'Trim event handlers'], suggestion: 'Aim for INP under 200 ms' },
        { id: 'cls', label: 'Cumulative Layout Shift', status: 'pass', value: '0.03', rating: 'Good', jsDependent: false, humanMessage: 'CLS captures unexpected layout movement during load.', fix: ['Set image dimensions', 'Reserve layout space', 'Avoid injected shifts'], suggestion: 'Aim for CLS under 0.1' },
        { id: 'ttfb', label: 'Time to First Byte', status: 'warning', value: '1.1s', rating: 'Needs Improvement', jsDependent: false, humanMessage: 'TTFB shows how quickly the server begins responding.', fix: ['Speed up backend', 'Use caching', 'Optimize hosting path'], suggestion: 'Aim for TTFB under 0.8 seconds' },
        { id: 'performance_score', label: 'Performance Score', status: 'warning', value: '63/100', rating: 'Needs Improvement', jsDependent: false, humanMessage: 'The Lighthouse performance score combines lab-based speed signals.', fix: ['Reduce JS', 'Compress assets', 'Optimize images'], suggestion: 'Aim for a Lighthouse performance score of 80 or higher' }
      ]
    },
    social: {
      score: 84,
      rating: 'Good',
      checks: [
        { id: 'og_title', label: 'Open Graph Title', status: 'pass', value: 'Technical SEO Audits for Growth Teams', rating: 'Good', jsDependent: false, humanMessage: 'OG title is ready for social sharing.', fix: ['Keep it aligned', 'Lead with message', 'Avoid truncation'], suggestion: 'Include a clear Open Graph title' },
        { id: 'og_description', label: 'Open Graph Description', status: 'pass', value: 'Get a deep audit of crawlability, indexing, metadata, and page speed.', rating: 'Good', jsDependent: false, humanMessage: 'OG description is present.', fix: ['Keep it aligned', 'Summarize value', 'Avoid duplication'], suggestion: 'Include a short Open Graph description' },
        { id: 'og_image', label: 'Open Graph Image', status: 'warning', value: 'Missing', rating: 'Needs Improvement', jsDependent: false, humanMessage: 'Missing OG image for social cards.', fix: ['Add og:image', 'Use large image', 'Avoid broken URLs'], suggestion: 'Include a 1200x630 social image when possible' },
        { id: 'twitter_card', label: 'Twitter Card', status: 'pass', value: 'summary_large_image', rating: 'Good', jsDependent: false, humanMessage: 'Twitter card metadata is present.', fix: ['Keep tags consistent', 'Use large image', 'Preview shared links'], suggestion: 'Add a Twitter card type meta tag' },
        { id: 'twitter_title_description', label: 'Twitter Title and Description', status: 'pass', value: 'Both present', rating: 'Good', jsDependent: false, humanMessage: 'Twitter metadata is complete.', fix: ['Keep it aligned', 'Match page intent', 'Preview shared links'], suggestion: 'Include both twitter:title and twitter:description' }
      ]
    },
    content: {
      score: 80,
      rating: 'Good',
      checks: [
        { id: 'favicon', label: 'Favicon', status: 'pass', value: 'https://www.greenframe.studio/favicon.ico', rating: 'Good', jsDependent: false, humanMessage: 'A favicon is available for the site.', fix: ['Keep icon updated', 'Use square asset', 'Provide fallback'], suggestion: 'Serve a favicon from /favicon.ico or a linked icon file' },
        { id: 'structured_data', label: 'Structured Data', status: 'pass', value: 'JSON-LD detected', rating: 'Good', jsDependent: false, humanMessage: 'Structured data was found on the page.', fix: ['Validate schema', 'Keep it relevant', 'Avoid errors'], suggestion: 'Add schema.org JSON-LD where relevant' },
        { id: 'broken_links', label: 'Broken Links', status: 'warning', value: '1 broken out of 14 checked', rating: 'Needs Improvement', jsDependent: true, humanMessage: 'Broken links can hurt trust and crawl efficiency.', fix: ['Fix dead URLs', 'Update old links', 'Monitor redirects'], suggestion: 'Keep broken links at zero when possible' },
        { id: 'inline_styles_ratio', label: 'Inline Styles Ratio', status: 'pass', value: '4% of elements use inline styles', rating: 'Good', jsDependent: false, humanMessage: 'Inline styling is kept under control.', fix: ['Keep styles reusable', 'Avoid unnecessary inline CSS', 'Use shared classes'], suggestion: 'Keep inline styles limited to edge cases' },
        { id: 'page_load_time', label: 'Page Load Time', status: 'pass', value: '1280 ms', rating: 'Good', jsDependent: true, humanMessage: 'The raw page responded quickly.', fix: ['Keep caching enabled', 'Compress assets', 'Watch backend latency'], suggestion: 'Aim for a server response under 1500 ms' }
      ]
    }
  },
  lighthouse: {
    performance: 63,
    accessibility: 88,
    bestPractices: 91,
    seo: 82
  },
  meta: {
    jsRendered: false,
    cachedResult: false,
    auditDuration: 14200
  }
};

module.exports = { mockAuditData };
