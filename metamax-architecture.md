# Metamax — Architecture Document v2
> A reliable, stateless, instant SEO & performance analysis platform.
> Zero paid services. Minimal API consumption. Maximum accuracy.

---

## 1. What We Are Building

Metamax is NOT just an SEO tool.
It is a **reliable distributed analysis platform** that accepts a URL and returns a complete, human-readable audit report within 20-30 seconds.

Users judge us on:
- **Accuracy** — checks must be correct, not approximate
- **Speed** — fast enough to feel instant
- **Consistency** — same URL always returns same result (within cache window)
- **Report clarity** — humans understand the output, not just developers
- **Trust** — no fake precision, no bloat, no dark patterns

We do NOT build:
- User accounts
- Stored reports / history
- Dashboards
- Enterprise flows
- Complicated SaaS onboarding

---

## 2. Full User Flow

```
Landing Page
  ↓
User enters URL → clicks Analyze
  ↓
Navigate to /scan page (URL passed as query param)
  ↓
Show URL input at top (editable)
  ↓
POST /audit → receive jobId immediately (< 100ms)
  ↓
Start loading animation
  ↓
Poll GET /audit/:jobId every 2 seconds
  ↓
Show live step progress (green check = done, spinner = current, grey = pending)
  ↓
All checks complete → render full report
```

---

## 3. Stack (100% Free, Zero Paid APIs)

| Layer | Tool | Cost | Why |
|---|---|---|---|
| Frontend | Next.js (React) | Free | Fast, SEO friendly, Vercel native |
| Styling | Tailwind CSS | Free | Utility first, no runtime cost |
| Backend | Node.js + Express | Free | Lightweight, easy to deploy |
| HTML Parsing | Cheerio + Axios | Free | Zero limits, no API key needed |
| Core Web Vitals | Google PageSpeed Insights API | Free | Free key = 25k req/day. Only for 5 checks. Cached aggressively. |
| IP Rate Limiting | express-rate-limit (npm) | Free | Protects PageSpeed quota from abuse |
| Job Store | In-memory Map | Free | No Redis needed at v1 |
| URL Cache | node-cache (npm) | Free | Cuts PageSpeed calls by ~80% |
| Frontend Deploy | Vercel (free tier) | Free | Perfect for Next.js |
| Backend Deploy | Railway (free tier) | Free | Persistent Node.js, no cold starts |

**Total infrastructure cost: $0**

---

## 4. API Consumption Strategy (Most Important Section)

### The Core Rule
```
28 checks  →  Cheerio + Axios  →  0 API calls, unlimited
 5 checks  →  PageSpeed API    →  1 call per unique URL per 15 min (cached)
```

### How We Protect the Quota

**Layer 1 — Dev mock (during build)**
```js
// Never touches PageSpeed API during development
if (process.env.NODE_ENV === 'development') {
  return mockAuditData
}
```

**Layer 2 — URL-level cache (production)**
```
Same URL requested within 15 min → return cached result → 0 PageSpeed calls
```

**Layer 3 — IP rate limiting**
```
Max 5 audits per IP per hour → prevents quota drain from abuse
```

**Layer 4 — Domain-level cache for sub-resources**
```
robots.txt  → cached per domain, TTL 15 min
sitemap.xml → cached per domain, TTL 15 min
```

**Real world math:**
- 25,000 free PageSpeed calls/day available
- Cache cuts ~80% of repeat requests
- Effectively supports ~125,000 audit requests/day before hitting any limit
- More than enough until serious paid scale

---

## 5. The 33 Checks

### On-Page SEO — 10 checks (Cheerio only, 0 API calls)

| # | Check | Method | Accuracy |
|---|---|---|---|
| 1 | Title tag exists + length (50-60 chars ideal) | Cheerio | 100% |
| 2 | Meta description exists + length (150-160 chars ideal) | Cheerio | 100% |
| 3 | H1 exists and only one H1 on page | Cheerio | 100% |
| 4 | H2-H6 hierarchy logical (no skipped levels) | Cheerio | 100% |
| 5 | Image alt tags (% of images with alt filled) | Cheerio | 100% |
| 6 | Internal links count | Cheerio | 90%~ |
| 7 | External links count | Cheerio | 90%~ |
| 8 | URL slug clean (no special chars, reasonable length) | URL parser | 100% |
| 9 | Page word count | Cheerio | 85%~ |
| 10 | Duplicate meta tags detected | Cheerio | 100% |

### Technical SEO — 8 checks (Axios + Cheerio, 0 API calls)

| # | Check | Method | Accuracy |
|---|---|---|---|
| 11 | robots.txt exists and accessible | Axios GET | 100% |
| 12 | sitemap.xml exists and accessible | Axios GET | 100% |
| 13 | Canonical tag present | Cheerio | 100% |
| 14 | Noindex tag detected | Cheerio | 100% |
| 15 | HTTPS / SSL active | URL parser | 100% |
| 16 | Mobile viewport meta tag present | Cheerio | 100% |
| 17 | Charset declared | Cheerio | 100% |
| 18 | Lang attribute on HTML tag | Cheerio | 100% |

### Core Web Vitals — 5 checks (PageSpeed API, 1 call per unique URL)

| # | Check | Method | Accuracy |
|---|---|---|---|
| 19 | LCP — Largest Contentful Paint | PageSpeed API | 100% |
| 20 | INP — Interaction to Next Paint | PageSpeed API | 100% |
| 21 | CLS — Cumulative Layout Shift | PageSpeed API | 100% |
| 22 | TTFB — Time to First Byte | PageSpeed API | 100% |
| 23 | Overall Performance Score (0-100) | PageSpeed API | 100% |

### Social & Metadata — 5 checks (Cheerio only, 0 API calls)

| # | Check | Method | Accuracy |
|---|---|---|---|
| 24 | OG title present | Cheerio | 100% |
| 25 | OG description present | Cheerio | 100% |
| 26 | OG image present | Cheerio | 100% |
| 27 | Twitter card tag present | Cheerio | 100% |
| 28 | Twitter title + description present | Cheerio | 100% |

### Content & Trust — 5 checks (Axios HEAD + Cheerio, 0 API calls)

| # | Check | Method | Accuracy |
|---|---|---|---|
| 29 | Favicon exists | Cheerio + Axios HEAD | 100% |
| 30 | Schema / JSON-LD structured data present | Cheerio | 100% |
| 31 | Broken links count (parallel HEAD requests) | Axios HEAD | 95%~ |
| 32 | Inline styles ratio | Cheerio | 100% |
| 33 | Page load time (Axios fetch duration) | Axios timing | 90%~ |

**~ = May be less accurate for JavaScript-rendered pages (React, Vue, Next.js apps)**

A small transparent note in the report: *"Checks marked ~ may be incomplete for JavaScript-rendered pages."* Honest. Builds trust.

---

## 6. API Contract

### POST /audit

**Request:**
```json
{ "url": "https://example.com" }
```

**Response (immediate, < 100ms):**
```json
{ "jobId": "abc123", "status": "processing" }
```

---

### GET /audit/:jobId — Polling Endpoint

**While processing:**
```json
{
  "jobId": "abc123",
  "status": "processing",
  "steps": [
    { "label": "Fetching page HTML", "status": "done" },
    { "label": "Running 28 SEO checks", "status": "done" },
    { "label": "Checking robots.txt & sitemap", "status": "processing" },
    { "label": "Running Core Web Vitals", "status": "pending" },
    { "label": "Checking social tags", "status": "pending" },
    { "label": "Compiling results", "status": "pending" }
  ],
  "data": null
}
```

**When complete:**
```json
{
  "jobId": "abc123",
  "status": "done",
  "meta": {
    "jsRendered": false,
    "cachedResult": false,
    "auditDuration": 14200
  },
  "steps": [ "...all done..." ],
  "data": {
    "url": "https://example.com",
    "scannedAt": "2026-05-10T10:00:00Z",
    "overallScore": 74,
    "overallRating": "Needs Improvement",
    "categories": {
      "onPage":    { "score": 80,  "rating": "Good",              "checks": [] },
      "technical": { "score": 60,  "rating": "Needs Improvement", "checks": [] },
      "webVitals": { "score": 55,  "rating": "Poor",              "checks": [] },
      "social":    { "score": 100, "rating": "Good",              "checks": [] },
      "content":   { "score": 70,  "rating": "Needs Improvement", "checks": [] }
    }
  }
}
```

**Individual Check Shape:**
```json
{
  "id": "title_length",
  "label": "Title Tag Length",
  "status": "fail",
  "value": "82 characters",
  "rating": "Poor",
  "jsDependent": false,
  "humanMessage": "Your title is too long and will be cut off in search results.",
  "fix": [
    "Keep title under 60 characters",
    "Put main keyword first",
    "Remove filler words"
  ],
  "suggestion": "Suggested length: 50 to 60 characters"
}
```

**Enums:**
- `rating`: `"Good"` | `"Needs Improvement"` | `"Poor"`
- `status`: `"pass"` | `"fail"` | `"warning"`
- `jsDependent`: `true` = may be inaccurate for JS-rendered pages

> Never decimal scores. Never "74.83". Integers or rating labels only.

---

## 7. Backend Architecture

```
Express Server (Node.js)
  │
  ├── POST /audit
  │     ├── 1. Validate + sanitize URL
  │     ├── 2. Block malicious targets (SSRF protection)
  │     ├── 3. Check URL cache → hit = return cached jobId instantly
  │     ├── 4. Create jobId + init steps array in jobs Map
  │     ├── 5. Fire async audit pipeline (non-blocking)
  │     └── 6. Return { jobId, status: "processing" } immediately
  │
  ├── GET /audit/:jobId
  │     ├── Look up job in Map
  │     ├── Return { status, steps, data } — data is null while processing
  │     └── 404 if jobId unknown
  │
  └── Async Audit Pipeline
        ├── Step 1: Fetch HTML via Axios (timeout 10s, max 5MB)
        │           → mark step "done", update job
        ├── Step 2: Run all 28 Cheerio checks in parallel
        │           (on-page + technical + social + content)
        │           → mark step "done", update job
        ├── Step 3: Fetch robots.txt + sitemap.xml (Axios, domain cache)
        │           → mark step "done", update job
        ├── Step 4: Call PageSpeed Insights API (URL cache, 15 min TTL)
        │           → mark step "done", update job
        ├── Step 5: Run broken link checks (parallel HEAD, max 20 links)
        │           → mark step "done", update job
        └── Step 6: Aggregate all results → compute scores → apply ratings
                    → store in jobs Map
                    → store in URL cache (TTL 15 min)
                    → mark job "done"
```

---

## 8. Security — SSRF & Abuse Protection

Every URL is validated before ANY network request is made:

```js
const BLOCKED_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0/,
  /^169\.254\./,                      // AWS metadata endpoint
  /^10\./,                            // Private class A
  /^172\.(1[6-9]|2\d|3[01])\./,      // Private class B
  /^192\.168\./,                      // Private class C
  /^::1$/,                            // IPv6 localhost
  /\.internal$/,
  /\.local$/,
]

function isSafeUrl(url) {
  const parsed = new URL(url)
  if (!['http:', 'https:'].includes(parsed.protocol)) return false
  if (BLOCKED_PATTERNS.some(p => p.test(parsed.hostname))) return false
  return true
}
```

**Additional protections:**
- Max response size: 5MB (zip bomb protection)
- Max redirects: 3 (redirect loop protection)
- Request timeout: 10 seconds hard limit
- IP rate limit: 5 audits per IP per hour
- Broken link checks capped at 20 links max per page

---

## 9. Caching Architecture

```
URL Cache (node-cache, TTL 15 min)
  Key: normalized URL string
  Value: full audit result JSON
  Purpose: main cache, prevents repeat full audits

Domain Cache (node-cache, TTL 15 min)
  Key: "robots:{domain}" or "sitemap:{domain}"
  Value: raw text content
  Purpose: prevents re-fetching same domain's files on every scan

PageSpeed Cache (node-cache, TTL 15 min)
  Key: "pagespeed:{url}"
  Value: raw PageSpeed API JSON response
  Purpose: most critical — directly protects your free quota
```

**Cache hit flow:**
```
POST /audit received
  ↓
URL normalized → check URL cache
  ↓ HIT
Return cached data immediately as new completed job → 0 pipeline runs → 0 API calls
  ↓ MISS
Run full pipeline → store result in all three caches → serve
```

---

## 10. UX Rules (Non-Negotiable)

| Rule | Bad | Good |
|---|---|---|
| Scores | 82.47 | 82 or "Good" |
| Vitals language | "CLS exceeds threshold" | "Layout shifts may cause users to click wrong elements" |
| Fix suggestions | Long paragraphs | Max 3 bullets, max 5 words each |
| Check descriptions | None | 7-8 words max under each failed check |
| Loading state | Frozen spinner | Live step progress with green checks |
| Wait time | No indication | "~15-25 seconds" shown upfront |
| JS-rendered caveat | Silently wrong data | Small transparent banner |

---

## 11. Dev Workflow — Zero API Waste

```js
// backend/audit/pipeline.js
const USE_MOCK = process.env.NODE_ENV === 'development'

export async function runAudit(url) {
  if (USE_MOCK) {
    await simulateStepDelays()   // realistic step timing for UI testing
    return mockAuditData         // never touches PageSpeed API
  }
  return await realPipeline(url)
}
```

**Rule: Build the entire frontend against mockAuditData. Switch to real pipeline only on final integration test. No exceptions.**

---

## 12. Folder Structure

```
metamax/
├── frontend/                       # Next.js
│   ├── pages/
│   │   ├── index.tsx               # Landing page
│   │   └── scan.tsx                # Scan + results page
│   ├── components/
│   │   ├── URLInput.tsx            # URL bar with https:// prefix display
│   │   ├── LoadingSteps.tsx        # Live progress with green checks
│   │   ├── ScoreRing.tsx           # Circular overall score display
│   │   ├── CategorySection.tsx     # Collapsible check category block
│   │   ├── CheckItem.tsx           # Individual pass/fail check row
│   │   └── FixSuggestion.tsx       # Actionable 3-bullet fix block
│   └── lib/
│       └── api.ts                  # All backend fetch calls (POST + polling)
│
└── backend/                        # Node.js + Express
    ├── index.js                    # Server entry, routes, CORS, rate limiter
    ├── audit/
    │   ├── pipeline.js             # Orchestrator — runs all steps in sequence
    │   ├── fetchPage.js            # Axios HTML fetch (timeout + size limit)
    │   ├── cheerioChecks.js        # All 28 Cheerio-based checks
    │   ├── pagespeed.js            # PageSpeed API call + response mapping
    │   └── brokenLinks.js          # Parallel HEAD requests, capped at 20
    ├── utils/
    │   ├── validateUrl.js          # SSRF + protocol security validation
    │   ├── cache.js                # node-cache wrapper (3 cache namespaces)
    │   ├── scorer.js               # Score aggregation + rating label logic
    │   └── normalizeUrl.js         # Canonical URL form for consistent cache keys
    └── mock/
        └── mockAuditData.js        # Full realistic mock response for dev
```

---

## 13. Deployment

| Service | Purpose | Cost |
|---|---|---|
| Vercel | Frontend (Next.js) | Free |
| Railway | Backend (Node.js Express) | Free tier |
| Google Cloud Console | PageSpeed Insights API key | Free (25k req/day) |

**Backend environment variables:**
```
PAGESPEED_API_KEY=your_google_cloud_key
NODE_ENV=production
PORT=3001
FRONTEND_ORIGIN=https://metamax.vercel.app
RATE_LIMIT_MAX=5
RATE_LIMIT_WINDOW_MS=3600000
CACHE_TTL_SECONDS=900
```

---

## 14. Accuracy Summary

| Category | Checks | API Calls | Accuracy |
|---|---|---|---|
| On-Page SEO | 10 | 0 | 90-100% |
| Technical SEO | 8 | 0 | 100% |
| Core Web Vitals | 5 | 1 per unique URL | 100% |
| Social & Metadata | 5 | 0 | 100% |
| Content & Trust | 5 | 0 | 90-100% |
| **Total** | **33** | **1 per unique URL** | **~96% avg** |

Only known limitation: JS-rendered pages (React/Vue/Next.js). Flagged transparently in report.

---

## 15. Build Order

```
Phase 1 — Architecture      ✅ This document (v2, locked)
Phase 2 — Backend Core      Express server + job Map + polling endpoints
Phase 3 — Mock Data         Full realistic mockAuditData.js
Phase 4 — Cheerio Checks    All 28 checks, tested against real URLs
Phase 5 — PageSpeed         API integration + response mapping + caching
Phase 6 — Security          URL validation + rate limiting
Phase 7 — Frontend          Landing + scan page + polling + report UI
Phase 8 — Integration       Wire frontend to real backend, end-to-end test
Phase 9 — Deploy            Vercel + Railway + real API key
```

---

*v2 locked. $0 infra. 1 API call per unique URL per 15 min. 33 checks. 96% avg accuracy. Ready for backend.*

---

## 16. Report UI Specification (Locked)

This section defines exactly what the scan results page looks like.
Any developer or LLM building the frontend must follow this spec precisely.

---

### Page Layout

```
/scan?url=https://example.com
  │
  ├── [Top Bar] URL input (editable) + SCAN button
  │
  ├── [Result Header]
  │     ├── Scanned URL as clickable blue link
  │     ├── Redirect info if applicable: "↳ redirected from http://..."
  │     ├── Scan timestamp
  │     └── Action buttons: [↓ Export Markdown]  [↺ Re-scan]
  │
  ├── [Overall Score Section]  ← full width card
  │     ├── LEFT: Large circular ring — Overall Score (e.g. 92/100) + label ("Excellent")
  │     ├── MIDDLE: Summary line — "0 critical · 8 warnings · 21 passing"
  │     └── RIGHT: 4 smaller rings — SEO / Performance / Accessibility / Best Practices
  │
  └── [Two Column Layout]
        ├── LEFT (60%): SEO Audit Panel
        └── RIGHT (40%): Lighthouse Panel
```

---

### Overall Score Section

- Single large circular ring, color based on score:
  - 80-100 → green
  - 50-79  → orange/yellow
  - 0-49   → red
- Score label below ring: `"Excellent"` | `"Good"` | `"Needs Improvement"` | `"Poor"`
- Summary line: `X critical · X warnings · X passing` (dot-separated, no commas)
- 4 smaller rings to the right, same color logic, labeled: SEO / Performance / Accessibility / Best Practices
- All Lighthouse scores come from PageSpeed API response

---

### SEO Audit Panel (Left Column)

**Header row:**
```
SEO Audit                    ● 0 fail  ● 8 warn  ● 21 pass
```
- Title bold, left aligned
- Legend right aligned: red dot + count, orange dot + count, green dot + count

**Check groups — in order:**
```
CRITICAL    ← small uppercase label, spaced letter tracking
IMPORTANT
```

**Individual check item — PASS (green):**
```
✓  Title Tag
   "Pratham Yadav — Full Stack Developer | Portfolio" — 48 chars, ideal length.
```
- Green left border bar (3px)
- Green ✓ icon
- Bold label
- Muted description showing actual extracted value

**Individual check item — WARNING (yellow):**
```
⚠  Internal Links
   No internal links found. Internal linking helps Google crawl and rank your pages.
```
- Yellow/orange left border bar (3px)
- Yellow ⚠ icon
- Bold label
- Human-language explanation (max 10 words)

**Individual check item — FAIL (red, minimal):**
```
✗  Canonical URL
   No canonical tag found. Add <link rel="canonical"> to prevent duplicate content.
```
- Red left border bar (3px)
- Red ✗ icon, small and not visually dominant
- Bold label
- Short fix suggestion (max 10 words)
- No background fill — just the border bar signals severity

**Grouping priority logic:**
```
CRITICAL  = status "fail"
IMPORTANT = status "warn"
(passing checks shown at bottom, collapsed by default or shown greyed)
```

---

### Lighthouse Panel (Right Column)

**Section 1 — Lighthouse Scores:**
```
Lighthouse

LIGHTHOUSE SCORES

  [95/100]        [87/100]
  Performance     Accessibility

  [81/100]        [100/100]
  Best Practices  SEO
```
- 2x2 grid of circular rings
- Same color logic: green (80+), orange (50-79), red (<50)
- Score + /100 inside ring
- Label below ring

**Section 2 — Core Web Vitals:**
```
CORE WEB VITALS

│ LCP   Largest Contentful Paint    2.8s   NEEDS WORK
│ FCP   First Contentful Paint      1.4s   GOOD
│ CLS   Cumulative Layout Shift     0.02   GOOD
│ INP   Interaction to Next Paint   180ms  GOOD
│ TTFB  Time to First Byte          0.6s   GOOD
```
- Each row: left orange/green accent bar + metric acronym + full name + value + badge
- Badge: `GOOD` (green bg) or `NEEDS WORK` (orange bg), small pill style
- Thresholds (Google standard):
  - LCP: good < 2.5s, needs work < 4s
  - FCP: good < 1.8s, needs work < 3s
  - CLS: good < 0.1, needs work < 0.25
  - INP: good < 200ms, needs work < 500ms
  - TTFB: good < 0.8s, needs work < 1.8s

---

### Export Markdown Button

Generates and downloads a `.md` file with:
```markdown
# Metamax Audit Report
**URL:** https://example.com
**Scanned:** 2026-05-10 14:32

## Overall Score: 92/100 — Excellent

## SEO · 86/100
## Performance · 95/100
## Accessibility · 87/100
## Best Practices · 81/100

## Checks

### Critical
- ✗ Canonical URL — No canonical tag found.

### Warnings
- ⚠ Meta Description — Too long (250 chars). Trim to 160.
- ⚠ Internal Links — No internal links found.

### Passing
- ✓ Title Tag — 48 chars, ideal length.
- ✓ H1 Tag — Single H1 present.
- ✓ HTTPS / SSL — Secure connection confirmed.

## Core Web Vitals
- LCP: 2.8s — Needs Work
- FCP: 1.4s — Good
- CLS: 0.02 — Good
```
- Generated entirely client-side from the audit JSON
- No server call needed for export
- Use `Blob` + `URL.createObjectURL` to trigger download

---

### Re-scan Button

- Calls `POST /audit` with the same URL again
- Bypasses cache (send `{ url, force: true }` — backend skips cache lookup if `force === true`)
- Resets UI to loading state, reruns full polling flow

---

### Color & Status Reference

| Status | Icon | Left Border | Background |
|---|---|---|---|
| pass | ✓ green | green 3px | none |
| warn | ⚠ orange | orange 3px | none |
| fail | ✗ red (small) | red 3px | none |

No colored background fills on check items. Border bar only. Keeps it minimal and clean.

---

### Component Map

| Component | Purpose |
|---|---|
| `URLInput.tsx` | Top bar URL input with https:// prefix + SCAN button |
| `ResultHeader.tsx` | Scanned URL + redirect info + timestamp + Export + Re-scan |
| `OverallScoreCard.tsx` | Large ring + label + summary + 4 small rings |
| `ScoreRing.tsx` | Reusable circular ring, accepts score + size + label |
| `SEOAuditPanel.tsx` | Left column — grouped check list |
| `CheckItem.tsx` | Single check row — pass/warn/fail variant |
| `LighthousePanel.tsx` | Right column — 2x2 rings + Core Web Vitals rows |
| `VitalRow.tsx` | Single CWV row — acronym + name + value + badge |
| `ExportButton.tsx` | Client-side markdown export logic |

