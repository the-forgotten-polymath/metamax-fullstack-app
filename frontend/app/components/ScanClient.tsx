"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  AlertTriangle,
  Braces,
  Check,
  ChevronDown,
  FileCode,
  FileText,
  Globe,
  RefreshCcw,
  RotateCw,
  X,
} from "lucide-react";
import Navbar from "./Navbar";
import ScoreRing, { scoreRating, scoreTextColor } from "./ScoreRing";
import UrlScanForm from "./UrlScanForm";

type StepStatus = "done" | "processing" | "pending";
type CheckStatus = "pass" | "warning" | "fail";

type AuditStep = {
  label: string;
  status: StepStatus;
};

type AuditCheck = {
  id?: string;
  label: string;
  status: CheckStatus;
  value?: string;
  humanMessage?: string;
  suggestion?: string;
  fix?: string[];
};

type AuditCategory = {
  score?: number;
  rating?: string;
  checks?: AuditCheck[];
};

type AuditData = {
  url: string;
  finalUrl?: string;
  scannedAt?: string;
  overallScore?: number;
  overallRating?: string;
  categories?: Record<string, AuditCategory>;
  lighthouse?: {
    performance?: number | null;
    accessibility?: number | null;
    bestPractices?: number | null;
    seo?: number | null;
  };
};

type JobStatus = "processing" | "done" | "error" | "failed";

type JobResponse = {
  jobId?: string;
  status?: JobStatus;
  steps?: AuditStep[];
  data?: AuditData | null;
  error?: string;
};

const DEFAULT_LOCAL_API_URL = "http://localhost:3001";
const DEFAULT_PRODUCTION_API_URL = "https://metamax-un13.onrender.com";
const POLL_INTERVAL_MS = 2000;

function normalizeApiBase(value: string) {
  return value.trim().replace(/\/+$/g, "");
}

function isVercelBackendProxy(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/")) return true;

  try {
    const url = new URL(trimmed);
    return url.pathname.startsWith("/_/backend") || url.pathname.startsWith("/_backend");
  } catch {
    return false;
  }
}

function resolveApiBase() {
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (publicApiUrl && (process.env.NODE_ENV !== "production" || !isVercelBackendProxy(publicApiUrl))) {
    return normalizeApiBase(publicApiUrl);
  }

  if (process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_BACKEND_URL) {
    return normalizeApiBase(process.env.NEXT_PUBLIC_BACKEND_URL);
  }

  return process.env.NODE_ENV === "production" ? DEFAULT_PRODUCTION_API_URL : DEFAULT_LOCAL_API_URL;
}

const API_BASE = resolveApiBase();

const fallbackSteps: AuditStep[] = [
  { label: "Fetching page HTML", status: "processing" },
  { label: "Running 30+ SEO checks", status: "pending" },
  { label: "Checking robots.txt & sitemap.xml", status: "pending" },
  { label: "Running Lighthouse audit", status: "pending" },
  { label: "Measuring Core Web Vitals", status: "pending" },
  { label: "Compiling results", status: "pending" },
];

const vitalNames: Record<string, string> = {
  lcp: "Largest Contentful Paint",
  fcp: "First Contentful Paint",
  cls: "Cumulative Layout Shift",
  inp: "Interaction to Next Paint",
  ttfb: "Time to First Byte",
};

function normalizeStatus(status: string | undefined): CheckStatus {
  if (status === "warning" || status === "warn") return "warning";
  if (status === "fail" || status === "error") return "fail";
  return "pass";
}

function allChecks(data: AuditData | null) {
  if (!data?.categories) return [];
  return Object.values(data.categories).flatMap((category) => category.checks || []);
}

function countByStatus(checks: AuditCheck[], status: CheckStatus) {
  return checks.filter((check) => normalizeStatus(check.status) === status).length;
}

function scoreSummary(data: AuditData | null) {
  const checks = allChecks(data);
  return {
    critical: countByStatus(checks, "fail"),
    warnings: countByStatus(checks, "warning"),
    passing: countByStatus(checks, "pass"),
  };
}

function timestamp(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getDescription(check: AuditCheck) {
  return [check.value, check.humanMessage, check.suggestion]
    .filter(Boolean)
    .map((part) => String(part).replace(/[.\s]+$/g, ""))
    .join(". ");
}

function ratingLabel(status: CheckStatus) {
  if (status === "pass") return "good";
  if (status === "warning") return "needs work";
  return "poor";
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || "site";
  } catch {
    return "site";
  }
}

function displayUrl(url: string) {
  try {
    const parsed = new URL(url);
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`.replace(/\/$/g, "");
    return `${parsed.hostname.replace(/^www\./, "")}${path === "/" ? "" : path}`;
  } catch {
    return url.replace(/^https?:\/\//i, "").replace(/\/$/g, "");
  }
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function scoreValue(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0;
}

function hasScore(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value);
}

function scoreReportLabel(value?: number | null) {
  return hasScore(value) ? `${scoreValue(value)}/100` : "n/a";
}

function getPayloadError(payload: unknown) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  }

  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }

  return "";
}

function isFailureStatus(status: JobStatus | undefined) {
  return status === "error" || status === "failed";
}

async function readJsonResponse<T>(response: Response, context: string): Promise<T> {
  const text = await response.text();
  let payload: unknown = null;

  if (!text.trim()) {
    throw new Error(`${context} returned an empty response (${response.status}).`);
  }

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      const preview = text.replace(/\s+/g, " ").trim().slice(0, 180) || "empty response";
      throw new Error(`${context} returned a non-JSON response (${response.status}): ${preview}`);
    }
  }

  if (!response.ok) {
    throw new Error(getPayloadError(payload) || `${context} failed with status ${response.status}.`);
  }

  return payload as T;
}

function makeMarkdown(data: AuditData) {
  const grouped = groupChecks(data);
  const vitals = webVitalChecks(data);
  const lighthouse = data.lighthouse || {};
  const overallScore = scoreValue(data.overallScore);
  const overallRating = data.overallRating || scoreRating(overallScore);
  const checkLine = (check: AuditCheck, includeValue = false) => {
    const detail = includeValue ? check.value || getDescription(check) : check.humanMessage || getDescription(check);
    const fix = check.fix?.length ? ` Fix: ${check.fix.join("; ")}` : check.suggestion ? ` Fix: ${check.suggestion}` : "";
    return `- ${check.label}${detail ? ` — ${detail}` : ""}${fix}`;
  };
  const lines = [
    "# Metamax Audit Report",
    "",
    `**URL:** ${data.finalUrl || data.url}`,
    `**Scanned:** ${data.scannedAt ? timestamp(data.scannedAt) : "n/a"}`,
    `**Overall Score:** ${overallScore}/100 — ${overallRating}`,
    "",
    "## Lighthouse Scores",
    "",
    `- SEO: ${scoreReportLabel(lighthouse.seo)}`,
    `- Performance: ${scoreReportLabel(lighthouse.performance)}`,
    `- Accessibility: ${scoreReportLabel(lighthouse.accessibility)}`,
    `- Best Practices: ${scoreReportLabel(lighthouse.bestPractices)}`,
    "",
    "## Core Web Vitals",
    ...vitals.map((vital) => `- ${vital.id}: ${vital.value} — ${ratingLabel(vital.status)}`),
    "",
    "## Critical Issues",
    ...(grouped.critical.length ? grouped.critical.map((check) => checkLine(check)) : ["- None"]),
    "",
    "## Warnings",
    ...(grouped.important.length ? grouped.important.map((check) => checkLine(check)) : ["- None"]),
    "",
    "## Passing Checks",
    ...(grouped.passing.length ? grouped.passing.map((check) => checkLine(check, true)) : ["- None"]),
    "",
  ];

  return lines.filter((line) => line !== "").join("\n");
}

function makeHtmlReport(data: AuditData) {
  const grouped = groupChecks(data);
  const vitals = webVitalChecks(data);
  const lighthouse = data.lighthouse || {};
  const finalUrl = data.finalUrl || data.url;
  const overallScore = scoreValue(data.overallScore);
  const overallRating = data.overallRating || scoreRating(overallScore);
  const scoreCards: Array<[string, number | null | undefined]> = [
    ["SEO", lighthouse.seo],
    ["Performance", lighthouse.performance],
    ["Accessibility", lighthouse.accessibility],
    ["Best Practices", lighthouse.bestPractices],
  ];
  const renderChecks = (title: string, checks: AuditCheck[], color: string) => `
    <section>
      <h2>${escapeHtml(title)}</h2>
      ${checks.length ? checks.map((check) => `
        <article class="check" style="border-left-color:${color}">
          <strong>${escapeHtml(check.label)}</strong>
          <p>${escapeHtml(getDescription(check) || "No additional details.")}</p>
        </article>
      `).join("") : `<article class="check" style="border-left-color:${color}"><strong>None</strong></article>`}
    </section>
  `;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Metamax Audit Report</title>
  <style>
    body { margin: 0; background: linear-gradient(180deg,#f4f5f8 0%,#eceef5 44%,#dfe1eb 100%); color: #0A0A0F; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-weight: 300; }
    main { max-width: 980px; margin: 0 auto; padding: 40px 24px; }
    header { border-bottom: 1px solid #E5E7EB; padding-bottom: 24px; margin-bottom: 28px; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    h2 { margin: 32px 0 14px; font-size: 18px; }
    .muted { color: #6B7280; }
    .score { display: inline-flex; margin-top: 16px; border-radius: 8px; background: rgba(255,255,255,.58); padding: 14px 18px; font-size: 26px; font-weight: 300; color: #4F46E5; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
    .card { border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px; }
    .card strong { display: block; font-size: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border-bottom: 1px solid #E5E7EB; padding: 12px; text-align: left; }
    .check { border: 1px solid rgba(255,255,255,.7); border-left: 4px solid #4F46E5; border-radius: 8px; padding: 14px 16px; margin: 10px 0; background: rgba(255,255,255,.44); }
    .check p { margin: 6px 0 0; color: #6B7280; }
    footer { margin-top: 42px; padding-top: 18px; border-top: 1px solid #E5E7EB; color: #6B7280; }
    @media (max-width: 720px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>${escapeHtml(finalUrl)}</h1>
      <div class="muted">${escapeHtml(timestamp(data.scannedAt))}</div>
      <div class="score">${overallScore}/100 - ${escapeHtml(overallRating)}</div>
    </header>
    <section class="grid">
      ${scoreCards.map(([label, value]) => `<div class="card"><span class="muted">${escapeHtml(label)}</span><strong>${scoreReportLabel(value)}</strong></div>`).join("")}
    </section>
    ${renderChecks("Critical Issues", grouped.critical, "#DC2626")}
    ${renderChecks("Warnings", grouped.important, "#D97706")}
    ${renderChecks("Passing Checks", grouped.passing, "#4F46E5")}
    <section>
      <h2>Core Web Vitals</h2>
      <table>
        <thead><tr><th>Metric</th><th>Value</th><th>Rating</th></tr></thead>
        <tbody>
          ${vitals.map((vital) => `<tr><td>${escapeHtml(vital.id)}</td><td>${escapeHtml(vital.value)}</td><td>${escapeHtml(ratingLabel(vital.status))}</td></tr>`).join("")}
        </tbody>
      </table>
    </section>
    <footer>Generated by Metamax</footer>
  </main>
</body>
</html>`;
}

function webVitalChecks(data: AuditData | null) {
  const category = data?.categories?.webVitals;
  const checks = category?.checks || [];
  const wanted = ["lcp", "fcp", "cls", "inp", "ttfb"];
  return wanted.map((id) => {
    const found = checks.find((check) => check.id?.toLowerCase() === id);
    return {
      id: id.toUpperCase(),
      fullName: vitalNames[id],
      value: found?.value || "n/a",
      status: normalizeStatus(found?.status),
    };
  });
}

function groupChecks(data: AuditData | null) {
  const checks = allChecks(data).map((check) => ({ ...check, status: normalizeStatus(check.status) }));
  return {
    critical: checks.filter((check) => check.status === "fail"),
    important: checks.filter((check) => check.status === "warning"),
    passing: checks.filter((check) => check.status === "pass"),
  };
}

function orderedAuditChecks(grouped: ReturnType<typeof groupChecks>) {
  return [...grouped.critical, ...grouped.important, ...grouped.passing];
}

function estimateCheckHeight(check: AuditCheck) {
  const details = getDescription(check);
  const titleLines = Math.max(1, Math.ceil(check.label.length / 34));
  const detailLines = details.length > 150 ? 2 : Math.max(2, Math.ceil(details.length / 68));
  return 58 + titleLines * 22 + detailLines * 22;
}

function estimateLighthouseHeight(data: AuditData) {
  const vitalsCount = webVitalChecks(data).length;
  return 390 + vitalsCount * 74;
}

function splitAuditChecks(checks: AuditCheck[], data: AuditData) {
  return checks.reduce(
    (columns, check) => {
      const estimatedHeight = estimateCheckHeight(check);
      if (columns.leftHeight <= columns.rightHeight) {
        columns.left.push(check);
        columns.leftHeight += estimatedHeight;
      } else {
        columns.right.push(check);
        columns.rightHeight += estimatedHeight;
      }
      return columns;
    },
    {
      left: [] as AuditCheck[],
      right: [] as AuditCheck[],
      leftHeight: 150,
      rightHeight: estimateLighthouseHeight(data),
    }
  );
}

export default function ScanClient() {
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url") || "https://example.com";
  const [url, setUrl] = useState(initialUrl);
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [steps, setSteps] = useState<AuditStep[]>(fallbackSteps);
  const [data, setData] = useState<AuditData | null>(null);
  const [error, setError] = useState("");
  const pollTimeoutRef = useRef<number | null>(null);

  const startAudit = useCallback(async (targetUrl: string, force = false) => {
    setUrl(targetUrl);
    setStatus("loading");
    setData(null);
    setError("");
    setSteps(fallbackSteps);

    if (pollTimeoutRef.current) {
      window.clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }

    try {
      const response = await fetch(`${API_BASE}/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl, force }),
      });

      const job = await readJsonResponse<JobResponse>(response, "Starting audit");
      if (job.steps?.length) setSteps(job.steps);

      if (job.status === "done" && job.data) {
        setData(job.data);
        setStatus("done");
        return;
      }

      if (isFailureStatus(job.status)) {
        throw new Error(job.error || "Audit failed.");
      }

      if (!job.jobId) {
        throw new Error("Audit start response did not include a job id.");
      }

      const poll = async (): Promise<boolean> => {
        const pollResponse = await fetch(`${API_BASE}/audit/${job.jobId}`);
        const payload = await readJsonResponse<JobResponse>(pollResponse, "Fetching audit status");

        if (payload.steps?.length) setSteps(payload.steps);

        if (payload.status === "done") {
          if (!payload.data) {
            throw new Error("Audit completed without report data.");
          }

          if (pollTimeoutRef.current) {
            window.clearTimeout(pollTimeoutRef.current);
            pollTimeoutRef.current = null;
          }
          setData(payload.data);
          setStatus("done");
          return true;
        }

        if (isFailureStatus(payload.status)) {
          throw new Error(payload.error || "Audit failed.");
        }

        return false;
      };

      const schedulePoll = () => {
        pollTimeoutRef.current = window.setTimeout(() => {
          poll()
            .then((isComplete) => {
              if (!isComplete) schedulePoll();
            })
            .catch((pollError) => {
              if (pollTimeoutRef.current) window.clearTimeout(pollTimeoutRef.current);
              pollTimeoutRef.current = null;
              setError(pollError instanceof Error ? pollError.message : "Audit failed.");
              setStatus("error");
            });
        }, POLL_INTERVAL_MS);
      };

      const isComplete = await poll();
      if (!isComplete) schedulePoll();
    } catch (requestError) {
      if (pollTimeoutRef.current) {
        window.clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
      setError(requestError instanceof Error ? requestError.message : "Audit failed.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      startAudit(initialUrl);
    }, 0);
    return () => {
      window.clearTimeout(timeout);
      if (pollTimeoutRef.current) {
        window.clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, [initialUrl, startAudit]);

  const summary = useMemo(() => scoreSummary(data), [data]);
  const grouped = useMemo(() => groupChecks(data), [data]);
  const overall = data?.overallScore ?? 0;
  const rating = data?.overallRating || scoreRating(overall);

  return (
    <main className="relative isolate min-h-screen overflow-x-hidden bg-transparent text-[#0A0A0F]">
      <ScanBackdrop />
      <div className="no-print">
        <Navbar>
          <div className="w-full max-w-sm">
            <UrlScanForm
              key={`navbar-${url}`}
              initialValue={url}
              compact
              showProtocolPrefix={false}
              buttonLabel="Scan"
              onSubmitUrl={(targetUrl) => startAudit(targetUrl, true)}
            />
          </div>
        </Navbar>
      </div>

      <div className="mx-auto w-full max-w-7xl px-3 pb-10 pt-5 min-[380px]:px-4 sm:px-8 sm:pb-12 sm:pt-10">
        {status === "loading" && (
          <div className="no-print">
            <LoadingState steps={steps} />
          </div>
        )}
        {status === "error" && (
          <div className="no-print">
            <ErrorState message={error} onRetry={() => startAudit(url, true)} />
          </div>
        )}
        {status === "done" && data && (
          <ResultsState
            data={data}
            grouped={grouped}
            summary={summary}
            overall={overall}
            rating={rating}
            onRescan={() => startAudit(url, true)}
          />
        )}
      </div>
    </main>
  );
}

function ScanBackdrop() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 -z-30 overflow-hidden">
        <Image
          src="/b2.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="h-full w-full scale-110 object-cover object-bottom opacity-95 blur-2xl saturate-125"
        />
      </div>
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[linear-gradient(180deg,rgba(255,255,255,0.86)_0%,rgba(255,255,255,0.54)_44%,rgba(245,247,255,0.38)_100%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-white/18 backdrop-blur-[2px]" />
    </>
  );
}

function ExportDropdown({ data }: { data: AuditData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const domain = safeDomain(data.url);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!showToast) return;
    const timeout = window.setTimeout(() => setShowToast(false), 2000);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [showToast]);

  function notifyExportReady() {
    setShowToast(true);
  }

  function finishExport() {
    setIsOpen(false);
    notifyExportReady();
  }

  function exportPdf() {
    document.body.classList.add("printing");
    setIsOpen(false);
    window.setTimeout(() => {
      window.print();
      document.body.classList.remove("printing");
      notifyExportReady();
    }, 0);
  }

  const items = [
    {
      label: "Export as PDF",
      icon: FileText,
      onClick: exportPdf,
    },
    {
      label: "Export as Markdown",
      icon: FileCode,
      onClick: () => {
        downloadFile(makeMarkdown(data), `metamax-audit-${domain}.md`, "text/markdown");
        finishExport();
      },
    },
    {
      label: "Export as HTML",
      icon: Globe,
      onClick: () => {
        downloadFile(makeHtmlReport(data), `metamax-audit-${domain}.html`, "text/html");
        finishExport();
      },
    },
    {
      label: "Export as JSON",
      icon: Braces,
      onClick: () => {
        downloadFile(JSON.stringify(data, null, 2), `metamax-audit-${domain}.json`, "application/json");
        finishExport();
      },
    },
  ];

  return (
    <div ref={dropdownRef} className="relative min-w-0">
      <button
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/60 bg-white/28 px-3 py-2 text-[13px] font-light text-[#0A0A0F] backdrop-blur-2xl transition hover:bg-white/48 sm:w-auto sm:px-4"
      >
        Export
        <ChevronDown size={16} strokeWidth={1.8} />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 max-w-[calc(100vw-1.5rem)] rounded-lg border border-white/60 bg-white/52 p-1 shadow-[0_24px_70px_rgba(15,23,42,0.14)] backdrop-blur-2xl">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-white/70"
              >
                <Icon size={16} strokeWidth={1.7} className="shrink-0 text-[#0A0A0F]" />
                <span className="block text-[13px] font-normal text-[#0A0A0F]">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
      {showToast && (
        <div className="fixed bottom-5 right-5 z-[60] rounded-md bg-[#090A12] px-4 py-2 text-sm font-light text-white shadow-lg">
          Export ready
        </div>
      )}
    </div>
  );
}

function LoadingState({ steps }: { steps: AuditStep[] }) {
  const activeStep = steps.find((step) => step.status === "processing")?.label || "Fetching details";
  const completedCount = steps.filter((step) => step.status === "done").length;

  return (
    <section className="flex min-h-[calc(100vh-180px)] flex-col items-center justify-center px-3 text-center min-[360px]:px-4">
      <div className="w-full max-w-xl rounded-lg border border-white/65 bg-white/34 p-4 text-left shadow-[0_34px_120px_rgba(15,23,42,0.10)] backdrop-blur-[34px] min-[380px]:p-6">
        <div className="flex min-w-0 items-center gap-3 min-[380px]:gap-4">
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/70 bg-white/38">
            <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-[#4F46E5]/40" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#4F46E5]" />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-light text-[#0A0A0F] min-[380px]:text-xl">Building report</h1>
            <p className="mt-1 truncate text-sm font-light text-[#616674]">{activeStep}</p>
          </div>
          <span className="ml-auto shrink-0 text-xs font-light text-[#616674]">{completedCount}/{steps.length}</span>
        </div>

        <div className="mt-6 overflow-hidden rounded-full border border-white/60 bg-white/36">
          <div className="h-1.5 w-1/3 rounded-full bg-[linear-gradient(90deg,transparent,#4F46E5,transparent)] [animation:metamax-sweep_1.8s_ease-in-out_infinite]" />
        </div>

        <div className="mt-7 space-y-3">
          <div className="h-3 w-3/4 animate-pulse rounded-full bg-white/56" />
          <div className="h-3 w-full animate-pulse rounded-full bg-white/44 [animation-delay:120ms]" />
          <div className="h-3 w-2/3 animate-pulse rounded-full bg-white/38 [animation-delay:240ms]" />
        </div>

        <div className="mt-7 grid min-w-0 gap-2 sm:grid-cols-2">
          {steps.map((step) => {
            const isDone = step.status === "done";
            const isActive = step.status === "processing";

            return (
              <div key={step.label} className="flex min-w-0 items-center gap-3 overflow-hidden rounded-md border border-white/45 bg-white/20 px-3 py-2.5">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                    isDone
                      ? "border-[#21A67A]/30 bg-[#21A67A] text-white"
                      : isActive
                        ? "border-[#4F46E5]/40 bg-white/42"
                        : "border-white/55 bg-white/22"
                  }`}
                >
                  {isDone ? <Check size={13} strokeWidth={1.8} /> : isActive ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4F46E5]" /> : null}
                </span>
                <span className={`min-w-0 truncate text-[12px] font-light ${isActive ? "text-[#0A0A0F]" : isDone ? "text-[#4B5563]" : "text-[#8D93A0]"}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-180px)] max-w-xl flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-white/60 bg-white/44 text-[#C84E4E] backdrop-blur-2xl">
        <AlertTriangle size={28} strokeWidth={1.8} />
      </div>
      <h1 className="mt-6 text-2xl font-light text-[#0A0A0F] sm:text-3xl">Audit could not finish</h1>
      <p className="mt-3 break-words font-light text-[#616674]">{message}</p>
      <button
        onClick={onRetry}
        className="mt-8 inline-flex items-center gap-2 rounded-md bg-[#090A12] px-5 py-2.5 text-sm font-normal text-white transition hover:bg-[#1A1B24]"
      >
        <RefreshCcw size={16} strokeWidth={1.8} />
        Retry
      </button>
    </section>
  );
}

type ResultsProps = {
  data: AuditData;
  grouped: ReturnType<typeof groupChecks>;
  summary: ReturnType<typeof scoreSummary>;
  overall: number;
  rating: string;
  onRescan: () => void;
};

function ResultsState({ data, grouped, summary, overall, rating, onRescan }: ResultsProps) {
  const finalUrl = data.finalUrl || data.url;
  const finalUrlLabel = displayUrl(finalUrl);
  const originalUrlLabel = displayUrl(data.url);
  const lighthouse = data.lighthouse || {};
  const lighthouseScores = [
    { label: "SEO", value: lighthouse.seo },
    { label: "Performance", value: lighthouse.performance },
    { label: "Accessibility", value: lighthouse.accessibility },
    { label: "Best Practices", value: lighthouse.bestPractices },
  ];

  return (
    <div className="scan-results-section min-w-0 space-y-8">
      <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="min-w-0">
          <p className="text-sm font-light text-[#616674]">Results for</p>
          <a href={finalUrl} target="_blank" rel="noreferrer" className="mt-1 block max-w-full break-words text-xl font-light leading-tight text-[#4F46E5] [overflow-wrap:anywhere] min-[360px]:text-[22px] sm:text-2xl">
            {finalUrlLabel}
          </a>
          {finalUrl !== data.url && <p className="mt-1 break-words text-sm font-light text-[#616674] [overflow-wrap:anywhere]">Redirected from {originalUrlLabel}</p>}
          <p className="mt-2 text-sm font-light text-[#616674]">{timestamp(data.scannedAt)}</p>
        </div>
        <div className="no-print grid w-full grid-cols-1 gap-2.5 min-[340px]:grid-cols-2 sm:flex sm:w-auto sm:flex-wrap sm:gap-3">
          <ExportDropdown data={data} />
          <button
            onClick={onRescan}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-white/60 bg-white/28 px-3 py-2 text-sm font-light text-[#0A0A0F] backdrop-blur-2xl transition hover:bg-white/48 sm:px-4"
          >
            <RotateCw size={16} strokeWidth={1.8} />
            Re-scan
          </button>
        </div>
      </section>

      <section className="grid min-w-0 gap-5 rounded-lg border border-white/60 bg-white/38 p-4 shadow-[0_28px_90px_rgba(15,23,42,0.10)] backdrop-blur-2xl min-[380px]:p-5 sm:gap-6 sm:p-8 lg:grid-cols-[180px_1fr_360px] lg:items-center">
        <div className="flex flex-col items-center">
          <ScoreRing score={overall} size={120} strokeWidth={9} label="Total Evaluation" />
        </div>
        <div className="min-w-0 text-center sm:text-left">
          <h1 className={`text-3xl font-light sm:text-[32px] ${scoreTextColor(overall)}`}>
            {rating}
          </h1>
          <p className="mt-3 text-sm font-light leading-6 text-[#616674] sm:text-base">
            {summary.critical} critical · {summary.warnings} warnings · {summary.passing} passing
          </p>
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-3 min-[380px]:gap-4 sm:grid-cols-4 lg:grid-cols-4">
          {lighthouseScores.map((score) => (
            <ScoreRing key={score.label} score={score.value} size={64} strokeWidth={6} label={score.label} />
          ))}
        </div>
      </section>

      <AuditBoard grouped={grouped} summary={summary} data={data} />
    </div>
  );
}

function AuditBoard({
  grouped,
  summary,
  data,
}: {
  grouped: ReturnType<typeof groupChecks>;
  summary: ReturnType<typeof scoreSummary>;
  data: AuditData;
}) {
  const checks = orderedAuditChecks(grouped);
  const columns = splitAuditChecks(checks, data);

  return (
    <section className="grid min-w-0 items-start gap-5 lg:grid-cols-2 lg:gap-6">
      <div className="min-w-0 space-y-4">
        <AuditSummaryCard summary={summary} />
        {columns.left.map((check) => (
          <AuditCheckRow key={check.id || check.label} check={check} showStatusLabel />
        ))}
      </div>

      <div className="min-w-0 space-y-4">
        <LighthousePanel data={data} />
        {columns.right.map((check) => (
          <AuditCheckRow key={check.id || check.label} check={check} showStatusLabel />
        ))}
      </div>
    </section>
  );
}

function AuditSummaryCard({ summary }: { summary: ReturnType<typeof scoreSummary> }) {
  const stats = [
    { label: "Critical", value: summary.critical, color: "text-[#C84E4E]" },
    { label: "Warnings", value: summary.warnings, color: "text-[#B9822D]" },
    { label: "Passing", value: summary.passing, color: "text-[#21A67A]" },
  ];

  return (
    <section className="min-w-0 rounded-lg border border-white/60 bg-white/38 p-3.5 backdrop-blur-2xl min-[380px]:p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="text-xl font-light text-[#0A0A0F]">SEO Audit</h2>
        <div className="flex flex-wrap gap-3 text-xs font-light text-[#616674]">
          <LegendDot color="bg-[#C84E4E]" label={`${summary.critical} fail`} />
          <LegendDot color="bg-[#B9822D]" label={`${summary.warnings} warn`} />
          <LegendDot color="bg-[#21A67A]" label={`${summary.passing} pass`} />
        </div>
      </div>
      <p className="mt-4 text-sm font-light leading-6 text-[#616674]">
        Prioritized checks for crawlability, metadata, web vitals, content quality, and social sharing.
      </p>
      <div className="mt-5 grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0 rounded-lg border border-white/55 bg-white/30 px-3 py-3 backdrop-blur-xl">
            <p className={`text-2xl font-light leading-none ${stat.color}`}>{stat.value}</p>
            <p className="mt-2 truncate text-[10px] font-light uppercase tracking-[0.14em] text-[#616674]">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function statusLabel(status: CheckStatus) {
  if (status === "fail") return "Critical";
  if (status === "warning") return "Important";
  return "Passing";
}

function AuditCheckRow({ check, showStatusLabel = false }: { check: AuditCheck; showStatusLabel?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = normalizeStatus(check.status);
  const statusClasses = {
    pass: "border-l-[#21A67A] text-[#21A67A]",
    warning: "border-l-[#B9822D] text-[#B9822D]",
    fail: "border-l-[#C84E4E] text-[#C84E4E]",
  };
  const Icon = status === "pass" ? Check : status === "warning" ? AlertTriangle : X;
  const details = getDescription(check);
  const canExpand = details.length > 150;

  return (
    <article
      className={`relative min-w-0 rounded-lg border border-white/55 border-l-[3px] bg-white/36 px-3 py-4 backdrop-blur-xl transition hover:bg-white/48 sm:px-4 ${statusClasses[status]}`}
    >
      {canExpand && (
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          aria-label={isExpanded ? "Collapse description" : "Show full description"}
          className="absolute right-2.5 top-2.5 inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/60 bg-white/36 text-[#616674] backdrop-blur-xl transition hover:bg-white/58 sm:right-3 sm:top-3"
        >
          <ChevronDown size={16} strokeWidth={1.8} className={`transition ${isExpanded ? "rotate-180" : ""}`} />
        </button>
      )}
      <div className="flex min-w-0 gap-2.5 pr-8 sm:gap-3 sm:pr-9">
        <Icon size={18} strokeWidth={1.8} className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center">
            <h3 className="break-words text-[15px] font-normal text-[#0A0A0F] sm:text-base">{check.label}</h3>
            {showStatusLabel && (
              <span className="w-fit shrink-0 rounded-md border border-white/60 bg-white/36 px-2 py-0.5 text-[10px] font-light uppercase tracking-[0.12em] text-[#616674]">
                {statusLabel(status)}
              </span>
            )}
          </div>
          <p className={`mt-1 min-h-11 break-words text-[13px] font-light leading-5 text-[#616674] sm:min-h-12 sm:text-sm sm:leading-6 ${canExpand && !isExpanded ? "line-clamp-2" : ""}`}>
            {details}
          </p>
        </div>
      </div>
    </article>
  );
}

function LighthousePanel({ data }: { data: AuditData }) {
  const scores = [
    { label: "Performance", value: data.lighthouse?.performance },
    { label: "Accessibility", value: data.lighthouse?.accessibility },
    { label: "Best Practices", value: data.lighthouse?.bestPractices },
    { label: "SEO", value: data.lighthouse?.seo },
  ];

  return (
    <aside className="min-w-0 rounded-lg border border-white/60 bg-white/38 p-3.5 backdrop-blur-2xl min-[380px]:p-4 sm:p-6">
      <h2 className="text-xl font-light text-[#0A0A0F]">Lighthouse</h2>
      <p className="mt-6 text-xs font-light uppercase tracking-[0.2em] text-[#616674]">Lighthouse Scores</p>
      <div className="mt-5 grid min-w-0 grid-cols-2 gap-3 min-[380px]:gap-4 sm:gap-6">
        {scores.map((score) => (
          <ScoreRing key={score.label} score={score.value} size={80} strokeWidth={7} label={score.label} />
        ))}
      </div>

      <p className="mt-10 text-xs font-light uppercase tracking-[0.2em] text-[#616674]">Core Web Vitals</p>
      <div className="mt-5 space-y-3">
        {webVitalChecks(data).map((vital) => (
          <VitalRow key={vital.id} vital={vital} />
        ))}
      </div>
    </aside>
  );
}

function VitalRow({ vital }: { vital: ReturnType<typeof webVitalChecks>[number] }) {
  const badge =
    vital.status === "pass"
      ? "bg-white/44 text-[#21A67A]"
      : vital.status === "warning"
        ? "bg-white/44 text-[#B9822D]"
        : "bg-white/44 text-[#C84E4E]";
  const label = vital.status === "pass" ? "Good" : vital.status === "warning" ? "Needs work" : "Poor";

  return (
    <div className="flex min-w-0 items-center justify-between gap-2.5 rounded-lg border border-white/55 border-l-[3px] border-l-[#4F46E5] bg-white/34 px-3 py-3 backdrop-blur-xl sm:gap-3 sm:px-4">
      <div className="min-w-0">
        <p className="font-normal text-[#0A0A0F]">{vital.id}</p>
        <p className="truncate text-[11px] font-light text-[#616674] sm:text-xs">{vital.fullName}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="max-w-24 truncate text-sm font-normal text-[#0A0A0F] sm:text-base">{vital.value}</p>
        <span className={`mt-1 inline-flex rounded-md px-2 py-0.5 text-xs font-light ${badge}`}>{label}</span>
      </div>
    </div>
  );
}
