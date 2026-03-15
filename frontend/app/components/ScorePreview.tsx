import { AlertTriangle, Check, Gauge, Link2Off, Lock, Search, ShieldCheck } from "lucide-react";

const scores = [
  { label: "SEO", value: 94, meta: "+6%", tone: "text-[#4F46E5]" },
  { label: "Performance", value: 87, meta: "+3%", tone: "text-[#4F46E5]" },
  { label: "Vitals", value: 82, meta: "2 flags", tone: "text-[#92400E]" },
  { label: "Links", value: 98, meta: "0 dead", tone: "text-[#4F46E5]" },
];

const rows = [
  { text: "Title and meta description are present", status: "Pass", icon: Check, tone: "pass" },
  { text: "Largest Contentful Paint needs attention", status: "Review", icon: AlertTriangle, tone: "warn" },
  { text: "Canonical URL points to the scanned page", status: "Pass", icon: Check, tone: "pass" },
  { text: "Internal links returned healthy responses", status: "Pass", icon: Link2Off, tone: "pass" },
];

const sideChecks = [
  { label: "Structured data", value: "Found", tone: "text-[#4F46E5]" },
  { label: "Robots.txt", value: "Open", tone: "text-[#4F46E5]" },
  { label: "CLS", value: "0.04", tone: "text-[#4F46E5]" },
];

export default function ScorePreview() {
  return (
    <section id="preview" className="relative w-full" aria-label="Metamax product preview">
      <div className="relative overflow-hidden rounded-lg border border-white/60 bg-white/38 text-left shadow-[0_28px_90px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/55 bg-white/30 px-3 py-2.5 backdrop-blur-xl min-[360px]:gap-4 min-[360px]:px-4 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#FF605C]/80" />
            <span className="h-2 w-2 rounded-full bg-[#FFBD44]/80" />
            <span className="h-2 w-2 rounded-full bg-[#00CA4E]/80" />
          </div>
          <div className="hidden min-w-0 items-center gap-2 rounded-md border border-white/60 bg-white/34 px-4 py-2 text-[11px] font-light text-[#616674] backdrop-blur-xl sm:flex">
            <Lock size={12} strokeWidth={1.8} />
            metamaxx.vercel.app
          </div>
          <div className="flex w-[54px] justify-end text-[#6B7280]">
            <Search size={16} strokeWidth={1.8} />
          </div>
        </div>

        <div className="grid gap-3 p-3 min-[360px]:gap-3.5 min-[360px]:p-3.5 sm:p-5 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-light uppercase tracking-widest text-[#616674]">Audit summary</p>
                <h2 className="mt-1 break-words text-[21px] font-light text-[#0A0A0F] min-[360px]:text-[22px]">metamaxx.vercel.app</h2>
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-md border border-white/60 bg-white/38 px-3 py-1 text-[10px] font-light text-[#4F46E5] backdrop-blur-xl">
                <ShieldCheck size={11} strokeWidth={2} />
                Healthy
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              {scores.map((score) => (
                <div key={score.label} className="min-w-0 rounded-lg border border-white/60 bg-white/38 p-3 backdrop-blur-xl transition-colors hover:border-white/90 min-[360px]:p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[27px] font-light leading-none text-[#0A0A0F] min-[360px]:text-[31px]">{score.value}</p>
                    <span className={`shrink-0 text-[10px] font-light ${score.tone}`}>{score.meta}</span>
                  </div>
                  <p className="mt-2.5 truncate text-[10px] font-light uppercase tracking-widest text-[#616674]">{score.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-3.5 overflow-hidden rounded-lg border border-white/60 bg-white/34 backdrop-blur-xl">
              {rows.map((row) => {
                const Icon = row.icon;
                const isPass = row.tone === "pass";
                return (
                  <div key={row.text} className="flex items-center justify-between gap-2.5 border-b border-white/60 px-3 py-2.5 last:border-b-0 min-[360px]:gap-3 min-[360px]:px-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border backdrop-blur-xl ${
                          isPass ? "border-white/60 bg-white/40 text-[#4F46E5]" : "border-white/60 bg-white/40 text-[#92400E]"
                        }`}
                      >
                        <Icon size={16} strokeWidth={1.9} />
                      </span>
                      <span className="min-w-0 truncate text-[12px] font-light text-[#374151]/90 min-[360px]:text-[13px]">{row.text}</span>
                    </div>
                    <span
                      className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-light backdrop-blur-xl ${
                        isPass ? "border-white/60 bg-white/40 text-[#4F46E5]" : "border-white/60 bg-white/40 text-[#92400E]"
                      }`}
                    >
                      {row.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="grid min-w-0 gap-2.5 rounded-lg border border-white/60 bg-white/34 p-3 backdrop-blur-xl min-[360px]:p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-light uppercase tracking-widest text-[#616674]">Overall</p>
                <p className="mt-1 text-[31px] font-light leading-none text-[#0A0A0F]">91</p>
              </div>
              <Gauge size={33} strokeWidth={1.6} className="text-[#0A0A0F]" />
            </div>

            <div className="space-y-2.5">
              {sideChecks.map((check) => (
                <div key={check.label} className="flex items-center justify-between gap-3 border-t border-white/65 pt-2.5">
                  <span className="min-w-0 truncate text-[13px] font-light text-[#616674]">{check.label}</span>
                  <span className={`shrink-0 text-[13px] font-normal ${check.tone}`}>{check.value}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
