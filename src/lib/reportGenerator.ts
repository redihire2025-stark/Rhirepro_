export interface ReportJob {
  id: string;
  title: string;
  status: string;
  employment_type: string | null;
  location: string | null;
  views: number;
  openings: number;
  created_at: string;
}

export interface ReportApp {
  status: string;
  job_id: string;
}

export interface ReportCompany {
  company_name: string | null;
  recruiter_name: string | null;
  logo_url: string | null;
  industry: string | null;
  location: string | null;
  tagline: string | null;
  website: string | null;
}

/** Escape user-supplied strings so they are safe inside HTML text / attributes. */
function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function generateReportHTML(
  company: ReportCompany,
  jobs: ReportJob[],
  apps: ReportApp[]
): string {
  const name = company.company_name || company.recruiter_name || "Company";
  const totalApps = apps.length;
  const activeJobs = jobs.filter(j => j.status === "Active").length;
  const totalViews = jobs.reduce((s, j) => s + (j.views || 0), 0);
  const generatedAt = new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" });

  const sc: Record<string, number> = apps.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const funnel = [
    { label: "Applied",             count: totalApps,                     color: "#9CA3AF" },
    { label: "Reviewed",            count: sc["Reviewed"] || 0,           color: "#60A5FA" },
    { label: "Shortlisted",         count: sc["Shortlisted"] || 0,        color: "#34D399" },
    { label: "Interview Scheduled", count: sc["Interview Scheduled"] || 0, color: "#A78BFA" },
    { label: "Offered",             count: sc["Offered"] || 0,            color: "#FBBF24" },
  ].map(s => ({
    ...s,
    pct: totalApps > 0 ? Math.max(4, Math.round((s.count / totalApps) * 100)) : 4,
  }));

  const statusBadge: Record<string, string> = {
    "New":                 "background:#F3F4F6;color:#374151",
    "Reviewed":            "background:#DBEAFE;color:#1D4ED8",
    "Shortlisted":         "background:#D1FAE5;color:#065F46",
    "Interview Scheduled": "background:#EDE9FE;color:#5B21B6",
    "Offered":             "background:#FEF3C7;color:#92400E",
    "Rejected":            "background:#FEE2E2;color:#991B1B",
  };

  const jobsWithStats = jobs
    .map(j => {
      const ja = apps.filter(a => a.job_id === j.id);
      return {
        ...j,
        appCount:    ja.length,
        shortlisted: ja.filter(a => a.status === "Shortlisted").length,
        offered:     ja.filter(a => a.status === "Offered").length,
        ctr:         j.views > 0 ? `${((ja.length / j.views) * 100).toFixed(1)}%` : "N/A",
      };
    })
    .sort((a, b) => b.appCount - a.appCount);

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const statusRows = Object.entries(sc)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  // ── SVG icons (inline, no encoding issues) ─────────────────
  const iconBriefcase = `<svg width="20" height="20" fill="none" stroke="#2563EB" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>`;
  const iconCheck     = `<svg width="20" height="20" fill="none" stroke="#16A34A" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`;
  const iconUsers     = `<svg width="20" height="20" fill="none" stroke="#DC2626" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
  const iconEye       = `<svg width="20" height="20" fill="none" stroke="#7C3AED" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const iconBuilding  = `<svg width="13" height="13" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 10h8M8 14h8M8 18h4"/></svg>`;
  const iconPin       = `<svg width="13" height="13" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
  const iconGlobe     = `<svg width="13" height="13" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>`;
  const iconCalendar  = `<svg width="13" height="13" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`;
  const iconLink      = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
  const iconPrint     = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`;

  /* ── HTML ─────────────────────────────────────────────────── */
  // NOTE: Every non-ASCII character is replaced with an HTML entity
  // so the raw file bytes are pure ASCII, immune to charset misdetection.
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(name)} &mdash; Hiring Report | RhirePro</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F6F6F6;color:#3A1F1F;-webkit-print-color-adjust:exact;print-color-adjust:exact}
a{color:inherit;text-decoration:none}
.topbar{background:#fff;border-bottom:1px solid #E5E7EB;padding:12px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px;position:sticky;top:0;z-index:10;box-shadow:0 1px 4px rgba(0,0,0,.06)}
.logo{font-size:1.25rem;font-weight:700;color:#3A1F1F}.logo span{color:#FF2B2B}
.topbar-meta{font-size:.75rem;color:#8A8A8A}
.topbar-actions{display:flex;gap:8px}
.btn{padding:6px 14px;border-radius:999px;font-size:.75rem;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:6px;border:1px solid #E5E7EB;background:#fff;color:#3A1F1F;transition:background .15s}
.btn:hover{background:#F6F6F6}
.btn-red{border-color:#FF2B2B;color:#FF2B2B}.btn-red:hover{background:#FFF5F5}
.wrap{max-width:960px;margin:0 auto;padding:32px 16px}
.company-hdr{background:linear-gradient(135deg,#3A1F1F 0%,#FF2B2B 100%);border-radius:16px;padding:32px;color:#fff;display:flex;gap:20px;align-items:center;flex-wrap:wrap;margin-bottom:24px}
.company-logo{width:72px;height:72px;border-radius:14px;border:2px solid rgba(255,255,255,.3);background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:1.75rem;font-weight:700;flex-shrink:0;overflow:hidden}
.company-logo img{width:100%;height:100%;object-fit:cover}
.company-info{flex:1;min-width:0}
.company-name{font-size:1.5rem;font-weight:700}
.company-tag{font-size:.875rem;color:rgba(255,255,255,.75);margin-top:4px}
.company-meta{display:flex;flex-wrap:wrap;gap:16px;margin-top:10px;font-size:.8125rem;color:rgba(255,255,255,.65)}
.company-meta span{display:flex;align-items:center;gap:6px}
.company-date{text-align:right;flex-shrink:0}
.company-date p:first-child{font-size:.7rem;color:rgba(255,255,255,.5);margin-bottom:2px}
.company-date p:last-child{font-size:.875rem;font-weight:600;display:flex;align-items:center;gap:6px;justify-content:flex-end}
.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
@media(max-width:640px){.metrics{grid-template-columns:repeat(2,1fr)}}
.metric-card{background:#fff;border-radius:16px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,.06)}
.metric-icon{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:12px}
.metric-val{font-size:1.6rem;font-weight:700}
.metric-label{font-size:.75rem;color:#8A8A8A;margin-top:2px}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px}
@media(max-width:600px){.two-col{grid-template-columns:1fr}}
.card{background:#fff;border-radius:16px;padding:24px;box-shadow:0 1px 4px rgba(0,0,0,.06)}
.card-title{font-size:.9375rem;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:8px}
.card-title::before{content:'';width:4px;height:16px;background:#FF2B2B;border-radius:2px;display:inline-block}
.funnel-row{margin-bottom:12px}
.funnel-label{display:flex;justify-content:space-between;font-size:.8125rem;margin-bottom:4px}
.funnel-label span:first-child{color:#5A5A5A}
.funnel-label span:last-child{font-weight:600}
.funnel-track{height:28px;background:#F3F4F6;border-radius:8px;overflow:hidden}
.funnel-bar{height:100%;border-radius:8px;display:flex;align-items:center;padding:0 10px;color:#fff;font-size:.75rem;font-weight:600}
.status-row{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.badge{padding:3px 10px;border-radius:999px;font-size:.7rem;font-weight:600;white-space:nowrap}
.bar-wrap{flex:1;height:8px;background:#F3F4F6;border-radius:999px;overflow:hidden}
.bar-fill{height:100%;background:#FF2B2B;border-radius:999px}
.status-count{font-size:.875rem;font-weight:700;width:28px;text-align:right}
.table-card{background:#fff;border-radius:16px;padding:24px;box-shadow:0 1px 4px rgba(0,0,0,.06);margin-bottom:24px;overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:.8125rem}
thead tr{border-bottom:1px solid #F3F4F6}
th{padding:10px 8px;color:#8A8A8A;font-weight:500;text-align:center;white-space:nowrap}
th:first-child{text-align:left}
td{padding:10px 8px;text-align:center;color:#5A5A5A;border-bottom:1px solid #F9FAFB}
td:first-child{text-align:left}
tr:last-child td{border-bottom:none}
tr:hover td{background:#FAFAFA}
.td-title{font-weight:600;color:#3A1F1F}
.td-sub{font-size:.7rem;color:#8A8A8A;margin-top:2px}
.job-active{background:#D1FAE5;color:#065F46;padding:2px 8px;border-radius:999px;font-size:.7rem;font-weight:600}
.job-paused{background:#F3F4F6;color:#6B7280;padding:2px 8px;border-radius:999px;font-size:.7rem;font-weight:600}
.c-blue{color:#2563EB;font-weight:600}
.c-green{color:#059669;font-weight:600}
.c-yellow{color:#D97706;font-weight:600}
.footer{text-align:center;padding:24px 0;border-top:1px solid #E5E7EB;font-size:.8125rem;color:#8A8A8A}
.footer a{color:#FF2B2B;font-weight:600}
.footer p+p{margin-top:4px;font-size:.7rem;color:#AAAAAA}
@media print{.topbar{display:none!important}body{background:#fff}.company-hdr{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head>
<body>

<div class="topbar">
  <div style="display:flex;align-items:center;gap:12px">
    <div class="logo">Rhire<span>Pro</span></div>
    <span class="topbar-meta">&middot; Public Hiring Report</span>
  </div>
  <div class="topbar-actions">
    <button class="btn btn-red" onclick="var b=this;navigator.clipboard.writeText(location.href).then(function(){b.textContent='Copied!';setTimeout(function(){b.innerHTML='${iconLink} Copy Link'},2000)})">${iconLink} Copy Link</button>
    <button class="btn" onclick="window.print()">${iconPrint} Print / PDF</button>
  </div>
</div>

<div class="wrap">

  <div class="company-hdr">
    <div class="company-logo">
      ${company.logo_url
        ? `<img src="${esc(company.logo_url)}" alt="${esc(name)}" onerror="this.style.display='none';this.parentElement.textContent='${esc(name[0])}.'">`
        : esc(name[0])}
    </div>
    <div class="company-info">
      <div class="company-name">${esc(name)}</div>
      ${company.tagline ? `<div class="company-tag">${esc(company.tagline)}</div>` : ""}
      <div class="company-meta">
        ${company.industry ? `<span>${iconBuilding} ${esc(company.industry)}</span>` : ""}
        ${company.location ? `<span>${iconPin} ${esc(company.location)}</span>` : ""}
        ${company.website ? `<span><a href="${esc(company.website)}" target="_blank" style="color:rgba(255,255,255,.85)">${iconGlobe} ${esc(company.website.replace(/^https?:\/\//, ""))}</a></span>` : ""}
      </div>
    </div>
    <div class="company-date">
      <p>Report generated</p>
      <p>${iconCalendar} ${esc(generatedAt)}</p>
    </div>
  </div>

  <div class="metrics">
    <div class="metric-card">
      <div class="metric-icon" style="background:#EFF6FF">${iconBriefcase}</div>
      <div class="metric-val">${jobs.length}</div>
      <div class="metric-label">Total Jobs</div>
    </div>
    <div class="metric-card">
      <div class="metric-icon" style="background:#F0FDF4">${iconCheck}</div>
      <div class="metric-val">${activeJobs}</div>
      <div class="metric-label">Active Jobs</div>
    </div>
    <div class="metric-card">
      <div class="metric-icon" style="background:#FFF5F5">${iconUsers}</div>
      <div class="metric-val">${totalApps}</div>
      <div class="metric-label">Total Applications</div>
    </div>
    <div class="metric-card">
      <div class="metric-icon" style="background:#FAF5FF">${iconEye}</div>
      <div class="metric-val">${totalViews.toLocaleString()}</div>
      <div class="metric-label">Total Job Views</div>
    </div>
  </div>

  ${totalApps > 0 ? `
  <div class="two-col">
    <div class="card">
      <div class="card-title">Hiring Funnel</div>
      ${funnel.map(s => `
      <div class="funnel-row">
        <div class="funnel-label"><span>${esc(s.label)}</span><span>${s.count}</span></div>
        <div class="funnel-track">
          <div class="funnel-bar" style="width:${s.pct}%;background:${s.color}">${s.pct}%</div>
        </div>
      </div>`).join("")}
    </div>
    <div class="card">
      <div class="card-title">Applications by Status</div>
      ${statusRows.map(([label, count]) => `
      <div class="status-row">
        <span class="badge" style="${statusBadge[label] || "background:#F3F4F6;color:#374151"}">${esc(label)}</span>
        <div class="bar-wrap"><div class="bar-fill" style="width:${Math.round((count / totalApps) * 100)}%"></div></div>
        <span class="status-count">${count}</span>
      </div>`).join("")}
    </div>
  </div>` : ""}

  ${jobs.length > 0 ? `
  <div class="table-card">
    <div class="card-title" style="margin-bottom:16px">Job Performance</div>
    <table>
      <thead>
        <tr>
          <th style="text-align:left">Job Title</th>
          <th>Status</th>
          <th>Views</th>
          <th>Applied</th>
          <th>CTR</th>
          <th>Shortlisted</th>
          <th>Offered</th>
          <th style="text-align:left">Posted</th>
        </tr>
      </thead>
      <tbody>
        ${jobsWithStats.map(j => `
        <tr>
          <td>
            <div class="td-title">${esc(j.title)}</div>
            ${j.employment_type ? `<div class="td-sub">${esc(j.employment_type)}${j.location ? " &middot; " + esc(j.location) : ""}</div>` : ""}
          </td>
          <td><span class="${j.status === "Active" ? "job-active" : "job-paused"}">${esc(j.status)}</span></td>
          <td>${(j.views || 0).toLocaleString()}</td>
          <td style="font-weight:600;color:#3A1F1F">${j.appCount}</td>
          <td class="c-blue">${j.ctr}</td>
          <td class="c-green">${j.shortlisted}</td>
          <td class="c-yellow">${j.offered}</td>
          <td style="text-align:left;font-size:.75rem;color:#8A8A8A">${esc(fmt(j.created_at))}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>` : ""}

  <div class="footer">
    <p>Powered by <a href="https://rhirepro.com" target="_blank">RhirePro</a> &middot; Report generated on ${esc(generatedAt)}</p>
    <p>This report is publicly accessible. Share the URL to give anyone read-only access to this hiring summary.</p>
  </div>

</div>
</body>
</html>`;
}
