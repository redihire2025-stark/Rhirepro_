import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { FileText, Loader2, AlertCircle, CheckCircle, Download, Eye, Layout, Check } from "lucide-react";
import { Button } from "./ui/button";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";
import { formatMonthYear, formatYearMonthString } from "../../lib/monthYear";

// ── Types ────────────────────────────────────────────────────────────────────────
export interface BasicInfo {
  name: string;
  headline: string;
  phone: string;
  email: string;
  location: string;
  linkedin: string;
  portfolio: string;
}

export interface WorkExp {
  id: string;
  title: string;
  company: string;
  location: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  current: boolean;
  description: string;
}

export interface Education {
  id: string;
  degree: string;
  field: string;
  college: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  score: string;
}

export interface Project {
  id: number | string;
  name: string;
  url: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  description: string;
}

export interface Certification {
  id: number | string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
  noExpiry: boolean;
  credentialId: string;
}

export interface Language {
  id: number | string;
  language: string;
  proficiency: string;
}

export interface ResumeBuilderProps {
  basicInfo: BasicInfo;
  summary: string;
  skills: string[];
  experiences: WorkExp[];
  education: Education[];
  projects: Project[];
  certifications: Certification[];
  languages: Language[];
  profilePic: string | null;
  /**
   * Mirrors profiles.experience_type === "fresher". A fresher has no work
   * history, so every template must drop the experience section instead of
   * printing an empty heading, and the completeness check must not demand one.
   */
  isFresher?: boolean;
}

// ── Image to Data URL converter (bypasses CORS) ─────────────────────────────
async function imageUrlToDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: "cors" });
    if (response.ok) {
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    }
  } catch {
    // ignore
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
    setTimeout(() => resolve(null), 5000);
  });
}

// ── Validation ──────────────────────────────────────────────────────────────────
interface ValidationResult {
  isComplete: boolean;
  missingFields: string[];
}

function validateProfile(props: ResumeBuilderProps): ValidationResult {
  const missing: string[] = [];
  if (!props.basicInfo.name.trim()) missing.push("Full Name");
  if (!props.basicInfo.phone.trim()) missing.push("Phone Number");
  if (!props.basicInfo.email.trim()) missing.push("Email Address");
  if (!props.basicInfo.location.trim()) missing.push("Location");
  if (props.summary.trim().length < 20) missing.push("Professional Summary (min 20 characters)");
  if (props.skills.length < 1) missing.push("At least 1 Skill");
  // A fresher can never satisfy this, so requiring it would lock them out of the builder entirely.
  if (!props.isFresher && props.experiences.length < 1) missing.push("At least 1 Work Experience");
  if (props.education.length < 1) missing.push("At least 1 Education entry");
  return { isComplete: missing.length === 0, missingFields: missing };
}

// ── Resume HTML Template ────────────────────────────────────────────────────────
export function buildResumeHTML(
  props: ResumeBuilderProps,
  resolvedProfilePic: string | null,
  templateId: string = "template-3"
): string {
  const { basicInfo, summary: rawSummary, skills: rawSkills, education, projects, certifications, languages } = props;

  /*
   * Stale work_experience rows can survive a switch to Fresher, so the flag —
   * not the array length — decides whether the templates get any experience at
   * all. Every template already guards on the partitioned arrays being empty,
   * which means clearing here is enough to drop the heading everywhere.
   */
  const experiences = props.isFresher ? [] : props.experiences;

  const headline = basicInfo.headline || (experiences.length > 0 ? experiences[0].title : props.isFresher ? "Fresher" : "Professional");

  const skills = rawSkills && rawSkills.length > 0 
    ? rawSkills 
    : ["Teamwork", "Problem Solving", "Communication", "Time Management", "Adaptability"];

  const summary = rawSummary && rawSummary.trim() 
    ? rawSummary.trim() 
    : `Dedicated and goal-oriented ${headline || "Professional"} with a strong foundation in ${skills.slice(0, 4).join(", ") || "problem solving and key industry skills"}. Proactive learner seeking to leverage skills and background to contribute to organizational goals.`;

  const websiteDisplay = basicInfo.portfolio
    ? basicInfo.portfolio.replace(/^https?:\/\//, "")
    : basicInfo.linkedin
    ? basicInfo.linkedin.replace(/^https?:\/\//, "")
    : "";

  const safeProfilePic = resolvedProfilePic;

  const cleanLineText = (text: string) => {
    return text.replace(/^\s*[-•*+]\s*/, "").trim();
  };

  const getPhoneIcon = (color = "white") => `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
  const getEmailIcon = (color = "white") => `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;
  const getLocationIcon = (color = "white") => `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
  const getGlobeIcon = (color = "white") => `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`;

  // ── Smart Partitioning logic based on estimated height ──
  const page1Experiences: WorkExp[] = [];
  const page2Experiences: WorkExp[] = [];

  let currentHeight = 0;
  const page1Limit = 1020; // safe budget for content height in page 1 (excluding margins/paddings/header)

  // Header Estimate
  const headerEstimate = (
    templateId === "template-2" ||
    templateId === "template-4" ||
    templateId === "template-5" ||
    templateId === "template-6" ||
    templateId === "template-7" ||
    templateId === "template-8" ||
    templateId === "template-9" ||
    templateId === "template-10" ||
    templateId === "template-11" ||
    templateId === "template-12" ||
    templateId === "template-13" ||
    templateId === "template-14"
  ) ? 180 : 160;
  currentHeight += headerEstimate;

  // Summary Estimate
  const summaryLines = Math.max(3, Math.ceil(summary.length / 80));
  const summaryHeight = summaryLines * 16 + 40;
  currentHeight += summaryHeight;

  // Education/Skills Estimate
  let eduSkillsHeight = 0;
  if (
    templateId === "template-2" ||
    templateId === "template-4" ||
    templateId === "template-10" ||
    templateId === "template-12"
  ) {
    eduSkillsHeight = 0; // rendered in sidebar, not counting to main content height
  } else if (
    templateId === "template-5" ||
    templateId === "template-6" ||
    templateId === "template-7" ||
    templateId === "template-8" ||
    templateId === "template-9" ||
    templateId === "template-11" ||
    templateId === "template-13" ||
    templateId === "template-14"
  ) {
    eduSkillsHeight = education.length * 60 + 40;
  } else {
    const eduHeight = education.length * 60;
    const skillsHeight = skills.length * 16;
    eduSkillsHeight = Math.max(eduHeight, skillsHeight) + 40;
  }

  // Work experiences partition
  experiences.forEach(exp => {
    const descLines = exp.description ? Math.ceil(exp.description.length / 90) : 1;
    const expHeight = 50 + descLines * 16;
    if (currentHeight + expHeight < page1Limit) {
      page1Experiences.push(exp);
      currentHeight += expHeight;
    } else {
      page2Experiences.push(exp);
    }
  });

  currentHeight += eduSkillsHeight;

  // Languages partition
  let page1Languages = languages;
  let page2Languages: Language[] = [];
  const languagesHeight = languages.length > 0 ? 55 : 0;
  if (languages.length > 0) {
    if (
      templateId === "template-2" ||
      templateId === "template-4" ||
      templateId === "template-5" ||
      templateId === "template-10" ||
      templateId === "template-12"
    ) {
      // In sidebar, not counting to main height
    } else {
      if (currentHeight + languagesHeight < page1Limit) {
        currentHeight += languagesHeight;
      } else {
        page1Languages = [];
        page2Languages = languages;
      }
    }
  }

  // Projects partition
  const page1Projects: Project[] = [];
  const page2Projects: Project[] = [];
  projects.forEach(proj => {
    const descLines = proj.description ? Math.ceil(proj.description.length / 90) : 1;
    const projHeight = 50 + descLines * 16;
    if (page2Experiences.length === 0 && currentHeight + projHeight < page1Limit) {
      page1Projects.push(proj);
      currentHeight += projHeight;
    } else {
      page2Projects.push(proj);
    }
  });

  // Certifications partition
  const page1Certifications: Certification[] = [];
  const page2Certifications: Certification[] = [];
  certifications.forEach(cert => {
    const certHeight = 35;
    if (page2Experiences.length === 0 && page2Projects.length === 0 && currentHeight + certHeight < page1Limit) {
      page1Certifications.push(cert);
      currentHeight += certHeight;
    } else {
      page2Certifications.push(cert);
    }
  });

  const hasPage2 = page2Experiences.length > 0 || page2Languages.length > 0 || page2Projects.length > 0 || page2Certifications.length > 0;

  // ───────────────────────────────────────────────────────────────────────────
  // Template 1: Charcoal Classic (Daniel Gallego style)
  // ───────────────────────────────────────────────────────────────────────────
  if (templateId === "template-1") {
    const renderExperiencesHTML = (exps: WorkExp[]) => exps.map(exp => {
      const dateRange = `${exp.startMonth} ${exp.startYear} – ${exp.current ? "Present" : `${exp.endMonth} ${exp.endYear}`}`;
      const descLines = exp.description
        ? exp.description.split(/\n/).map(l => l.trim()).filter(l => l.length > 0)
            .map(l => `<li style="margin-bottom:3px;color:#444;font-size:11px;line-height:1.4;">${cleanLineText(l)}</li>`).join("")
        : "";
      return `
        <div style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;">
            <span style="font-weight:700;color:#111;font-size:12px;">${exp.company} | ${exp.title}</span>
            <span style="color:#555;font-size:11px;font-weight:600;">${dateRange}</span>
          </div>
          ${descLines ? `<ul style="margin:0 0 0 16px;padding:0;list-style-type:disc;">${descLines}</ul>` : ""}
        </div>`;
    }).join("");

    const renderProjectsHTML = (projs: Project[]) => projs.map(p => `
      <div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px;">
          <span style="font-weight:700;color:#111;font-size:12px;">${p.name}</span>
          ${p.startYear ? `<span style="color:#555;font-size:11px;font-weight:600;">${formatMonthYear(p.startMonth, p.startYear)} – ${p.endYear ? formatMonthYear(p.endMonth, p.endYear) : "Present"}</span>` : ""}
        </div>
        ${p.description ? `<p style="margin:0;color:#444;font-size:11px;line-height:1.4;">${p.description}</p>` : ""}
      </div>
    `).join("");

    const skillsHTML = skills.map(s => {
      return `<div style="flex: 0 0 33.33%; box-sizing: border-box; font-size: 11px; color: #444; margin-bottom: 6px;">${cleanLineText(s)}</div>`;
    }).join("");

    const renderAdditionalHTML = (langs: Language[], certs: Certification[]) => {
      const langsHTML = langs.length > 0
        ? `<div style="margin-bottom:10px;font-size:11px;color:#444;">
            <strong>Languages:</strong> ${langs.map(l => `${l.language}${l.proficiency ? ` (${l.proficiency})` : ""}`).join(", ")}
          </div>`
        : "";
      const certsHTML = certs.length > 0
        ? `<div style="margin-bottom:10px;font-size:11px;color:#444;">
            <strong>Certifications:</strong> ${certs.map(c => `${c.name}${c.issuer ? ` (${c.issuer})` : ""}`).join(", ")}
          </div>`
        : "";
      return (langsHTML || certsHTML)
        ? `<div style="margin-top:14px;padding-top:10px;">
            <h2 style="margin:0 0 10px;background:#e5e7eb;padding:5px 12px;color:#111;font-size:12px;font-weight:700;text-transform:uppercase;border-radius:2px;">Additional Information</h2>
            <div style="padding:0 8px;">
              ${langsHTML}
              ${certsHTML}
            </div>
          </div>`
        : "";
    };

    const educationHTML = education.map(edu => {
      const yearRange = `${formatMonthYear(edu.startMonth, edu.startYear)} – ${formatMonthYear(edu.endMonth, edu.endYear)}`;
      return `
        <div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px;">
            <span style="font-weight:700;color:#111;font-size:12px;">${edu.college} | ${edu.degree}</span>
            <span style="color:#555;font-size:11px;font-weight:600;">${yearRange}</span>
          </div>
          ${edu.field ? `<p style="margin:0;color:#555;font-size:11px;">Major in ${edu.field}${edu.score ? ` · Score: ${edu.score}` : ""}</p>` : ""}
        </div>`;
    }).join("");

    const page1HTML = `
      <div class="resume-page" style="width:794px;height:1122px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#fff;color:#333;padding:45px;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;margin:0;flex-shrink:0;">
        <div style="box-sizing:border-box;">
          <!-- Header -->
          <div style="margin-bottom:22px;box-sizing:border-box;">
            <h1 style="margin:0;font-size:28px;font-weight:800;color:#222;letter-spacing:0.5px;">${basicInfo.name}</h1>
            <p style="margin:4px 0 8px;font-size:15px;color:#444;font-weight:700;text-transform:uppercase;">${headline}</p>
            <div style="display:flex;flex-wrap:wrap;gap:6px 16px;font-size:11px;color:#555;">
              <span>${basicInfo.location}</span>
              <span>•</span>
              <span>${basicInfo.phone}</span>
              <span>•</span>
              <span>${basicInfo.email}</span>
              ${websiteDisplay ? `<span>•</span><span>${websiteDisplay}</span>` : ""}
            </div>
          </div>

          <!-- Summary -->
          <div style="margin-bottom:16px;">
            <h2 style="margin:0 0 10px;background:#e5e7eb;padding:5px 12px;color:#111;font-size:12px;font-weight:700;text-transform:uppercase;border-radius:2px;">Summary</h2>
            <p style="margin:0;color:#444;font-size:11px;line-height:1.6;text-align:justify;">${summary}</p>
          </div>

          <!-- Skills -->
          <div style="margin-bottom:16px;">
            <h2 style="margin:0 0 10px;background:#e5e7eb;padding:5px 12px;color:#111;font-size:12px;font-weight:700;text-transform:uppercase;border-radius:2px;">Technical Skills</h2>
            <div style="display:flex;flex-wrap:wrap;padding:0 8px;box-sizing:border-box;">
              ${skillsHTML}
            </div>
          </div>

          <!-- Experience -->
          ${page1Experiences.length > 0 ? `
          <div style="margin-bottom:16px;">
            <h2 style="margin:0 0 10px;background:#e5e7eb;padding:5px 12px;color:#111;font-size:12px;font-weight:700;text-transform:uppercase;border-radius:2px;">Professional Experience</h2>
            ${renderExperiencesHTML(page1Experiences)}
          </div>
          ` : ""}

          <!-- Education -->
          <div style="margin-bottom:16px;">
            <h2 style="margin:0 0 10px;background:#e5e7eb;padding:5px 12px;color:#111;font-size:12px;font-weight:700;text-transform:uppercase;border-radius:2px;">Education</h2>
            ${educationHTML}
          </div>

          ${renderAdditionalHTML(page1Languages, page1Certifications)}
          ${page1Projects.length > 0 ? `
            <div style="margin-top:14px;padding-top:10px;">
              <h2 style="margin:0 0 10px;background:#e5e7eb;padding:5px 12px;color:#111;font-size:12px;font-weight:700;text-transform:uppercase;border-radius:2px;">Projects</h2>
              ${renderProjectsHTML(page1Projects)}
            </div>
          ` : ""}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#888;box-sizing:border-box;border-top:1px solid #eee;padding-top:8px;">
          <span>${basicInfo.name} - Resume</span>
          <span>Page 1 ${hasPage2 ? 'of 2' : ''}</span>
        </div>
      </div>
    `;

    const page2HTML = hasPage2 ? `
      <div class="resume-page" style="width:794px;height:1122px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#fff;color:#333;padding:45px;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;margin:0;flex-shrink:0;">
        <div style="box-sizing:border-box;">
          <!-- Page 2 Header Banner -->
          <div style="background:#222;color:#fff;padding:15px 20px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;box-sizing:border-box;border-radius:2px;">
            <span style="font-weight:800;color:#fff;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;">${basicInfo.name}</span>
            <span style="color:rgba(255,255,255,0.8);font-size:11px;font-weight:600;">Resume</span>
          </div>

          ${page2Experiences.length > 0 ? `
          <div style="margin-bottom:16px;">
            <h2 style="margin:0 0 10px;background:#e5e7eb;padding:5px 12px;color:#111;font-size:12px;font-weight:700;text-transform:uppercase;border-radius:2px;">Professional Experience</h2>
            ${renderExperiencesHTML(page2Experiences)}
          </div>
          ` : ""}

          ${renderAdditionalHTML(page2Languages, page2Certifications)}

          ${page2Projects.length > 0 ? `
            <div style="margin-top:14px;padding-top:10px;">
              <h2 style="margin:0 0 10px;background:#e5e7eb;padding:5px 12px;color:#111;font-size:12px;font-weight:700;text-transform:uppercase;border-radius:2px;">Projects</h2>
              ${renderProjectsHTML(page2Projects)}
            </div>
          ` : ""}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#888;box-sizing:border-box;border-top:1px solid #eee;padding-top:8px;">
          <span>${basicInfo.name} - Resume</span>
          <span>Page 2 of 2</span>
        </div>
      </div>
    ` : "";

    return `
      <div id="resume-render-target" style="width:794px;background:#fff;display:flex;flex-direction:column;gap:0px;margin:0;padding:0;box-sizing:border-box;">
        ${page1HTML}
        ${page2HTML}
      </div>
    `;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Template 2: Timeline Navy (Juliana Silva style)
  // ───────────────────────────────────────────────────────────────────────────
  if (templateId === "template-2") {
    const profileImgHTML = safeProfilePic
      ? `<img src="${safeProfilePic}" alt="Profile" style="width:115px;height:115px;border-radius:50%;object-fit:cover;border:4px solid #fff;margin:0 auto 16px;display:block;box-shadow:0 4px 6px rgba(0,0,0,0.15);" />`
      : `<div style="width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.3);font-size:36px;font-weight:700;color:white;margin:0 auto 16px;text-transform:uppercase;">${(basicInfo.name || "U")[0]}</div>`;

    const renderExperiencesHTML = (exps: WorkExp[]) => exps.map((exp, idx) => {
      const dateRange = `${exp.startMonth} ${exp.startYear} – ${exp.current ? "Present" : `${exp.endMonth} ${exp.endYear}`}`;
      const descLines = exp.description
        ? exp.description.split(/\n/).map(l => l.trim()).filter(l => l.length > 0)
            .map(l => `<li style="margin-bottom:3px;color:#444;font-size:10.5px;line-height:1.4;">${cleanLineText(l)}</li>`).join("")
        : "";
      return `
        <div style="position:relative;padding-left:24px;margin-bottom:14px;box-sizing:border-box;">
          <!-- Node dot -->
          <div style="position:absolute;left:-4px;top:4px;width:10px;height:10px;border-radius:50%;background:#0d3b66;border:2px solid #fff;z-index:2;"></div>
          <p style="margin:0 0 2px;font-weight:700;color:#111;font-size:11.5px;display:flex;justify-content:space-between;flex-wrap:wrap;box-sizing:border-box;">
            <span>${exp.company} – ${exp.title}</span>
            <span style="color:#666;font-weight:500;font-size:10.5px;">${dateRange}</span>
          </p>
          ${descLines ? `<ul style="margin:4px 0 0 14px;padding:0;list-style-type:disc;">${descLines}</ul>` : ""}
        </div>`;
    }).join("");

    const educationHTML = education.map(edu => {
      const yearRange = `${formatMonthYear(edu.startMonth, edu.startYear)} – ${formatMonthYear(edu.endMonth, edu.endYear)}`;
      return `
        <div style="position:relative;padding-left:24px;margin-bottom:12px;box-sizing:border-box;">
          <!-- Node dot -->
          <div style="position:absolute;left:-4px;top:4px;width:10px;height:10px;border-radius:50%;background:#0d3b66;border:2px solid #fff;z-index:2;"></div>
          <p style="margin:0 0 2px;font-weight:700;color:#111;font-size:11.5px;display:flex;justify-content:space-between;flex-wrap:wrap;box-sizing:border-box;">
            <span>${edu.college}</span>
            <span style="color:#666;font-weight:500;font-size:10.5px;">${yearRange}</span>
          </p>
          <p style="margin:0;color:#555;font-size:10.5px;">${edu.degree}${edu.field ? ` · ${edu.field}` : ""}${edu.score ? ` · Score: ${edu.score}` : ""}</p>
        </div>`;
    }).join("");

    const skillsHTML = skills.map(s => `<li style="margin-bottom:4px;color:rgba(255,255,255,0.95);font-size:10.5px;">${cleanLineText(s)}</li>`).join("");

    const languagesHTML = languages.length > 0
      ? `<div style="margin-top:18px;box-sizing:border-box;">
          <h3 style="margin:0 0 8px;background:#fff;color:#0d3b66;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;padding:3px 12px;border-radius:9999px;display:inline-block;text-align:center;">Languages</h3>
          <ul style="margin:6px 0 0;padding:0 0 0 14px;list-style-type:circle;box-sizing:border-box;color:rgba(255,255,255,0.95);font-size:10.5px;">
            ${languages.map(l => `<li style="margin-bottom:3px;">${l.language}${l.proficiency ? ` (${l.proficiency})` : ""}</li>`).join("")}
          </ul>
        </div>`
      : "";

    const renderProjectsHTML = (projs: Project[]) => projs.length > 0
      ? `<div style="margin-top:14px;box-sizing:border-box;">
          <h2 style="margin:0 0 10px;color:#0d3b66;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;display:flex;align-items:center;gap:6px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d3b66" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m10 8 6 4-6 4V8z"/></svg> Projects
          </h2>
          <div style="border-left: 2px solid #e5e7eb; margin-left: 14px; box-sizing: border-box;">
            ${projs.map(p => `
              <div style="position:relative;padding-left:24px;margin-bottom:10px;box-sizing:border-box;">
                <!-- Node dot -->
                <div style="position:absolute;left:-4px;top:4px;width:10px;height:10px;border-radius:50%;background:#0d3b66;border:2px solid #fff;z-index:2;"></div>
                <p style="margin:0 0 2px;font-weight:700;color:#111;font-size:11.5px;display:flex;justify-content:space-between;flex-wrap:wrap;box-sizing:border-box;">
                  <span>${p.name}</span>
                  ${p.startYear ? `<span style="color:#666;font-weight:500;font-size:10.5px;">${formatMonthYear(p.startMonth, p.startYear)} – ${p.endYear ? formatMonthYear(p.endMonth, p.endYear) : "Present"}</span>` : ""}
                </p>
                ${p.description ? `<p style="margin:0;color:#555;font-size:10.5px;line-height:1.4;">${p.description}</p>` : ""}
              </div>
            `).join("")}
          </div>
        </div>`
      : "";

    const renderCertificationsHTML = (certs: Certification[]) => certs.length > 0
      ? `<div style="margin-top:14px;box-sizing:border-box;">
          <h2 style="margin:0 0 10px;color:#0d3b66;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;display:flex;align-items:center;gap:6px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d3b66" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg> Certifications
          </h2>
          <div style="border-left: 2px solid #e5e7eb; margin-left: 14px; box-sizing: border-box;">
            ${certs.map(c => `
              <div style="position:relative;padding-left:24px;margin-bottom:8px;box-sizing:border-box;">
                <!-- Node dot -->
                <div style="position:absolute;left:-4px;top:4px;width:10px;height:10px;border-radius:50%;background:#0d3b66;border:2px solid #fff;z-index:2;"></div>
                <p style="margin:0;font-weight:700;color:#111;font-size:11.5px;">${c.name}${c.issuer ? ` – ${c.issuer}` : ""}</p>
                ${c.issueDate ? `<p style="margin:2px 0 0;color:#666;font-size:10px;">Issued: ${formatYearMonthString(c.issueDate)}</p>` : ""}
              </div>
            `).join("")}
          </div>
        </div>`
      : "";

    const leftColumn1 = `
      <div style="width:235px;background:#0d3b66;color:#fff;padding:26px 18px;box-sizing:border-box;display:flex;flex-direction:column;flex-shrink:0;">
        ${profileImgHTML}
        
        <h3 style="margin:16px 0 8px;background:#fff;color:#0d3b66;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;padding:3px 12px;border-radius:9999px;display:inline-block;text-align:center;">Contact</h3>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:10px;color:rgba(255,255,255,0.9);margin-bottom:20px;box-sizing:border-box;">
          <span style="display:inline-flex;align-items:center;gap:6px;">${getPhoneIcon("rgba(255,255,255,0.8)")} ${basicInfo.phone}</span>
          <span style="display:inline-flex;align-items:center;gap:6px;">${getEmailIcon("rgba(255,255,255,0.8)")} ${basicInfo.email}</span>
          <span style="display:inline-flex;align-items:center;gap:6px;">${getLocationIcon("rgba(255,255,255,0.8)")} ${basicInfo.location}</span>
          ${websiteDisplay ? `<span style="display:inline-flex;align-items:center;gap:6px;">${getGlobeIcon("rgba(255,255,255,0.8)")} ${websiteDisplay}</span>` : ""}
        </div>

        <h3 style="margin:16px 0 8px;background:#fff;color:#0d3b66;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;padding:3px 12px;border-radius:9999px;display:inline-block;text-align:center;">Skills</h3>
        <ul style="margin:0;padding:0 0 0 14px;list-style-type:disc;box-sizing:border-box;">
          ${skillsHTML}
        </ul>

        ${languagesHTML}
      </div>
    `;

    const leftColumn2 = `
      <div style="width:235px;background:#0d3b66;color:#fff;padding:26px 18px;box-sizing:border-box;display:flex;flex-direction:column;flex-shrink:0;">
        <span style="font-size:16px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#fff;border-bottom:2px solid #fff;padding-bottom:5px;margin-bottom:15px;text-align:center;">${basicInfo.name.split(" ")[0]}</span>
        
        <h3 style="margin:16px 0 8px;background:#fff;color:#0d3b66;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;padding:3px 12px;border-radius:9999px;display:inline-block;text-align:center;">Contact</h3>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:10px;color:rgba(255,255,255,0.9);margin-bottom:20px;box-sizing:border-box;">
          <span style="display:inline-flex;align-items:center;gap:6px;">${getPhoneIcon("rgba(255,255,255,0.8)")} ${basicInfo.phone}</span>
          <span style="display:inline-flex;align-items:center;gap:6px;">${getEmailIcon("rgba(255,255,255,0.8)")} ${basicInfo.email}</span>
        </div>

        <h3 style="margin:16px 0 8px;background:#fff;color:#0d3b66;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;padding:3px 12px;border-radius:9999px;display:inline-block;text-align:center;">Skills</h3>
        <ul style="margin:0;padding:0 0 0 14px;list-style-type:disc;box-sizing:border-box;">
          ${skillsHTML}
        </ul>
      </div>
    `;

    const page1HTML = `
      <div class="resume-page" style="width:794px;height:1122px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#fff;color:#333;box-sizing:border-box;overflow:hidden;display:flex;margin:0;padding:0;flex-shrink:0;">
        ${leftColumn1}
        <div style="flex:1;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;justify-content:space-between;">
          <div>
            <!-- Top Name Panel -->
            <div style="background:#f3f4f6;padding:26px 30px 20px;border-bottom:1px solid #e5e7eb;box-sizing:border-box;">
              <h1 style="margin:0;font-size:26px;font-weight:800;color:#0d3b66;text-transform:uppercase;letter-spacing:0.5px;">${basicInfo.name}</h1>
              <p style="margin:4px 0 0;font-size:13px;color:#555;font-weight:600;text-transform:uppercase;">${headline}</p>
            </div>

            <!-- Timeline Sections -->
            <div style="padding:22px 30px;box-sizing:border-box;">
              <!-- Profile -->
              <div style="margin-bottom:14px;box-sizing:border-box;">
                <h2 style="margin:0 0 8px;color:#0d3b66;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;display:flex;align-items:center;gap:6px;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d3b66" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Profile
                </h2>
                <p style="margin:0 0 0 14px;color:#444;font-size:10.5px;line-height:1.5;text-align:justify;">${summary}</p>
              </div>

              <!-- Education -->
              <div style="margin-bottom:14px;box-sizing:border-box;">
                <h2 style="margin:0 0 10px;color:#0d3b66;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;display:flex;align-items:center;gap:6px;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d3b66" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg> Education
                </h2>
                <div style="border-left: 2px solid #e5e7eb; margin-left: 14px; box-sizing: border-box;">
                  ${educationHTML}
                </div>
              </div>

              <!-- Experience -->
              ${page1Experiences.length > 0 ? `
              <div style="margin-bottom:14px;box-sizing:border-box;">
                <h2 style="margin:0 0 10px;color:#0d3b66;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;display:flex;align-items:center;gap:6px;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d3b66" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> Experience
                </h2>
                <div style="border-left: 2px solid #e5e7eb; margin-left: 14px; box-sizing: border-box;">
                  ${renderExperiencesHTML(page1Experiences)}
                </div>
              </div>
              ` : ""}

              ${page1Projects.length > 0 ? renderProjectsHTML(page1Projects) : ""}
              ${page1Certifications.length > 0 ? renderCertificationsHTML(page1Certifications) : ""}
            </div>
          </div>
          <div style="padding:10px 30px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:10px;color:#888;box-sizing:border-box;">
            <span>${basicInfo.name}</span>
            <span>Page 1 ${hasPage2 ? 'of 2' : ''}</span>
          </div>
        </div>
      </div>
    `;

    const page2HTML = hasPage2 ? `
      <div class="resume-page" style="width:794px;height:1122px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#fff;color:#333;box-sizing:border-box;overflow:hidden;display:flex;margin:0;padding:0;flex-shrink:0;">
        ${leftColumn2}
        <div style="flex:1;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;justify-content:space-between;">
          <div>
            <!-- Top Name Panel Page 2 -->
            <div style="background:#0d3b66;padding:15px 30px;box-sizing:border-box;display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
              <h1 style="margin:0;font-size:16px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:0.5px;">${basicInfo.name}</h1>
              <span style="color:rgba(255,255,255,0.9);font-size:11px;font-weight:600;text-transform:uppercase;">Resume</span>
            </div>

            <!-- Timeline Sections -->
            <div style="padding:22px 30px;box-sizing:border-box;">
              ${page2Experiences.length > 0 ? `
              <div style="margin-bottom:14px;box-sizing:border-box;">
                <h2 style="margin:0 0 10px;color:#0d3b66;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;display:flex;align-items:center;gap:6px;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d3b66" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> Experience
                </h2>
                <div style="border-left: 2px solid #e5e7eb; margin-left: 14px; box-sizing: border-box;">
                  ${renderExperiencesHTML(page2Experiences)}
                </div>
              </div>
              ` : ""}

              ${page2Projects.length > 0 ? renderProjectsHTML(page2Projects) : ""}
              ${page2Certifications.length > 0 ? renderCertificationsHTML(page2Certifications) : ""}
            </div>
          </div>
          <div style="padding:10px 30px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:10px;color:#888;box-sizing:border-box;">
            <span>${basicInfo.name}</span>
            <span>Page 2 of 2</span>
          </div>
        </div>
      </div>
    ` : "";

    return `
      <div id="resume-render-target" style="width:794px;background:#fff;display:flex;flex-direction:column;gap:0px;margin:0;padding:0;box-sizing:border-box;">
        ${page1HTML}
        ${page2HTML}
      </div>
    `;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Template 4: Elegant Crimson (Anaisha Parvati style)
  // ───────────────────────────────────────────────────────────────────────────
  if (templateId === "template-4") {
    const profileImgHTML = safeProfilePic
      ? `<img src="${safeProfilePic}" alt="Profile" style="width:100px;height:100px;border-radius:4px;object-fit:cover;border:1px solid #ddd;margin-bottom:16px;display:block;" />`
      : "";

    const renderExperiencesHTML = (exps: WorkExp[]) => exps.map(exp => {
      const dateRange = `${exp.startMonth} ${exp.startYear} – ${exp.current ? "Present" : `${exp.endMonth} ${exp.endYear}`}`;
      const descLines = exp.description
        ? exp.description.split(/\n/).map(l => l.trim()).filter(l => l.length > 0)
            .map(l => `<li style="margin-bottom:3px;color:#444;font-size:10.5px;line-height:1.4;">${cleanLineText(l)}</li>`).join("")
        : "";
      return `
        <div style="margin-bottom:12px;box-sizing:border-box;">
          <p style="margin:0;font-weight:700;color:#111;font-size:11.5px;display:flex;justify-content:space-between;align-items:baseline;">
            <span>${exp.company} — ${exp.title}</span>
            <span style="color:#b91c1c;font-weight:600;font-size:10.5px;">${dateRange}</span>
          </p>
          ${descLines ? `<ul style="margin:4px 0 0 14px;padding:0;list-style-type:disc;">${descLines}</ul>` : ""}
        </div>`;
    }).join("");

    const educationHTML = education.map(edu => {
      const yearRange = `${formatMonthYear(edu.startMonth, edu.startYear)} – ${formatMonthYear(edu.endMonth, edu.endYear)}`;
      return `
        <div style="margin-bottom:10px;box-sizing:border-box;">
          <p style="margin:0 0 2px;font-weight:700;color:#111;font-size:11.5px;">${edu.college}</p>
          <p style="margin:0;color:#555;font-size:10.5px;display:flex;justify-content:space-between;align-items:baseline;">
            <span>${edu.degree}${edu.field ? ` · ${edu.field}` : ""}</span>
            <span style="color:#666;font-weight:400;">${yearRange}</span>
          </p>
        </div>`;
    }).join("");

    const skillsHTML = skills.map(s => {
      return `<div style="flex: 0 0 50%; box-sizing: border-box; font-size: 10.5px; color: #444; margin-bottom: 6px;">• ${cleanLineText(s)}</div>`;
    }).join("");

    const languagesHTML = languages.length > 0
      ? `<div style="margin-top:16px;box-sizing:border-box;">
          <h3 style="margin:0 0 6px;color:#b91c1c;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Languages</h3>
          <ul style="margin:0;padding:0 0 0 14px;list-style-type:disc;color:#444;font-size:10.5px;">
            ${languages.map(l => `<li style="margin-bottom:3px;">${l.language}${l.proficiency ? ` (${l.proficiency})` : ""}</li>`).join("")}
          </ul>
        </div>`
      : "";

    const renderProjectsHTML = (projs: Project[]) => projs.length > 0
      ? `<div style="margin-top:14px;padding-top:10px;border-top:1px solid #eee;">
          <h2 style="margin:0 0 8px;color:#b91c1c;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Projects</h2>
          ${projs.map(p => `
            <div style="margin-bottom:8px;">
              <p style="margin:0 0 2px;font-weight:700;color:#111;font-size:11.5px;display:flex;justify-content:space-between;">
                <span>${p.name}</span>
                ${p.startYear ? `<span style="color:#666;font-size:10.5px;">${formatMonthYear(p.startMonth, p.startYear)}–${p.endYear ? formatMonthYear(p.endMonth, p.endYear) : "Present"}</span>` : ""}
              </p>
              ${p.description ? `<p style="margin:0;color:#444;font-size:10.5px;line-height:1.4;">${p.description}</p>` : ""}
            </div>
          `).join("")}
        </div>`
      : "";

    const renderCertificationsHTML = (certs: Certification[]) => certs.length > 0
      ? `<div style="margin-top:14px;padding-top:10px;border-top:1px solid #eee;">
          <h2 style="margin:0 0 8px;color:#b91c1c;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Certifications</h2>
          ${certs.map(c => `
            <div style="margin-bottom:6px;display:flex;justify-content:space-between;align-items:baseline;">
              <span style="font-weight:700;color:#111;font-size:11.5px;">${c.name}</span>
              ${c.issueDate ? `<span style="color:#666;font-size:10px;">${formatYearMonthString(c.issueDate)}</span>` : ""}
            </div>
          `).join("")}
        </div>`
      : "";

    const leftColumn1 = `
      <div style="width:235px;background:#f9f9f9;padding:30px 20px;box-sizing:border-box;display:flex;flex-direction:column;flex-shrink:0;border-right:1px solid #eee;">
        ${profileImgHTML}
        
        <h3 style="margin:0 0 6px;color:#b91c1c;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Contact</h3>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:10px;color:#444;margin-bottom:20px;box-sizing:border-box;border-bottom:1px solid #eee;padding-bottom:14px;">
          <span style="display:inline-flex;align-items:center;gap:6px;">${getPhoneIcon("#b91c1c")} ${basicInfo.phone}</span>
          <span style="display:inline-flex;align-items:center;gap:6px;">${getEmailIcon("#b91c1c")} ${basicInfo.email}</span>
          <span style="display:inline-flex;align-items:center;gap:6px;">${getLocationIcon("#b91c1c")} ${basicInfo.location}</span>
          ${websiteDisplay ? `<span style="display:inline-flex;align-items:center;gap:6px;">${getGlobeIcon("#b91c1c")} ${websiteDisplay}</span>` : ""}
        </div>

        <h3 style="margin:0 0 8px;color:#b91c1c;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Education</h3>
        <div style="box-sizing:border-box;margin-bottom:20px;">
          ${educationHTML}
        </div>

        ${languagesHTML}
      </div>
    `;

    const leftColumn2 = `
      <div style="width:235px;background:#f9f9f9;padding:30px 20px;box-sizing:border-box;display:flex;flex-direction:column;flex-shrink:0;border-right:1px solid #eee;">
        <span style="font-size:16px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#b91c1c;border-bottom:2px solid #b91c1c;padding-bottom:5px;margin-bottom:15px;text-align:center;">${basicInfo.name.split(" ")[0]}</span>
        
        <h3 style="margin:0 0 6px;color:#b91c1c;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Contact</h3>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:10px;color:#444;margin-bottom:20px;box-sizing:border-box;border-bottom:1px solid #eee;padding-bottom:14px;">
          <span style="display:inline-flex;align-items:center;gap:6px;">${getPhoneIcon("#b91c1c")} ${basicInfo.phone}</span>
          <span style="display:inline-flex;align-items:center;gap:6px;">${getEmailIcon("#b91c1c")} ${basicInfo.email}</span>
        </div>
      </div>
    `;

    const page1HTML = `
      <div class="resume-page" style="width:794px;height:1122px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#fff;color:#333;box-sizing:border-box;overflow:hidden;display:flex;margin:0;padding:0;flex-shrink:0;">
        ${leftColumn1}
        <div style="flex:1;padding:30px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;">
          <div>
            <div style="border-bottom:1px solid #eee;padding-bottom:14px;margin-bottom:14px;box-sizing:border-box;position:relative;">
              <div style="position:absolute;top:0;left:0;width:30px;height:4px;background:#b91c1c;"></div>
              <h1 style="margin:10px 0 4px;font-size:26px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:0.5px;">${basicInfo.name}</h1>
              <p style="margin:0;font-size:13px;color:#b91c1c;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">${headline}</p>
            </div>
            <div style="margin-bottom:14px;">
              <h2 style="margin:0 0 6px;color:#b91c1c;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Professional Summary</h2>
              <p style="margin:0;color:#444;font-size:10.5px;line-height:1.5;text-align:justify;">${summary}</p>
            </div>
            ${page1Experiences.length > 0 ? `
            <div style="margin-bottom:14px;padding-top:10px;border-top:1px solid #eee;">
              <h2 style="margin:0 0 8px;color:#b91c1c;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Work Experience</h2>
              ${renderExperiencesHTML(page1Experiences)}
            </div>
            ` : ""}
            <div style="margin-bottom:14px;padding-top:10px;border-top:1px solid #eee;box-sizing:border-box;">
              <h2 style="margin:0 0 8px;color:#b91c1c;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Skills</h2>
              <div style="display:flex;flex-wrap:wrap;box-sizing:border-box;">
                ${skillsHTML}
              </div>
            </div>
            ${page1Projects.length > 0 ? renderProjectsHTML(page1Projects) : ""}
            ${page1Certifications.length > 0 ? renderCertificationsHTML(page1Certifications) : ""}
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#888;box-sizing:border-box;border-top:1px solid #eee;padding-top:8px;">
            <span>${basicInfo.name}</span>
            <span>Page 1 ${hasPage2 ? 'of 2' : ''}</span>
          </div>
        </div>
      </div>
    `;

    const page2HTML = hasPage2 ? `
      <div class="resume-page" style="width:794px;height:1122px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#fff;color:#333;box-sizing:border-box;overflow:hidden;display:flex;margin:0;padding:0;flex-shrink:0;">
        ${leftColumn2}
        <div style="flex:1;padding:30px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;">
          <div>
            <!-- Page 2 Header Banner -->
            <div style="background:#b91c1c;padding:15px 24px;margin-bottom:20px;box-sizing:border-box;display:flex;justify-content:space-between;align-items:center;border-radius:2px;">
              <h1 style="margin:0;font-size:16px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:0.5px;">${basicInfo.name}</h1>
              <span style="font-size:11px;color:rgba(255,255,255,0.9);font-weight:600;">Resume</span>
            </div>
            ${page2Experiences.length > 0 ? `
            <div style="margin-bottom:14px;padding-top:10px;border-top:1px solid #eee;">
              <h2 style="margin:0 0 8px;color:#b91c1c;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Work Experience</h2>
              ${renderExperiencesHTML(page2Experiences)}
            </div>
            ` : ""}
            ${page2Projects.length > 0 ? renderProjectsHTML(page2Projects) : ""}
            ${page2Certifications.length > 0 ? renderCertificationsHTML(page2Certifications) : ""}
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#888;box-sizing:border-box;border-top:1px solid #eee;padding-top:8px;">
            <span>${basicInfo.name}</span>
            <span>Page 2 of 2</span>
          </div>
        </div>
      </div>
    ` : "";

    return `
      <div id="resume-render-target" style="width:794px;background:#fff;display:flex;flex-direction:column;gap:0px;margin:0;padding:0;box-sizing:border-box;">
        ${page1HTML}
        ${page2HTML}
      </div>
    `;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Template 5: Rounded Pastel (Benjamin Shah style)
  // ───────────────────────────────────────────────────────────────────────────
  if (templateId === "template-5") {
    const profileImgHTML = safeProfilePic
      ? `<img src="${safeProfilePic}" alt="Profile" style="width:75px;height:75px;border-radius:50%;object-fit:cover;border:2px solid #fff;" />`
      : `<div style="width:75px;height:75px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;border:2px solid #fff;font-size:30px;font-weight:700;color:white;text-transform:uppercase;">${(basicInfo.name || "U")[0]}</div>`;

    const renderExperiencesHTML = (exps: WorkExp[]) => exps.map(exp => {
      const dateRange = `${exp.startMonth} ${exp.startYear} – ${exp.current ? "Present" : `${exp.endMonth} ${exp.endYear}`}`;
      const descLines = exp.description
        ? exp.description.split(/\n/).map(l => l.trim()).filter(l => l.length > 0)
            .map(l => `<li style="margin-bottom:3px;color:#444;font-size:10.5px;line-height:1.4;">${cleanLineText(l)}</li>`).join("")
        : "";
      return `
        <div style="margin-bottom:12px;box-sizing:border-box;">
          <p style="margin:0;font-weight:700;color:#111;font-size:11.5px;display:flex;justify-content:space-between;align-items:baseline;">
            <span>${exp.company}</span>
            <span style="color:#666;font-weight:500;font-size:10.5px;">${dateRange}</span>
          </p>
          <p style="margin:2px 0 4px;font-weight:600;color:#555;font-size:10.5px;">${exp.title}</p>
          ${descLines ? `<ul style="margin:4px 0 0 14px;padding:0;list-style-type:disc;">${descLines}</ul>` : ""}
        </div>`;
    }).join("");

    const educationHTML = education.map(edu => {
      const yearRange = `${formatMonthYear(edu.startMonth, edu.startYear)} – ${formatMonthYear(edu.endMonth, edu.endYear)}`;
      return `
        <div style="margin-bottom:10px;box-sizing:border-box;">
          <p style="margin:0;font-weight:700;color:#111;font-size:11.5px;display:flex;justify-content:space-between;align-items:baseline;">
            <span>${edu.college}</span>
            <span style="color:#666;font-weight:500;font-size:10.5px;">${yearRange}</span>
          </p>
          <p style="margin:2px 0 0;color:#555;font-size:10.5px;">${edu.degree}${edu.field ? ` · ${edu.field}` : ""}</p>
        </div>`;
    }).join("");

    const skillsHTML = skills.map(s => `<li style="margin-bottom:4px;color:#444;font-size:10.5px;">${cleanLineText(s)}</li>`).join("");

    const languagesHTML = languages.length > 0
      ? `<div style="margin-top:16px;box-sizing:border-box;">
          <h3 style="margin:0 0 6px;color:#111;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1.5px solid #333;padding-bottom:3px;">Languages</h3>
          <ul style="margin:6px 0 0;padding:0 0 0 14px;list-style-type:disc;color:#444;font-size:10.5px;">
            ${languages.map(l => `<li style="margin-bottom:3px;">${l.language}${l.proficiency ? ` (${l.proficiency})` : ""}</li>`).join("")}
          </ul>
        </div>`
      : "";

    const renderProjectsHTML = (projs: Project[]) => projs.length > 0
      ? `<div style="margin-top:14px;box-sizing:border-box;">
          <h2 style="margin:0 0 8px;color:#111;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #333;padding-bottom:3px;">Projects</h2>
          ${projs.map(p => `
            <div style="margin-bottom:8px;">
              <p style="margin:0 0 2px;font-weight:700;color:#111;font-size:11.5px;display:flex;justify-content:space-between;">
                <span>${p.name}</span>
                ${p.startYear ? `<span style="color:#666;font-size:10.5px;">${formatMonthYear(p.startMonth, p.startYear)}–${p.endYear ? formatMonthYear(p.endMonth, p.endYear) : "Present"}</span>` : ""}
              </p>
              ${p.description ? `<p style="margin:0;color:#444;font-size:10.5px;line-height:1.4;">${p.description}</p>` : ""}
            </div>
          `).join("")}
        </div>`
      : "";

    const renderCertificationsHTML = (certs: Certification[]) => certs.length > 0
      ? `<div style="margin-top:14px;box-sizing:border-box;">
          <h2 style="margin:0 0 8px;color:#111;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #333;padding-bottom:3px;">Certifications</h2>
          ${certs.map(c => `
            <div style="margin-bottom:6px;display:flex;justify-content:space-between;align-items:baseline;">
              <span style="font-weight:700;color:#111;font-size:11.5px;">${c.name}</span>
              ${c.issueDate ? `<span style="color:#666;font-size:10px;">${formatYearMonthString(c.issueDate)}</span>` : ""}
            </div>
          `).join("")}
        </div>`
      : "";

    const leftColumn1 = `
      <div style="width:210px;box-sizing:border-box;display:flex;flex-direction:column;flex-shrink:0;">
        <h3 style="margin:0 0 6px;color:#111;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1.5px solid #333;padding-bottom:3px;">Contact</h3>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:10px;color:#444;margin-bottom:20px;box-sizing:border-box;padding-top:4px;">
          <span style="display:inline-flex;align-items:center;gap:6px;">${getPhoneIcon("#555")} ${basicInfo.phone}</span>
          <span style="display:inline-flex;align-items:center;gap:6px;">${getEmailIcon("#555")} ${basicInfo.email}</span>
          <span style="display:inline-flex;align-items:center;gap:6px;">${getLocationIcon("#555")} ${basicInfo.location}</span>
          ${websiteDisplay ? `<span style="display:inline-flex;align-items:center;gap:6px;">${getGlobeIcon("#555")} ${websiteDisplay}</span>` : ""}
        </div>

        <h3 style="margin:0 0 6px;color:#111;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1.5px solid #333;padding-bottom:3px;">Skills</h3>
        <ul style="margin:6px 0 20px;padding:0 0 0 14px;list-style-type:disc;box-sizing:border-box;">
          ${skillsHTML}
        </ul>

        ${languagesHTML}
      </div>
    `;

    const leftColumn2 = `
      <div style="width:210px;box-sizing:border-box;display:flex;flex-direction:column;flex-shrink:0;">
        <span style="font-size:16px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#111;border-bottom:2px solid #111;padding-bottom:5px;margin-bottom:15px;">${basicInfo.name.split(" ")[0]}</span>
        
        <h3 style="margin:0 0 6px;color:#111;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1.5px solid #333;padding-bottom:3px;">Contact</h3>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:10px;color:#444;margin-bottom:20px;box-sizing:border-box;padding-top:4px;">
          <span style="display:inline-flex;align-items:center;gap:6px;">${getPhoneIcon("#555")} ${basicInfo.phone}</span>
          <span style="display:inline-flex;align-items:center;gap:6px;">${getEmailIcon("#555")} ${basicInfo.email}</span>
        </div>

        <h3 style="margin:0 0 6px;color:#111;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1.5px solid #333;padding-bottom:3px;">Skills</h3>
        <ul style="margin:6px 0 20px;padding:0 0 0 14px;list-style-type:disc;box-sizing:border-box;">
          ${skillsHTML}
        </ul>
      </div>
    `;

    const page1HTML = `
      <div class="resume-page" style="width:794px;height:1122px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#fff;color:#333;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;padding:30px;justify-content:space-between;margin:0;flex-shrink:0;">
        <div style="box-sizing:border-box;">
          <!-- Rounded Pastel Header Panel -->
          <div style="background:#7a9cc6;color:#fff;border-radius:12px;padding:20px 24px;display:flex;align-items:center;gap:20px;margin-bottom:20px;box-sizing:border-box;">
            <div style="flex-shrink:0;">
              ${profileImgHTML}
            </div>
            <div style="flex:1;">
              <h1 style="margin:0;font-size:24px;font-weight:800;letter-spacing:0.5px;">${basicInfo.name}</h1>
              <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.9);font-weight:500;">${headline}</p>
            </div>
          </div>

          <!-- Two Column Body -->
          <div style="display:flex;gap:30px;box-sizing:border-box;overflow:hidden;">
            ${leftColumn1}
            <!-- Right Content Area -->
            <div style="flex:1;box-sizing:border-box;overflow:hidden;">
              <!-- Summary -->
              <div style="margin-bottom:14px;">
                <h2 style="margin:0 0 6px;color:#111;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #333;padding-bottom:3px;">Profile</h2>
                <p style="margin:6px 0 0;color:#444;font-size:10.5px;line-height:1.5;text-align:justify;">${summary}</p>
              </div>

              <!-- Experience -->
              ${page1Experiences.length > 0 ? `
              <div style="margin-bottom:14px;box-sizing:border-box;">
                <h2 style="margin:0 0 8px;color:#111;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #333;padding-bottom:3px;">Professional Experience</h2>
                <div style="padding-top:4px;">
                  ${renderExperiencesHTML(page1Experiences)}
                </div>
              </div>
              ` : ""}

              <!-- Education -->
              <div style="margin-bottom:14px;box-sizing:border-box;">
                <h2 style="margin:0 0 8px;color:#111;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #333;padding-bottom:3px;">Education</h2>
                <div style="padding-top:4px;">
                  ${educationHTML}
                </div>
              </div>

              ${page1Projects.length > 0 ? renderProjectsHTML(page1Projects) : ""}
              ${page1Certifications.length > 0 ? renderCertificationsHTML(page1Certifications) : ""}
            </div>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#888;box-sizing:border-box;border-top:1px solid #eee;padding-top:8px;">
          <span>${basicInfo.name}</span>
          <span>Page 1 ${hasPage2 ? 'of 2' : ''}</span>
        </div>
      </div>
    `;

    const page2HTML = hasPage2 ? `
      <div class="resume-page" style="width:794px;height:1122px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#fff;color:#333;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;padding:30px;justify-content:space-between;margin:0;flex-shrink:0;">
        <div style="box-sizing:border-box;">
          <!-- Rounded Pastel Header Panel Page 2 -->
          <div style="background:#7a9cc6;color:#fff;border-radius:12px;padding:15px 24px;display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;box-sizing:border-box;">
            <h1 style="margin:0;font-size:16px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;color:#fff;">${basicInfo.name}</h1>
            <span style="font-size:12px;color:rgba(255,255,255,0.9);font-weight:500;">Resume</span>
          </div>

          <!-- Two Column Body -->
          <div style="display:flex;gap:30px;box-sizing:border-box;overflow:hidden;">
            ${leftColumn2}
            <!-- Right Content Area -->
            <div style="flex:1;box-sizing:border-box;overflow:hidden;">
              ${page2Experiences.length > 0 ? `
              <div style="margin-bottom:14px;box-sizing:border-box;">
                <h2 style="margin:0 0 8px;color:#111;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #333;padding-bottom:3px;">Professional Experience</h2>
                <div style="padding-top:4px;">
                  ${renderExperiencesHTML(page2Experiences)}
                </div>
              </div>
              ` : ""}

              ${page2Projects.length > 0 ? renderProjectsHTML(page2Projects) : ""}
              ${page2Certifications.length > 0 ? renderCertificationsHTML(page2Certifications) : ""}
            </div>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#888;box-sizing:border-box;border-top:1px solid #eee;padding-top:8px;">
          <span>${basicInfo.name}</span>
          <span>Page 2 of 2</span>
        </div>
      </div>
    ` : "";

    return `
      <div id="resume-render-target" style="width:794px;background:#fff;display:flex;flex-direction:column;gap:0px;margin:0;padding:0;box-sizing:border-box;">
        ${page1HTML}
        ${page2HTML}
      </div>
    `;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Template 6: Maroon Creative (Francisco Andrade style)
  // ───────────────────────────────────────────────────────────────────────────
  if (templateId === "template-6") {
    const profileImgHTML = safeProfilePic
      ? `<img src="${safeProfilePic}" alt="Profile" style="width:124px;height:124px;border-radius:50%;object-fit:cover;display:block;" />`
      : `<div style="width:124px;height:124px;border-radius:50%;background:#381216;display:flex;align-items:center;justify-content:center;font-size:42px;font-weight:800;color:#fff;text-transform:uppercase;">${(basicInfo.name || "U")[0]}</div>`;

    const nameParts = (basicInfo.name || "Candidate Name").trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const renderExperiencesHTML = (exps: WorkExp[]) => exps.map(exp => {
      const dateRange = `${exp.startYear ? `${exp.startYear}` : exp.startMonth} - ${exp.current ? "Present" : (exp.endYear ? `${exp.endYear}` : exp.endMonth)}`;
      const desc = exp.description
        ? `<p style="margin:4px 0 0;font-style:italic;font-size:10px;color:#555;line-height:1.4;">${cleanLineText(exp.description)}</p>`
        : "";
      return `
        <div style="margin-bottom:12px;box-sizing:border-box;">
          <div style="font-size:11px;font-weight:700;color:#222;letter-spacing:0.5px;">${dateRange}</div>
          <div style="font-size:11px;font-weight:800;color:#111;text-transform:uppercase;margin-top:2px;letter-spacing:0.5px;">${exp.title} – ${exp.company}</div>
          ${desc}
        </div>
      `;
    }).join("");

    const educationHTML = education.map(edu => {
      const yearRange = `${edu.startYear || "2020"} - ${edu.endYear || "2024"}`;
      return `
        <div style="margin-bottom:8px;box-sizing:border-box;">
          <div style="font-size:11px;font-weight:700;color:#222;">${yearRange}</div>
          <div style="font-size:11px;font-weight:800;color:#111;">${edu.college}</div>
          <div style="font-size:10px;color:#555;">(${edu.degree}${edu.field ? ` in ${edu.field}` : ""}${edu.score ? ` · Score: ${edu.score}` : ""})</div>
        </div>
      `;
    }).join("");

    const skillsHTML = skills.map((s, idx) => {
      const percentages = [75, 88, 65, 80, 70];
      const pct = percentages[idx % percentages.length];
      return `
        <div style="margin-bottom:10px;box-sizing:border-box;">
          <div style="font-size:11px;font-weight:700;color:#222;margin-bottom:3px;">${cleanLineText(s)}</div>
          <div style="position:relative;width:100%;height:2px;background:#c4b5b0;margin:6px 0;">
            <div style="position:absolute;left:${pct}%;top:50%;transform:translate(-50%, -50%);width:11px;height:11px;border-radius:50%;background:#554340;"></div>
          </div>
        </div>
      `;
    }).join("");

    const renderAwardsHTML = (certs: Certification[], projs: Project[]) => {
      const items = [
        ...certs.map(c => ({ year: c.issueDate ? c.issueDate.split("-")[0] || "Award" : "Certified", title: c.name, sub: c.issuer || "Certification" })),
        ...projs.map(p => ({ year: p.startYear || "Project", title: p.name, sub: p.description ? cleanLineText(p.description) : "" })),
      ];
      if (items.length === 0) return "";
      return `
        <div style="margin-top:14px;box-sizing:border-box;">
          <h2 style="margin:0 0 8px;font-size:13px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:0.8px;border-bottom:1.5px solid #222;padding-bottom:3px;">Awards & Projects</h2>
          ${items.map(item => `
            <div style="margin-bottom:8px;">
              <div style="font-size:11px;font-weight:800;color:#111;">${item.year} (${item.title})</div>
              ${item.sub ? `<div style="font-size:10px;color:#555;">${item.sub}</div>` : ""}
            </div>
          `).join("")}
        </div>
      `;
    };

    const renderLanguagesHTML = (langs: Language[]) => langs.length > 0
      ? `<div style="margin-top:12px;box-sizing:border-box;">
          <h2 style="margin:0 0 6px;font-size:12px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:0.8px;border-bottom:1.5px solid #222;padding-bottom:3px;">Languages</h2>
          <div style="font-size:10.5px;color:#444;">${langs.map(l => `${l.language}${l.proficiency ? ` (${l.proficiency})` : ""}`).join(", ")}</div>
        </div>`
      : "";

    const page1HTML = `
      <div class="resume-page" style="width:794px;height:1122px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#FAF2F0;color:#222;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;margin:0;padding:0;flex-shrink:0;">
        <div style="box-sizing:border-box;">
          <!-- Top Header Maroon -->
          <div style="background:#381216;padding:32px 36px 26px;display:flex;align-items:center;gap:28px;box-sizing:border-box;">
            <div style="position:relative;width:138px;height:138px;border-radius:50%;background:#E62020;padding:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-sizing:border-box;">
              ${profileImgHTML}
            </div>
            <div style="flex:1;box-sizing:border-box;">
              <h1 style="margin:0;font-size:32px;font-weight:800;color:#fff;line-height:1.05;letter-spacing:0.5px;">${firstName}</h1>
              ${lastName ? `<h1 style="margin:2px 0 0;font-size:28px;font-weight:300;color:#fff;line-height:1.05;letter-spacing:0.5px;">${lastName}</h1>` : ""}
              <p style="margin:8px 0 10px;font-size:13px;color:rgba(255,255,255,0.9);font-weight:400;letter-spacing:0.5px;">${headline}</p>
              <div style="border-bottom:1px solid rgba(255,255,255,0.4);margin-bottom:10px;"></div>
              <p style="margin:0;font-size:10.5px;color:rgba(255,255,255,0.85);line-height:1.5;text-align:justify;">${summary}</p>
            </div>
          </div>

          <!-- Main Center with Vertical Rails -->
          <div style="display:flex;box-sizing:border-box;padding:24px 10px 10px;">
            <!-- Left Rail Contact -->
            <div style="width:34px;flex-shrink:0;display:flex;flex-direction:column;justify-content:center;align-items:center;box-sizing:border-box;">
              <div style="writing-mode:vertical-rl;transform:rotate(180deg);font-size:9.5px;font-weight:700;color:#555;letter-spacing:1px;white-space:nowrap;display:flex;gap:16px;">
                <span>${basicInfo.phone}</span>
                <span>${basicInfo.location}</span>
              </div>
            </div>

            <!-- 2-Column Content Grid -->
            <div style="flex:1;display:flex;gap:28px;padding:0 12px;box-sizing:border-box;">
              <!-- Left Column: Experience & Academic -->
              <div style="flex:1.2;box-sizing:border-box;">
                ${page1Experiences.length > 0 ? `
                <div style="margin-bottom:16px;">
                  <h2 style="margin:0 0 10px;font-size:14px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:0.8px;border-bottom:1.5px solid #222;padding-bottom:3px;">Experience</h2>
                  ${renderExperiencesHTML(page1Experiences)}
                </div>
                ` : ""}

                <div>
                  <h2 style="margin:0 0 10px;font-size:14px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:0.8px;border-bottom:1.5px solid #222;padding-bottom:3px;">Academic History</h2>
                  ${educationHTML}
                </div>
              </div>

              <!-- Right Column: Skills & Awards -->
              <div style="flex:0.9;box-sizing:border-box;">
                <div style="margin-bottom:16px;">
                  <h2 style="margin:0 0 10px;font-size:14px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:0.8px;border-bottom:1.5px solid #222;padding-bottom:3px;">Soft Skills</h2>
                  ${skillsHTML}
                </div>

                ${renderAwardsHTML(page1Certifications, page1Projects)}
                ${page1Languages.length > 0 ? renderLanguagesHTML(page1Languages) : ""}
              </div>
            </div>

            <!-- Right Rail Contact -->
            <div style="width:34px;flex-shrink:0;display:flex;flex-direction:column;justify-content:center;align-items:center;box-sizing:border-box;">
              <div style="writing-mode:vertical-rl;font-size:9.5px;font-weight:700;color:#555;letter-spacing:1px;white-space:nowrap;display:flex;gap:16px;">
                ${websiteDisplay ? `<span>${websiteDisplay}</span>` : ""}
                <span>${basicInfo.email}</span>
              </div>
            </div>
          </div>
        </div>

        <div style="padding:8px 36px;border-top:1px solid rgba(0,0,0,0.06);display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:#777;box-sizing:border-box;">
          <span>${basicInfo.name} - Resume</span>
          <span>Page 1 ${hasPage2 ? 'of 2' : ''}</span>
        </div>
      </div>
    `;

    const page2HTML = hasPage2 ? `
      <div class="resume-page" style="width:794px;height:1122px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#FAF2F0;color:#222;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;margin:0;padding:0;flex-shrink:0;">
        <div style="box-sizing:border-box;">
          <div style="background:#381216;padding:18px 36px;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;">
            <span style="font-size:16px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:0.5px;">${basicInfo.name}</span>
            <span style="font-size:11px;color:rgba(255,255,255,0.8);font-weight:600;">Resume</span>
          </div>

          <div style="padding:24px 36px;box-sizing:border-box;">
            ${page2Experiences.length > 0 ? `
            <div style="margin-bottom:16px;">
              <h2 style="margin:0 0 10px;font-size:14px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:0.8px;border-bottom:1.5px solid #222;padding-bottom:3px;">Experience</h2>
              ${renderExperiencesHTML(page2Experiences)}
            </div>
            ` : ""}

            ${renderAwardsHTML(page2Certifications, page2Projects)}
            ${page2Languages.length > 0 ? renderLanguagesHTML(page2Languages) : ""}
          </div>
        </div>

        <div style="padding:8px 36px;border-top:1px solid rgba(0,0,0,0.06);display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:#777;box-sizing:border-box;">
          <span>${basicInfo.name} - Resume</span>
          <span>Page 2 of 2</span>
        </div>
      </div>
    ` : "";

    return `
      <div id="resume-render-target" style="width:794px;background:#fff;display:flex;flex-direction:column;gap:0px;margin:0;padding:0;box-sizing:border-box;">
        ${page1HTML}
        ${page2HTML}
      </div>
    `;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Template 7: Executive Hexagon (Phyllis Schwaiger style)
  // ───────────────────────────────────────────────────────────────────────────
  if (templateId === "template-7") {
    const profileImgHTML = safeProfilePic
      ? `<div style="width:132px;height:142px;clip-path:polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);background:#1A56DB;padding:3px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;">
          <img src="${safeProfilePic}" alt="Profile" style="width:126px;height:136px;clip-path:polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);object-fit:cover;" />
         </div>`
      : `<div style="width:132px;height:142px;clip-path:polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);background:#1A56DB;display:flex;align-items:center;justify-content:center;color:#fff;font-size:42px;font-weight:900;">
          ${(basicInfo.name || "U")[0]}
         </div>`;

    const nameParts = (basicInfo.name || "Candidate Name").trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const renderSkillGauges = (skillsList: string[]) => {
      const percentages = [85, 90, 75, 80];
      return skillsList.slice(0, 4).map((s, idx) => {
        const pct = percentages[idx % percentages.length];
        const radius = 20;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (pct / 100) * circumference;
        return `
          <div style="display:flex;flex-direction:column;align-items:center;text-align:center;width:64px;box-sizing:border-box;">
            <div style="position:relative;width:48px;height:48px;">
              <svg width="48" height="48" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="${radius}" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="4" />
                <circle cx="24" cy="24" r="${radius}" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round"
                  stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" transform="rotate(-90 24 24)" />
              </svg>
              <div style="position:absolute;top:0;left:0;width:48px;height:48px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:700;">
                ${pct}%
              </div>
            </div>
            <span style="font-size:9px;font-weight:700;color:#fff;margin-top:3px;line-height:1.15;word-break:break-word;">${cleanLineText(s)}</span>
          </div>
        `;
      }).join("");
    };

    const renderExperiencesHTML = (exps: WorkExp[]) => {
      return `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;box-sizing:border-box;">
          ${exps.map(exp => {
            const dateRange = `${exp.startYear || exp.startMonth} - ${exp.current ? "Present" : (exp.endYear || exp.endMonth)}`;
            return `
              <div style="box-sizing:border-box;">
                <div style="font-size:11.5px;font-weight:800;color:#1B2838;">${exp.title}</div>
                <div style="font-size:11px;font-weight:700;color:#1A56DB;margin-bottom:3px;">${exp.company} (${dateRange})</div>
                ${exp.description ? `<p style="margin:0;font-size:10px;color:#555;line-height:1.4;">${cleanLineText(exp.description)}</p>` : ""}
              </div>
            `;
          }).join("")}
        </div>
      `;
    };

    const educationHTML = education.map(edu => {
      const yearRange = `${edu.endYear || edu.startYear || "2024"}`;
      return `
        <div style="margin-bottom:10px;box-sizing:border-box;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;">
            <span style="font-size:11.5px;font-weight:800;color:#1B2838;">${edu.college}</span>
            <span style="font-size:11px;font-weight:700;color:#1A56DB;">${yearRange}</span>
          </div>
          <p style="margin:2px 0 0;font-size:10.5px;color:#555;">${edu.degree}${edu.field ? ` in ${edu.field}` : ""}${edu.score ? ` · ${edu.score}` : ""}</p>
        </div>
      `;
    }).join("");

    const renderAchievementsHTML = (certs: Certification[], projs: Project[]) => {
      const items = [
        ...certs.map(c => ({ title: c.issuer || "Certification", year: c.issueDate ? c.issueDate.split("-")[0] || "2024" : "Certified", desc: c.name })),
        ...projs.map(p => ({ title: p.name, year: p.endYear || p.startYear || "Project", desc: p.description ? cleanLineText(p.description) : "" })),
      ];
      if (items.length === 0) return "";
      return `
        <div style="margin-top:14px;box-sizing:border-box;">
          <h2 style="margin:0 0 8px;font-size:12.5px;font-weight:800;color:#1A56DB;text-transform:uppercase;letter-spacing:0.8px;">Achievement</h2>
          ${items.slice(0, 2).map(item => `
            <div style="margin-bottom:8px;box-sizing:border-box;">
              <div style="display:flex;justify-content:space-between;align-items:baseline;">
                <span style="font-size:11.5px;font-weight:800;color:#1B2838;">${item.title}</span>
                <span style="font-size:11px;font-weight:700;color:#1A56DB;">${item.year}</span>
              </div>
              ${item.desc ? `<p style="margin:2px 0 0;font-size:10px;color:#555;line-height:1.4;">${item.desc}</p>` : ""}
            </div>
          `).join("")}
        </div>
      `;
    };

    const page1HTML = `
      <div class="resume-page" style="width:794px;height:1122px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#fff;color:#333;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;margin:0;padding:0;flex-shrink:0;">
        <div style="box-sizing:border-box;">
          <!-- Top Header Section -->
          <div style="padding:32px 36px 16px;display:flex;justify-content:space-between;align-items:flex-start;position:relative;box-sizing:border-box;">
            <!-- Background angled graphic -->
            <div style="position:absolute;top:0;right:0;width:240px;height:100%;background:#1B2838;clip-path:polygon(45% 0%, 100% 0%, 100% 100%, 0% 100%);pointer-events:none;z-index:0;"></div>

            <div style="position:relative;z-index:1;flex:1;box-sizing:border-box;padding-right:20px;">
              <h1 style="margin:0;font-size:32px;font-weight:900;line-height:1;letter-spacing:0.5px;text-transform:uppercase;color:#1B2838;">
                ${firstName} <span style="color:#1A56DB;">${lastName}</span>
              </h1>
              <p style="margin:8px 0 14px;font-size:13px;font-weight:700;color:#222;letter-spacing:1.5px;text-transform:uppercase;">${headline}</p>
              
              <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:10.5px;color:#333;">
                <span style="display:inline-flex;align-items:center;gap:6px;background:#F4F6F9;padding:4px 10px;border-radius:9999px;">
                  ${getPhoneIcon("#1A56DB")} ${basicInfo.phone}
                </span>
                <span style="display:inline-flex;align-items:center;gap:6px;background:#F4F6F9;padding:4px 10px;border-radius:9999px;">
                  ${getEmailIcon("#1A56DB")} ${basicInfo.email}
                </span>
                ${websiteDisplay ? `
                <span style="display:inline-flex;align-items:center;gap:6px;background:#F4F6F9;padding:4px 10px;border-radius:9999px;">
                  ${getGlobeIcon("#1A56DB")} ${websiteDisplay}
                </span>` : ""}
              </div>
            </div>

            <div style="position:relative;z-index:1;flex-shrink:0;">
              ${profileImgHTML}
            </div>
          </div>

          <!-- Body Content Area -->
          <div style="padding:10px 36px 20px;box-sizing:border-box;">
            <!-- Profile -->
            <div style="margin-bottom:16px;">
              <h2 style="margin:0 0 6px;font-size:13px;font-weight:800;color:#1A56DB;text-transform:uppercase;letter-spacing:0.8px;">My Profile</h2>
              <p style="margin:0;font-size:10.5px;color:#444;line-height:1.5;text-align:justify;">${summary}</p>
            </div>

            <!-- Work Experience -->
            ${page1Experiences.length > 0 ? `
            <div style="margin-bottom:18px;">
              <h2 style="margin:0 0 10px;font-size:13px;font-weight:800;color:#1A56DB;text-transform:uppercase;letter-spacing:0.8px;">My Work Experience</h2>
              ${renderExperiencesHTML(page1Experiences)}
            </div>
            ` : ""}

            <!-- Bottom Split: Expertise Box & Education/Achievements -->
            <div style="display:flex;gap:24px;margin-top:16px;box-sizing:border-box;">
              <!-- Blue Box with Circular Gauges -->
              <div style="width:310px;background:#1A56DB;border-radius:14px;padding:16px 14px;box-sizing:border-box;display:flex;align-items:center;gap:12px;position:relative;flex-shrink:0;">
                <div style="writing-mode:vertical-rl;transform:rotate(180deg);font-size:10px;font-weight:900;color:#fff;letter-spacing:1.5px;text-transform:uppercase;border-left:2px solid rgba(255,255,255,0.4);padding-left:4px;">
                  EXPERTISE
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 10px;flex:1;justify-items:center;">
                  ${renderSkillGauges(skills)}
                </div>
              </div>

              <!-- Right: Education & Achievements -->
              <div style="flex:1;box-sizing:border-box;">
                <div>
                  <h2 style="margin:0 0 8px;font-size:12.5px;font-weight:800;color:#1A56DB;text-transform:uppercase;letter-spacing:0.8px;">Education</h2>
                  ${educationHTML}
                </div>
                ${renderAchievementsHTML(page1Certifications, page1Projects)}
              </div>
            </div>
          </div>
        </div>

        <div style="padding:10px 36px;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:#888;box-sizing:border-box;">
          <span>${basicInfo.name} - Resume</span>
          <span>Page 1 ${hasPage2 ? 'of 2' : ''}</span>
        </div>
      </div>
    `;

    const page2HTML = hasPage2 ? `
      <div class="resume-page" style="width:794px;height:1122px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#fff;color:#333;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;margin:0;padding:0;flex-shrink:0;">
        <div style="box-sizing:border-box;">
          <div style="background:#1B2838;padding:18px 36px;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;">
            <span style="font-size:16px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:0.5px;">${basicInfo.name}</span>
            <span style="font-size:11px;color:rgba(255,255,255,0.8);font-weight:600;">Resume</span>
          </div>

          <div style="padding:24px 36px;box-sizing:border-box;">
            ${page2Experiences.length > 0 ? `
            <div style="margin-bottom:18px;">
              <h2 style="margin:0 0 10px;font-size:13px;font-weight:800;color:#1A56DB;text-transform:uppercase;letter-spacing:0.8px;">My Work Experience</h2>
              ${renderExperiencesHTML(page2Experiences)}
            </div>
            ` : ""}

            ${renderAchievementsHTML(page2Certifications, page2Projects)}
          </div>
        </div>

        <div style="padding:10px 36px;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:#888;box-sizing:border-box;">
          <span>${basicInfo.name} - Resume</span>
          <span>Page 2 of 2</span>
        </div>
      </div>
    ` : "";

    return `
      <div id="resume-render-target" style="width:794px;background:#fff;display:flex;flex-direction:column;gap:0px;margin:0;padding:0;box-sizing:border-box;">
        ${page1HTML}
        ${page2HTML}
      </div>
    `;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Template 8: Black & Gold Minimalist (Eleanor Fitzgerald style)
  // ───────────────────────────────────────────────────────────────────────────
  if (templateId === "template-8") {
    const profileImgHTML = safeProfilePic
      ? `<img src="${safeProfilePic}" alt="Profile" style="width:115px;height:115px;border-radius:50%;object-fit:cover;border:4px solid #FFC800;display:block;box-shadow:0 4px 10px rgba(0,0,0,0.3);" />`
      : `<div style="width:115px;height:115px;border-radius:50%;background:#1a1a1a;border:4px solid #FFC800;display:flex;align-items:center;justify-content:center;color:#FFC800;font-size:42px;font-weight:800;">${(basicInfo.name || "U")[0]}</div>`;

    const nameParts = (basicInfo.name || "Candidate Name").trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const skillsProgressHTML = skills.slice(0, 4).map((s, idx) => {
      const percentages = [84, 85, 95, 90];
      const pct = percentages[idx % percentages.length];
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:8px;box-sizing:border-box;">
          <span style="font-size:11px;font-weight:600;color:#222;flex:1;">${cleanLineText(s)}</span>
          <div style="width:110px;height:9px;background:#e5e7eb;border-radius:9999px;overflow:hidden;flex-shrink:0;">
            <div style="width:${pct}%;height:100%;background:#381216;border-radius:9999px;"></div>
          </div>
          <span style="font-size:10px;font-weight:700;color:#555;width:30px;text-align:right;">${pct}%</span>
        </div>
      `;
    }).join("");

    const renderExperiencesHTML = (exps: WorkExp[]) => exps.map(exp => {
      const dateRange = `${exp.startMonth} ${exp.startYear} - ${exp.current ? "Present" : `${exp.endMonth} ${exp.endYear}`}`;
      const descLines = exp.description
        ? exp.description.split(/\n/).map(l => l.trim()).filter(l => l.length > 0)
            .map(l => `<li style="margin-bottom:3px;color:#444;font-size:10.5px;line-height:1.4;">${cleanLineText(l)}</li>`).join("")
        : "";
      return `
        <div style="margin-bottom:12px;box-sizing:border-box;">
          <div style="font-size:11.5px;font-weight:800;color:#111;">${exp.company}</div>
          <div style="font-size:11px;font-weight:600;color:#555;margin-bottom:4px;">${exp.title} (${dateRange})</div>
          ${descLines ? `<ul style="margin:0 0 0 14px;padding:0;list-style-type:disc;">${descLines}</ul>` : ""}
        </div>
      `;
    }).join("");

    const educationHTML = education.map(edu => {
      const yearRange = `${formatMonthYear(edu.startMonth, edu.startYear)} - ${formatMonthYear(edu.endMonth, edu.endYear)}`;
      return `
        <div style="margin-bottom:8px;box-sizing:border-box;">
          <div style="font-size:11.5px;font-weight:800;color:#111;">${edu.college}</div>
          <div style="font-size:10.5px;color:#555;">${edu.degree}${edu.field ? ` in ${edu.field}` : ""} (${yearRange})</div>
        </div>
      `;
    }).join("");

    const renderProjectsHTML = (projs: Project[], certs: Certification[]) => {
      const items = [
        ...projs.map(p => ({ title: p.name, sub: p.description ? cleanLineText(p.description) : "" })),
        ...certs.map(c => ({ title: c.name, sub: c.issuer || "" })),
      ];
      if (items.length === 0) return "";
      return `
        <div style="display:flex;margin-bottom:14px;box-sizing:border-box;">
          <div style="width:130px;font-size:11px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:0.5px;flex-shrink:0;">PROJECTS</div>
          <div style="flex:1;box-sizing:border-box;">
            ${items.slice(0, 2).map(item => `
              <div style="margin-bottom:6px;">
                <span style="font-size:11px;font-weight:700;color:#111;">${item.title}</span>
                ${item.sub ? `<span style="font-size:10.5px;color:#555;"> · ${item.sub}</span>` : ""}
              </div>
            `).join("")}
          </div>
        </div>
      `;
    };

    const page1HTML = `
      <div class="resume-page" style="width:794px;height:1122px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#0A0A0A;color:#222;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;margin:0;padding:0;flex-shrink:0;position:relative;">
        <div style="box-sizing:border-box;">
          <!-- Top Black Header -->
          <div style="background:#0A0A0A;padding:28px 36px 36px;display:flex;align-items:center;gap:30px;position:relative;box-sizing:border-box;">
            <!-- Yellow Top Bar Decor -->
            <div style="position:absolute;top:0;right:60px;width:14px;height:70px;background:#FFC800;border-radius:0 0 7px 7px;"></div>

            <div style="flex-shrink:0;">
              ${profileImgHTML}
            </div>

            <div style="flex:1;box-sizing:border-box;">
              <h1 style="margin:0;font-size:32px;font-weight:800;color:#FFC800;line-height:1.1;letter-spacing:0.5px;">${firstName}</h1>
              ${lastName ? `<h1 style="margin:2px 0 0;font-size:32px;font-weight:800;color:#FFC800;line-height:1.1;letter-spacing:0.5px;">${lastName}</h1>` : ""}
              <p style="margin:8px 0 0;font-size:13px;color:#fff;font-weight:700;letter-spacing:2px;text-transform:uppercase;">${headline}</p>
            </div>
          </div>

          <!-- White Body Card overlapping Black Header -->
          <div style="background:#fff;border-radius:24px 24px 0 0;margin:0 14px;padding:24px 28px;display:flex;gap:20px;box-sizing:border-box;">
            <!-- Left Rail with Rotated Headers -->
            <div style="width:34px;flex-shrink:0;display:flex;flex-direction:column;justify-content:space-around;align-items:center;border-right:1.5px solid #eee;padding-right:8px;box-sizing:border-box;">
              <div style="writing-mode:vertical-rl;transform:rotate(180deg);font-size:8.5px;font-weight:800;color:#888;letter-spacing:1px;white-space:nowrap;">
                PHONE · ${basicInfo.phone}
              </div>
              <div style="writing-mode:vertical-rl;transform:rotate(180deg);font-size:8.5px;font-weight:800;color:#888;letter-spacing:1px;white-space:nowrap;">
                E-MAIL · ${basicInfo.email}
              </div>
              ${websiteDisplay ? `
              <div style="writing-mode:vertical-rl;transform:rotate(180deg);font-size:8.5px;font-weight:800;color:#888;letter-spacing:1px;white-space:nowrap;">
                WEBSITE · ${websiteDisplay}
              </div>` : ""}
            </div>

            <!-- Content Area -->
            <div style="flex:1;box-sizing:border-box;">
              <!-- Personal Profile -->
              <div style="display:flex;margin-bottom:16px;box-sizing:border-box;">
                <div style="width:130px;font-size:11px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:0.5px;flex-shrink:0;">PERSONAL PROFILE</div>
                <p style="margin:0;flex:1;font-size:10.5px;color:#444;line-height:1.5;text-align:justify;">${summary}</p>
              </div>

              <!-- Education -->
              <div style="display:flex;margin-bottom:16px;box-sizing:border-box;">
                <div style="width:130px;font-size:11px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:0.5px;flex-shrink:0;">EDUCATION</div>
                <div style="flex:1;box-sizing:border-box;">
                  ${educationHTML}
                </div>
              </div>

              <!-- Experience -->
              ${page1Experiences.length > 0 ? `
              <div style="display:flex;margin-bottom:16px;box-sizing:border-box;">
                <div style="width:130px;font-size:11px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:0.5px;flex-shrink:0;">EXPERIENCE</div>
                <div style="flex:1;box-sizing:border-box;">
                  ${renderExperiencesHTML(page1Experiences)}
                </div>
              </div>
              ` : ""}

              <!-- Skills -->
              <div style="display:flex;margin-bottom:14px;box-sizing:border-box;">
                <div style="width:130px;font-size:11px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:0.5px;flex-shrink:0;">SKILLS</div>
                <div style="flex:1;box-sizing:border-box;">
                  ${skillsProgressHTML}
                </div>
              </div>

              ${renderProjectsHTML(page1Projects, page1Certifications)}
            </div>
          </div>
        </div>

        <div style="padding:8px 36px;display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:#fff;box-sizing:border-box;">
          <span>${basicInfo.name} - Resume</span>
          <span>Page 1 ${hasPage2 ? 'of 2' : ''}</span>
        </div>
      </div>
    `;

    const page2HTML = hasPage2 ? `
      <div class="resume-page" style="width:794px;height:1122px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#fff;color:#222;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;margin:0;padding:0;flex-shrink:0;">
        <div style="box-sizing:border-box;">
          <div style="background:#0A0A0A;padding:18px 36px;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;">
            <span style="font-size:16px;font-weight:800;color:#FFC800;text-transform:uppercase;letter-spacing:0.5px;">${basicInfo.name}</span>
            <span style="font-size:11px;color:#fff;font-weight:600;">Resume</span>
          </div>

          <div style="padding:28px 36px;box-sizing:border-box;">
            ${page2Experiences.length > 0 ? `
            <div style="margin-bottom:16px;">
              <h2 style="margin:0 0 10px;font-size:13px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:0.8px;border-bottom:1.5px solid #222;padding-bottom:3px;">Experience</h2>
              ${renderExperiencesHTML(page2Experiences)}
            </div>
            ` : ""}

            ${renderProjectsHTML(page2Projects, page2Certifications)}
          </div>
        </div>

        <div style="padding:8px 36px;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:#888;box-sizing:border-box;">
          <span>${basicInfo.name} - Resume</span>
          <span>Page 2 of 2</span>
        </div>
      </div>
    ` : "";

    return `
      <div id="resume-render-target" style="width:794px;background:#fff;display:flex;flex-direction:column;gap:0px;margin:0;padding:0;box-sizing:border-box;">
        ${page1HTML}
        ${page2HTML}
      </div>
    `;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Template 9: Creative Pastel Bento (Olivia Wilson style)
  // ───────────────────────────────────────────────────────────────────────────
  if (templateId === "template-9") {
    const profileImgHTML = safeProfilePic
      ? `<img src="${safeProfilePic}" alt="Profile" style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:2px solid #2D242B;display:block;" />`
      : `<div style="width:90px;height:90px;border-radius:50%;background:#2D242B;display:flex;align-items:center;justify-content:center;color:#fff;font-size:36px;font-weight:800;">${(basicInfo.name || "U")[0]}</div>`;

    const renderExperiencesHTML = (exps: WorkExp[]) => exps.map(exp => {
      const dateRange = `${exp.startYear || exp.startMonth} - ${exp.current ? "Present" : (exp.endYear || exp.endMonth)}`;
      const descLines = exp.description
        ? exp.description.split(/\n/).map(l => l.trim()).filter(l => l.length > 0)
            .map(l => `<li style="margin-bottom:2px;font-size:10px;color:#333;line-height:1.35;">${cleanLineText(l)}</li>`).join("")
        : "";
      return `
        <div style="margin-bottom:10px;box-sizing:border-box;">
          <div style="font-size:11.5px;font-weight:800;color:#111;">${exp.title} (${dateRange})</div>
          <div style="font-size:10.5px;font-style:italic;color:#555;margin-bottom:3px;">${exp.company}</div>
          ${descLines ? `<ul style="margin:0 0 0 14px;padding:0;list-style-type:disc;">${descLines}</ul>` : ""}
        </div>
      `;
    }).join("");

    const skillsListHTML = skills.map(s => `<li style="margin-bottom:3px;font-size:10.5px;color:#333;line-height:1.3;">${cleanLineText(s)}</li>`).join("");

    const renderAchievementsHTML = (certs: Certification[], projs: Project[]) => {
      const items = [
        ...certs.map(c => ({ title: c.name, sub: c.issuer || "Certification" })),
        ...projs.map(p => ({ title: p.name, sub: p.description ? cleanLineText(p.description) : "" })),
      ];
      if (items.length === 0) return "";
      return items.slice(0, 2).map(item => `
        <div style="margin-bottom:8px;">
          <div style="font-size:11px;font-weight:800;color:#111;">• ${item.title}</div>
          ${item.sub ? `<p style="margin:2px 0 0 10px;font-size:10px;color:#555;line-height:1.35;">${item.sub}</p>` : ""}
        </div>
      `).join("");
    };

    const languagesPillsHTML = languages.length > 0
      ? languages.map(l => `<span style="background:#fff;border:1.5px solid #2D242B;border-radius:9999px;padding:2px 10px;font-size:10px;font-weight:700;color:#2D242B;">${l.language}</span>`).join("")
      : `<span style="background:#fff;border:1.5px solid #2D242B;border-radius:9999px;padding:2px 10px;font-size:10px;font-weight:700;color:#2D242B;">Networking</span>
         <span style="background:#fff;border:1.5px solid #2D242B;border-radius:9999px;padding:2px 10px;font-size:10px;font-weight:700;color:#2D242B;">Reading</span>`;

    const page1HTML = `
      <div class="resume-page" style="width:794px;height:1122px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#D884D2;color:#2D242B;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;margin:0;padding:20px;flex-shrink:0;">
        <div style="box-sizing:border-box;">
          <!-- Top Rounded Header Card with Sparkles -->
          <div style="background:#fff;border:2px solid #2D242B;border-radius:18px;padding:18px 22px;display:flex;align-items:center;gap:20px;position:relative;margin-bottom:14px;box-sizing:border-box;">
            <span style="position:absolute;top:8px;left:10px;font-size:12px;color:#2D242B;">✦</span>
            <span style="position:absolute;top:8px;right:10px;font-size:12px;color:#2D242B;">✦</span>
            <span style="position:absolute;bottom:8px;left:10px;font-size:12px;color:#2D242B;">✦</span>
            <span style="position:absolute;bottom:8px;right:10px;font-size:12px;color:#2D242B;">✦</span>

            <div style="flex-shrink:0;">
              ${profileImgHTML}
            </div>

            <div style="flex:1;box-sizing:border-box;">
              <span style="background:#2D242B;color:#fff;border-radius:9999px;padding:3px 12px;font-size:11px;font-weight:700;display:inline-block;margin-bottom:6px;">
                ${headline}
              </span>
              <h1 style="margin:0;font-size:30px;font-weight:900;color:#2D242B;line-height:1.1;">${basicInfo.name}</h1>
              <p style="margin:6px 0 0;font-size:10.5px;color:#444;line-height:1.45;text-align:justify;">${summary}</p>
            </div>
          </div>

          <!-- Bento Grid Layout -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;box-sizing:border-box;">
            <!-- Card 1: Experiences (Mint) -->
            <div style="background:#D4F3F7;border:2px solid #2D242B;border-radius:16px;padding:16px;box-sizing:border-box;">
              <h2 style="margin:0 0 10px;font-size:15px;font-weight:900;color:#2D242B;">Experiences</h2>
              ${page1Experiences.length > 0 ? renderExperiencesHTML(page1Experiences) : `<p style="font-size:10.5px;color:#555;">Fresher / Exploring opportunities</p>`}
            </div>

            <!-- Card 2: Skills & Expertise (Mint) -->
            <div style="background:#D4F3F7;border:2px solid #2D242B;border-radius:16px;padding:16px;box-sizing:border-box;">
              <h2 style="margin:0 0 10px;font-size:15px;font-weight:900;color:#2D242B;">Skills & Expertise</h2>
              <ul style="margin:0;padding:0 0 0 14px;list-style-type:disc;">
                ${skillsListHTML}
              </ul>
            </div>

            <!-- Card 3: Education & Achievements (White) -->
            <div style="background:#fff;border:2px solid #2D242B;border-radius:16px;padding:16px;box-sizing:border-box;">
              <h2 style="margin:0 0 8px;font-size:15px;font-weight:900;color:#2D242B;">Education & Achievements</h2>
              ${education.slice(0, 2).map(edu => `
                <div style="margin-bottom:6px;">
                  <div style="font-size:11px;font-weight:800;color:#111;">${edu.college}</div>
                  <div style="font-size:10px;color:#555;">${edu.degree}${edu.field ? ` · ${edu.field}` : ""}</div>
                </div>
              `).join("")}
              ${renderAchievementsHTML(page1Certifications, page1Projects)}
            </div>

            <!-- Card 4 & 5 Column -->
            <div style="display:flex;flex-direction:column;gap:14px;box-sizing:border-box;">
              <!-- Hobbies / Languages -->
              <div style="background:#FFF0F5;border:2px solid #2D242B;border-radius:16px;padding:14px;box-sizing:border-box;">
                <h2 style="margin:0 0 8px;font-size:14px;font-weight:900;color:#2D242B;">Languages & Interests</h2>
                <div style="display:flex;flex-wrap:wrap;gap:6px;">
                  ${languagesPillsHTML}
                </div>
              </div>

              <!-- Contacts Card -->
              <div style="background:#FFF0F5;border:2px solid #2D242B;border-radius:16px;padding:14px;box-sizing:border-box;">
                <h2 style="margin:0 0 8px;font-size:14px;font-weight:900;color:#2D242B;">Contacts</h2>
                <div style="font-size:10.5px;color:#2D242B;line-height:1.5;">
                  <div>• ${basicInfo.phone}</div>
                  <div>• ${basicInfo.email}</div>
                  <div>• ${basicInfo.location}</div>
                  ${websiteDisplay ? `<div>• ${websiteDisplay}</div>` : ""}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style="padding:6px 16px;display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:#fff;font-weight:700;box-sizing:border-box;">
          <span>${basicInfo.name} - Resume</span>
          <span>Page 1 ${hasPage2 ? 'of 2' : ''}</span>
        </div>
      </div>
    `;

    const page2HTML = hasPage2 ? `
      <div class="resume-page" style="width:794px;height:1122px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#D884D2;color:#2D242B;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;margin:0;padding:20px;flex-shrink:0;">
        <div style="box-sizing:border-box;">
          <div style="background:#fff;border:2px solid #2D242B;border-radius:16px;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;box-sizing:border-box;">
            <span style="font-size:16px;font-weight:900;color:#2D242B;">${basicInfo.name}</span>
            <span style="font-size:11px;font-weight:700;color:#2D242B;">Resume Page 2</span>
          </div>

          <div style="display:grid;grid-template-columns:1fr;gap:14px;box-sizing:border-box;">
            ${page2Experiences.length > 0 ? `
            <div style="background:#D4F3F7;border:2px solid #2D242B;border-radius:16px;padding:16px;box-sizing:border-box;">
              <h2 style="margin:0 0 10px;font-size:15px;font-weight:900;color:#2D242B;">Experiences (Continued)</h2>
              ${renderExperiencesHTML(page2Experiences)}
            </div>
            ` : ""}

            <div style="background:#fff;border:2px solid #2D242B;border-radius:16px;padding:16px;box-sizing:border-box;">
              <h2 style="margin:0 0 10px;font-size:15px;font-weight:900;color:#2D242B;">Projects & Certifications</h2>
              ${renderAchievementsHTML(page2Certifications, page2Projects)}
            </div>
          </div>
        </div>

        <div style="padding:6px 16px;display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:#fff;font-weight:700;box-sizing:border-box;">
          <span>${basicInfo.name} - Resume</span>
          <span>Page 2 of 2</span>
        </div>
      </div>
    ` : "";

    return `
      <div id="resume-render-target" style="width:794px;background:#fff;display:flex;flex-direction:column;gap:0px;margin:0;padding:0;box-sizing:border-box;">
        ${page1HTML}
        ${page2HTML}
      </div>
    `;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Template 10: Emerald Botanical (Cahaya Dewi style)
  // ───────────────────────────────────────────────────────────────────────────
  if (templateId === "template-10") {
    const profileImgHTML = safeProfilePic
      ? `<img src="${safeProfilePic}" alt="Profile" style="width:180px;height:190px;border-radius:4px;object-fit:cover;border:4px solid rgba(255,255,255,0.9);box-shadow:0 4px 12px rgba(0,0,0,0.15);display:block;margin-bottom:20px;" />`
      : `<div style="width:180px;height:190px;border-radius:4px;background:rgba(255,255,255,0.2);border:4px solid rgba(255,255,255,0.9);box-shadow:0 4px 12px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center;color:#fff;font-size:52px;font-weight:700;margin-bottom:20px;">${(basicInfo.name || "U")[0]}</div>`;

    const renderExperiencesHTML = (exps: WorkExp[]) => exps.map(exp => {
      const dateRange = `${exp.startMonth} ${exp.startYear} to ${exp.current ? "Present" : `${exp.endMonth} ${exp.endYear}`}`;
      const descLines = exp.description
        ? exp.description.split(/\n/).map(l => l.trim()).filter(l => l.length > 0)
            .map(l => `<li style="margin-bottom:4px;color:#444;font-size:11px;line-height:1.55;">${cleanLineText(l)}</li>`).join("")
        : "";
      return `
        <div style="margin-bottom:16px;box-sizing:border-box;">
          <div style="font-size:13px;font-weight:800;color:#2E8540;">${exp.title}</div>
          <div style="font-size:11.5px;font-weight:700;color:#222;margin-bottom:4px;">${exp.company} • <span style="font-weight:500;color:#666;">${dateRange}</span></div>
          ${descLines ? `<ul style="margin:0 0 0 16px;padding:0;list-style-type:disc;">${descLines}</ul>` : ""}
        </div>
      `;
    }).join("");

    const educationHTML = education.map(edu => {
      const yearRange = `Class of ${edu.endYear || edu.startYear || "2024"}`;
      return `
        <div style="margin-bottom:14px;box-sizing:border-box;">
          <div style="font-size:13px;font-weight:800;color:#2E8540;">${edu.college}</div>
          <div style="font-size:11.5px;font-weight:600;color:#222;">${edu.degree}${edu.field ? `, ${edu.field}` : ""} • <span style="font-weight:400;color:#666;">${yearRange}</span></div>
          ${edu.score ? `<div style="font-size:11px;color:#555;margin-top:2px;">• Score / GPA: ${edu.score}</div>` : ""}
        </div>
      `;
    }).join("");

    const renderProjectsHTML = (projs: Project[], certs: Certification[]) => {
      const items = [
        ...projs.map(p => ({ title: p.name, desc: p.description ? cleanLineText(p.description) : "" })),
        ...certs.map(c => ({ title: c.name, desc: c.issuer || "" })),
      ];
      if (items.length === 0) return "";
      return `
        <div style="margin-top:16px;box-sizing:border-box;">
          <h2 style="margin:0 0 10px;font-size:13.5px;font-weight:800;color:#2E8540;text-transform:uppercase;letter-spacing:0.8px;border-bottom:2px solid #2E8540;padding-bottom:3px;">PROJECTS & HONORS</h2>
          ${items.map(item => `
            <div style="margin-bottom:10px;box-sizing:border-box;">
              <div style="font-size:11.5px;font-weight:700;color:#111;">• ${item.title}</div>
              ${item.desc ? `<div style="font-size:11px;color:#555;margin-left:12px;line-height:1.45;">${item.desc}</div>` : ""}
            </div>
          `).join("")}
        </div>
      `;
    };

    const rightColumn1 = `
      <div style="width:295px;background:#38A169;color:#fff;padding:36px 24px;box-sizing:border-box;display:flex;flex-direction:column;flex-shrink:0;">
        ${profileImgHTML}
        
        <h1 style="margin:0;font-family:Georgia,'Playfair Display',serif;font-size:34px;font-weight:700;color:#fff;line-height:1.1;">${basicInfo.name}</h1>
        <p style="margin:6px 0 14px;font-size:11.5px;font-weight:700;color:rgba(255,255,255,0.95);letter-spacing:1.5px;text-transform:uppercase;">${headline}</p>

        <p style="margin:0 0 20px;font-size:10.5px;color:rgba(255,255,255,0.9);line-height:1.55;text-align:justify;">${summary}</p>

        <!-- Contacts -->
        <div style="display:flex;flex-direction:column;gap:9px;font-size:10.5px;color:rgba(255,255,255,0.95);margin-bottom:22px;border-top:1px solid rgba(255,255,255,0.3);padding-top:14px;box-sizing:border-box;">
          <span style="display:inline-flex;align-items:center;gap:8px;">${getPhoneIcon("#fff")} ${basicInfo.phone}</span>
          <span style="display:inline-flex;align-items:center;gap:8px;">${getLocationIcon("#fff")} ${basicInfo.location}</span>
          <span style="display:inline-flex;align-items:center;gap:8px;">${getEmailIcon("#fff")} ${basicInfo.email}</span>
          ${websiteDisplay ? `<span style="display:inline-flex;align-items:center;gap:8px;">${getGlobeIcon("#fff")} ${websiteDisplay}</span>` : ""}
        </div>

        <!-- Skills -->
        <h3 style="margin:0 0 8px;color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;border-top:1px solid rgba(255,255,255,0.3);padding-top:14px;">KEY COMPETENCIES</h3>
        <ul style="margin:0;padding:0 0 0 16px;list-style-type:disc;font-size:10.5px;color:rgba(255,255,255,0.95);line-height:1.5;">
          ${skills.map(s => `<li style="margin-bottom:4px;">${cleanLineText(s)}</li>`).join("")}
        </ul>

        ${languages.length > 0 ? `
        <h3 style="margin:16px 0 6px;color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;border-top:1px solid rgba(255,255,255,0.3);padding-top:12px;">LANGUAGES</h3>
        <div style="font-size:10.5px;color:rgba(255,255,255,0.95);">${languages.map(l => l.language).join(", ")}</div>
        ` : ""}
      </div>
    `;

    const page1HTML = `
      <div class="resume-page" style="width:794px;height:1122px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#fff;color:#333;box-sizing:border-box;overflow:hidden;display:flex;margin:0;padding:0;flex-shrink:0;">
        <!-- Left Main Content Column -->
        <div style="flex:1;padding:40px 36px 24px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;position:relative;">
          <!-- Subtle watermark icon -->
          <div style="position:absolute;top:12px;right:14px;opacity:0.1;pointer-events:none;">
            <svg width="70" height="70" viewBox="0 0 60 60">
              <polygon points="30,5 55,18 55,42 30,55 5,42 5,18" fill="none" stroke="#2E8540" stroke-width="2" />
            </svg>
          </div>

          <div style="box-sizing:border-box;">
            <!-- Work Experience -->
            ${page1Experiences.length > 0 ? `
            <div style="margin-bottom:20px;">
              <h2 style="margin:0 0 10px;font-size:13.5px;font-weight:800;color:#2E8540;text-transform:uppercase;letter-spacing:0.8px;border-bottom:2px solid #2E8540;padding-bottom:3px;">WORK EXPERIENCE</h2>
              ${renderExperiencesHTML(page1Experiences)}
            </div>
            ` : ""}

            <!-- Education -->
            <div style="margin-bottom:20px;">
              <h2 style="margin:0 0 10px;font-size:13.5px;font-weight:800;color:#2E8540;text-transform:uppercase;letter-spacing:0.8px;border-bottom:2px solid #2E8540;padding-bottom:3px;">EDUCATION BACKGROUND</h2>
              ${educationHTML}
            </div>

            ${renderProjectsHTML(page1Projects, page1Certifications)}
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:#888;box-sizing:border-box;border-top:1px solid #eee;padding-top:8px;">
            <span>${basicInfo.name}</span>
            <span>Page 1 ${hasPage2 ? 'of 2' : ''}</span>
          </div>
        </div>

        ${rightColumn1}
      </div>
    `;

    const page2HTML = hasPage2 ? `
      <div class="resume-page" style="width:794px;height:1122px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#fff;color:#333;box-sizing:border-box;overflow:hidden;display:flex;margin:0;padding:0;flex-shrink:0;">
        <div style="flex:1;padding:40px 36px 24px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;">
          <div style="box-sizing:border-box;">
            <div style="border-bottom:2px solid #2E8540;padding-bottom:8px;margin-bottom:20px;">
              <span style="font-size:18px;font-weight:800;color:#2E8540;text-transform:uppercase;">${basicInfo.name}</span>
            </div>

            ${page2Experiences.length > 0 ? `
            <div style="margin-bottom:20px;">
              <h2 style="margin:0 0 10px;font-size:13.5px;font-weight:800;color:#2E8540;text-transform:uppercase;letter-spacing:0.8px;border-bottom:2px solid #2E8540;padding-bottom:3px;">WORK EXPERIENCE</h2>
              ${renderExperiencesHTML(page2Experiences)}
            </div>
            ` : ""}

            ${renderProjectsHTML(page2Projects, page2Certifications)}
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:#888;box-sizing:border-box;border-top:1px solid #eee;padding-top:8px;">
            <span>${basicInfo.name}</span>
            <span>Page 2 of 2</span>
          </div>
        </div>

        <div style="width:295px;background:#38A169;color:#fff;padding:36px 24px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;flex-shrink:0;">
          <div>
            <h3 style="margin:0 0 6px;color:#fff;font-size:13px;font-weight:700;text-transform:uppercase;">Resume Details</h3>
            <p style="font-size:11px;color:rgba(255,255,255,0.9);">${basicInfo.name} • ${headline}</p>
          </div>
          <div style="font-size:10px;color:rgba(255,255,255,0.75);">
            Page 2 of 2
          </div>
        </div>
      </div>
    ` : "";

    return `
      <div id="resume-render-target" style="width:794px;background:#fff;display:flex;flex-direction:column;gap:0px;margin:0;padding:0;box-sizing:border-box;">
        ${page1HTML}
        ${page2HTML}
      </div>
    `;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Template 11: Corporate Cyan (Matthew Collins style)
  // ───────────────────────────────────────────────────────────────────────────
  if (templateId === "template-11") {
    const profileImgHTML = safeProfilePic
      ? `<img src="${safeProfilePic}" alt="Profile" style="width:130px;height:130px;border-radius:50%;object-fit:cover;border:4px solid #fff;display:block;box-shadow:0 6px 14px rgba(0,0,0,0.15);" />`
      : `<div style="width:130px;height:130px;border-radius:50%;background:#0284C7;border:4px solid #fff;display:flex;align-items:center;justify-content:center;font-size:44px;font-weight:800;color:#fff;text-transform:uppercase;">${(basicInfo.name || "U")[0]}</div>`;

    const renderExperiencesHTML = (exps: WorkExp[]) => exps.map(exp => {
      const dateRange = `${exp.startMonth} ${exp.startYear} - ${exp.current ? "Present" : `${exp.endMonth} ${exp.endYear}`}`;
      const descLines = exp.description
        ? exp.description.split(/\n/).map(l => l.trim()).filter(l => l.length > 0)
            .map(l => `<li style="margin-bottom:2.5px;color:#444;font-size:10px;line-height:1.35;">${cleanLineText(l)}</li>`).join("")
        : "";
      return `
        <div style="margin-bottom:12px;box-sizing:border-box;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;">
            <span style="font-size:11px;font-weight:700;color:#0284C7;">${exp.company}</span>
            <span style="font-size:10.5px;font-weight:600;color:#0284C7;">${dateRange}</span>
          </div>
          <div style="font-size:11.5px;font-weight:800;color:#111;margin-bottom:3px;">${exp.title}</div>
          ${descLines ? `<ul style="margin:0 0 0 14px;padding:0;list-style-type:disc;">${descLines}</ul>` : ""}
        </div>
      `;
    }).join("");

    const educationHTML = education.map(edu => {
      const yearRange = `${formatMonthYear(edu.startMonth, edu.startYear)} – ${formatMonthYear(edu.endMonth, edu.endYear)}`;
      return `
        <div style="margin-bottom:10px;box-sizing:border-box;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;">
            <span style="font-size:11px;font-weight:700;color:#0284C7;">${edu.college}</span>
            <span style="font-size:10.5px;font-weight:600;color:#0284C7;">${yearRange}</span>
          </div>
          <div style="font-size:11px;font-weight:800;color:#111;">${edu.degree}${edu.field ? `, ${edu.field}` : ""}${edu.score ? ` · Score: ${edu.score}` : ""}</div>
        </div>
      `;
    }).join("");

    const skillsGridHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;box-sizing:border-box;">
        ${skills.map(s => `<div style="font-size:10.5px;color:#333;display:flex;align-items:center;gap:5px;">• ${cleanLineText(s)}</div>`).join("")}
      </div>
    `;

    const renderCertificationsHTML = (certs: Certification[]) => certs.length > 0
      ? `<div style="margin-top:14px;box-sizing:border-box;">
          <h2 style="margin:0 0 8px;font-size:12.5px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:0.5px;">Certifications</h2>
          ${certs.map(c => `
            <div style="margin-bottom:6px;box-sizing:border-box;">
              <div style="display:flex;justify-content:space-between;align-items:baseline;">
                <span style="font-size:11px;font-weight:800;color:#111;">${c.name}</span>
                ${c.issueDate ? `<span style="font-size:10.5px;font-weight:600;color:#0284C7;">${formatYearMonthString(c.issueDate)}</span>` : ""}
              </div>
              ${c.issuer ? `<div style="font-size:10px;color:#555;">${c.issuer}</div>` : ""}
            </div>
          `).join("")}
        </div>`
      : "";

    const renderAchievementsHTML = (projs: Project[]) => projs.length > 0
      ? `<div style="margin-top:14px;box-sizing:border-box;">
          <h2 style="margin:0 0 8px;font-size:12.5px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:0.5px;">Achievements</h2>
          ${projs.map(p => `
            <div style="margin-bottom:6px;font-size:10.5px;color:#333;">
              <span style="font-weight:800;color:#111;">• ${p.name}</span>
              ${p.description ? `<span style="color:#555;">: ${cleanLineText(p.description)}</span>` : ""}
            </div>
          `).join("")}
        </div>`
      : "";

    const languagesHTML = languages.length > 0
      ? `<div style="margin-top:14px;box-sizing:border-box;">
          <h2 style="margin:0 0 6px;font-size:12.5px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:0.5px;">Languages</h2>
          <div style="display:flex;flex-wrap:wrap;gap:10px;font-size:10.5px;color:#0284C7;font-weight:600;">
            ${languages.map(l => `<span>${l.language}${l.proficiency ? ` (${l.proficiency})` : ""}</span>`).join("")}
          </div>
        </div>`
      : "";

    const page1HTML = `
      <div class="resume-page" style="width:794px;height:1122px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#fff;color:#333;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;margin:0;padding:0;flex-shrink:0;">
        <div style="box-sizing:border-box;">
          <!-- Top Gradient Banner -->
          <div style="background:linear-gradient(135deg,#0284C7 0%,#0369A1 100%);padding:28px 36px 36px;display:flex;align-items:flex-start;justify-content:space-between;position:relative;box-sizing:border-box;">
            <!-- Top left arrow icon -->
            <div style="position:absolute;top:16px;left:20px;width:24px;height:24px;background:rgba(255,255,255,0.15);border-radius:4px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:800;">
              ↘
            </div>

            <div style="display:flex;align-items:center;gap:24px;flex:1;box-sizing:border-box;padding-left:14px;">
              <div style="flex-shrink:0;margin-bottom:-50px;position:relative;z-index:2;">
                ${profileImgHTML}
              </div>
              <div style="color:#fff;">
                <h1 style="margin:0;font-size:30px;font-weight:800;letter-spacing:0.5px;color:#fff;line-height:1.1;">${basicInfo.name}</h1>
                <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.9);font-weight:500;">${headline}</p>
                <div style="width:100%;border-bottom:1px solid rgba(255,255,255,0.3);margin-top:10px;"></div>
              </div>
            </div>

            <!-- Header Contacts (Right) -->
            <div style="display:flex;flex-direction:column;gap:5px;font-size:10px;color:rgba(255,255,255,0.95);flex-shrink:0;padding-left:16px;box-sizing:border-box;">
              <span style="display:inline-flex;align-items:center;gap:6px;">
                <span style="width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,0.2);display:inline-flex;align-items:center;justify-content:center;">${getPhoneIcon("#fff")}</span>
                ${basicInfo.phone}
              </span>
              <span style="display:inline-flex;align-items:center;gap:6px;">
                <span style="width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,0.2);display:inline-flex;align-items:center;justify-content:center;">${getEmailIcon("#fff")}</span>
                ${basicInfo.email}
              </span>
              ${websiteDisplay ? `
              <span style="display:inline-flex;align-items:center;gap:6px;">
                <span style="width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,0.2);display:inline-flex;align-items:center;justify-content:center;">${getGlobeIcon("#fff")}</span>
                ${websiteDisplay}
              </span>` : ""}
              <span style="display:inline-flex;align-items:center;gap:6px;">
                <span style="width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,0.2);display:inline-flex;align-items:center;justify-content:center;">${getLocationIcon("#fff")}</span>
                ${basicInfo.location}
              </span>
            </div>
          </div>

          <!-- Body Content Area: 2 Columns -->
          <div style="display:flex;gap:28px;padding:32px 36px 16px;box-sizing:border-box;">
            <!-- Left Column: Summary & Experience -->
            <div style="flex:1.15;box-sizing:border-box;">
              <!-- Summary -->
              <div style="margin-bottom:16px;">
                <h2 style="margin:0 0 8px;font-size:12.5px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:0.5px;">Professional Summary</h2>
                <p style="margin:0;font-size:10.5px;color:#444;line-height:1.5;text-align:justify;">${summary}</p>
              </div>

              <!-- Experience -->
              ${page1Experiences.length > 0 ? `
              <div>
                <h2 style="margin:0 0 10px;font-size:12.5px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:0.5px;">Experience</h2>
                ${renderExperiencesHTML(page1Experiences)}
              </div>
              ` : ""}
            </div>

            <!-- Right Column: Education, Skills, Certifications -->
            <div style="flex:1;box-sizing:border-box;">
              <!-- Education -->
              <div style="margin-bottom:16px;">
                <h2 style="margin:0 0 8px;font-size:12.5px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:0.5px;">Education</h2>
                ${educationHTML}
              </div>

              <!-- Skills -->
              <div style="margin-bottom:16px;">
                <h2 style="margin:0 0 8px;font-size:12.5px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:0.5px;">Skills</h2>
                ${skillsGridHTML}
              </div>

              ${renderCertificationsHTML(page1Certifications)}
              ${renderAchievementsHTML(page1Projects)}
              ${page1Languages.length > 0 ? languagesHTML : ""}
            </div>
          </div>
        </div>

        <div style="padding:10px 36px;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:#888;box-sizing:border-box;">
          <span>${basicInfo.name} - Resume</span>
          <span>Page 1 ${hasPage2 ? 'of 2' : ''}</span>
        </div>
      </div>
    `;

    const page2HTML = hasPage2 ? `
      <div class="resume-page" style="width:794px;height:1122px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#fff;color:#333;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;margin:0;padding:0;flex-shrink:0;">
        <div style="box-sizing:border-box;">
          <div style="background:linear-gradient(135deg,#0284C7 0%,#0369A1 100%);padding:18px 36px;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;">
            <span style="font-size:16px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:0.5px;">${basicInfo.name}</span>
            <span style="font-size:11px;color:rgba(255,255,255,0.8);font-weight:600;">Resume</span>
          </div>

          <div style="padding:24px 36px;box-sizing:border-box;">
            ${page2Experiences.length > 0 ? `
            <div style="margin-bottom:16px;">
              <h2 style="margin:0 0 10px;font-size:12.5px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:0.5px;">Experience</h2>
              ${renderExperiencesHTML(page2Experiences)}
            </div>
            ` : ""}

            ${renderCertificationsHTML(page2Certifications)}
            ${renderAchievementsHTML(page2Projects)}
          </div>
        </div>

        <div style="padding:10px 36px;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:#888;box-sizing:border-box;">
          <span>${basicInfo.name} - Resume</span>
          <span>Page 2 of 2</span>
        </div>
      </div>
    ` : "";

    return `
      <div id="resume-render-target" style="width:794px;background:#fff;display:flex;flex-direction:column;gap:0px;margin:0;padding:0;box-sizing:border-box;">
        ${page1HTML}
        ${page2HTML}
      </div>
    `;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Template 12: Minimalist Arch Pillar (Muskan Jain style)
  // ───────────────────────────────────────────────────────────────────────────
  if (templateId === "template-12") {
    const profileImgHTML = safeProfilePic
      ? `<img src="${safeProfilePic}" alt="Profile" style="width:130px;height:130px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,0.4);display:block;margin-bottom:18px;" />`
      : `<div style="width:130px;height:130px;border-radius:50%;background:rgba(255,255,255,0.15);border:3px solid rgba(255,255,255,0.4);display:flex;align-items:center;justify-content:center;font-size:44px;font-weight:800;color:#fff;text-transform:uppercase;margin-bottom:18px;">${(basicInfo.name || "U")[0]}</div>`;

    const renderExperiencesHTML = (exps: WorkExp[]) => exps.map(exp => {
      const year = exp.endYear || exp.startYear || "2023";
      const desc = exp.description ? `<p style="margin:4px 0 0;font-size:10.5px;color:#555;line-height:1.45;">${cleanLineText(exp.description)}</p>` : "";
      return `
        <div style="margin-bottom:14px;box-sizing:border-box;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;">
            <span style="font-size:12px;font-weight:800;color:#111;">${exp.company}</span>
            <span style="font-size:11.5px;font-weight:800;color:#253238;">${year}</span>
          </div>
          <div style="font-size:11px;font-weight:600;color:#444;margin-top:1px;">${exp.title}</div>
          ${desc}
        </div>
      `;
    }).join("");

    const educationHTML = education.map(edu => {
      const year = edu.endYear || edu.startYear || "2020";
      return `
        <div style="display:flex;gap:18px;margin-bottom:12px;box-sizing:border-box;">
          <div style="width:45px;font-size:12px;font-weight:800;color:#253238;flex-shrink:0;">${year}</div>
          <div style="flex:1;">
            <div style="font-size:12px;font-weight:800;color:#111;">${edu.college}</div>
            <div style="font-size:10.5px;color:#555;margin-top:2px;">${edu.degree}${edu.field ? ` in ${edu.field}` : ""}${edu.score ? ` · Score: ${edu.score}` : ""}</div>
          </div>
        </div>
      `;
    }).join("");

    const renderAchievementsHTML = (certs: Certification[], projs: Project[]) => {
      const items = [
        ...certs.map(c => ({ year: c.issueDate ? c.issueDate.split("-")[0] || "2024" : "2024", title: c.name, desc: c.issuer || "Certification" })),
        ...projs.map(p => ({ year: p.endYear || p.startYear || "Project", title: p.name, desc: p.description ? cleanLineText(p.description) : "" })),
      ];
      if (items.length === 0) return "";
      return `
        <div style="margin-top:16px;box-sizing:border-box;">
          <h2 style="margin:0 0 12px;font-size:14px;font-weight:800;color:#253238;">Achievement</h2>
          ${items.map(item => `
            <div style="display:flex;gap:18px;margin-bottom:10px;box-sizing:border-box;">
              <div style="width:45px;font-size:12px;font-weight:800;color:#253238;flex-shrink:0;">${item.year}</div>
              <div style="flex:1;">
                <div style="font-size:12px;font-weight:800;color:#111;">${item.title}</div>
                ${item.desc ? `<p style="margin:2px 0 0;font-size:10.5px;color:#555;line-height:1.4;">${item.desc}</p>` : ""}
              </div>
            </div>
          `).join("")}
        </div>
      `;
    };

    const leftPillarHTML = `
      <div style="width:260px;margin:24px 0 24px 24px;background:#253238;border-radius:130px;padding:32px 20px 36px;color:#fff;display:flex;flex-direction:column;align-items:center;text-align:center;box-sizing:border-box;flex-shrink:0;">
        ${profileImgHTML}

        <h1 style="margin:0 0 4px;font-size:24px;font-weight:800;color:#fff;line-height:1.1;">${basicInfo.name}</h1>
        <p style="margin:0 0 16px;font-size:10.5px;font-weight:700;color:rgba(255,255,255,0.85);letter-spacing:2px;text-transform:uppercase;">${headline}</p>

        <p style="margin:0 0 24px;font-size:10px;color:rgba(255,255,255,0.8);line-height:1.5;text-align:justify;">${summary}</p>

        <!-- Skill Section -->
        <h3 style="margin:0 0 12px;font-size:12px;font-weight:800;color:#fff;letter-spacing:1.5px;text-transform:uppercase;">SKILL</h3>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:11px;color:rgba(255,255,255,0.9);font-weight:500;">
          ${skills.map(s => `<div>${cleanLineText(s)}</div>`).join("")}
        </div>

        ${languages.length > 0 ? `
        <h3 style="margin:20px 0 8px;font-size:12px;font-weight:800;color:#fff;letter-spacing:1.5px;text-transform:uppercase;">LANGUAGES</h3>
        <div style="font-size:10px;color:rgba(255,255,255,0.9);">${languages.map(l => l.language).join(", ")}</div>
        ` : ""}
      </div>
    `;

    const page1HTML = `
      <div class="resume-page" style="width:794px;height:1122px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#F8F9FA;color:#333;box-sizing:border-box;overflow:hidden;display:flex;margin:0;padding:0;flex-shrink:0;">
        ${leftPillarHTML}

        <!-- Right Content Column -->
        <div style="flex:1;padding:36px 36px 24px 28px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;">
          <div style="box-sizing:border-box;">
            <!-- Contact Me -->
            <div style="margin-bottom:20px;">
              <h2 style="margin:0 0 12px;font-size:14px;font-weight:800;color:#253238;letter-spacing:1px;text-transform:uppercase;">CONTACT ME</h2>
              <div style="display:flex;flex-direction:column;gap:8px;font-size:11px;color:#333;">
                <span style="display:inline-flex;align-items:center;gap:10px;">
                  <span style="width:22px;height:22px;border-radius:50%;background:#253238;display:inline-flex;align-items:center;justify-content:center;">${getPhoneIcon("#fff")}</span>
                  ${basicInfo.phone}
                </span>
                <span style="display:inline-flex;align-items:center;gap:10px;">
                  <span style="width:22px;height:22px;border-radius:50%;background:#253238;display:inline-flex;align-items:center;justify-content:center;">${getEmailIcon("#fff")}</span>
                  ${basicInfo.email}
                </span>
                <span style="display:inline-flex;align-items:center;gap:10px;">
                  <span style="width:22px;height:22px;border-radius:50%;background:#253238;display:inline-flex;align-items:center;justify-content:center;">${getLocationIcon("#fff")}</span>
                  ${basicInfo.location}
                </span>
              </div>
            </div>

            <!-- Education -->
            <div style="margin-bottom:20px;">
              <h2 style="margin:0 0 12px;font-size:14px;font-weight:800;color:#253238;">Education</h2>
              ${educationHTML}
            </div>

            <!-- Work Experiences -->
            ${page1Experiences.length > 0 ? `
            <div style="margin-bottom:20px;">
              <h2 style="margin:0 0 12px;font-size:14px;font-weight:800;color:#253238;">Work Experiences</h2>
              ${renderExperiencesHTML(page1Experiences)}
            </div>
            ` : ""}

            ${renderAchievementsHTML(page1Certifications, page1Projects)}
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:#888;box-sizing:border-box;border-top:1px solid #eee;padding-top:6px;">
            <span>${basicInfo.name}</span>
            <span>Page 1 ${hasPage2 ? 'of 2' : ''}</span>
          </div>
        </div>
      </div>
    `;

    const page2HTML = hasPage2 ? `
      <div class="resume-page" style="width:794px;height:1122px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#F8F9FA;color:#333;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;margin:0;padding:36px;flex-shrink:0;">
        <div style="box-sizing:border-box;">
          <div style="border-bottom:2px solid #253238;padding-bottom:10px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:16px;font-weight:800;color:#253238;text-transform:uppercase;">${basicInfo.name}</span>
            <span style="font-size:11px;color:#666;font-weight:600;">Resume Page 2</span>
          </div>

          ${page2Experiences.length > 0 ? `
          <div style="margin-bottom:20px;">
            <h2 style="margin:0 0 12px;font-size:14px;font-weight:800;color:#253238;">Work Experiences (Continued)</h2>
            ${renderExperiencesHTML(page2Experiences)}
          </div>
          ` : ""}

          ${renderAchievementsHTML(page2Certifications, page2Projects)}
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:#888;box-sizing:border-box;border-top:1px solid #eee;padding-top:6px;">
          <span>${basicInfo.name}</span>
          <span>Page 2 of 2</span>
        </div>
      </div>
    ` : "";

    return `
      <div id="resume-render-target" style="width:794px;background:#fff;display:flex;flex-direction:column;gap:0px;margin:0;padding:0;box-sizing:border-box;">
        ${page1HTML}
        ${page2HTML}
      </div>
    `;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Template 13: Editorial Signature (Samira Hadid style)
  // ───────────────────────────────────────────────────────────────────────────
  if (templateId === "template-13") {
    const renderHeaderBadge = (text: string) => {
      const firstChar = text.charAt(0);
      const rest = text.slice(1).split("").join(" ");
      return `
        <h2 style="margin:0 0 12px;font-size:13px;font-weight:800;color:#111;letter-spacing:3px;text-transform:uppercase;display:flex;align-items:center;gap:4px;">
          <span style="background:#E5E7EB;color:#111;padding:2px 6px;border-radius:2px;font-size:11.5px;font-weight:900;">${firstChar}</span>
          <span>${rest}</span>
        </h2>
      `;
    };

    const renderExperiencesHTML = (exps: WorkExp[]) => exps.map(exp => {
      const dateRange = `${exp.startYear ? `${exp.startYear}` : exp.startMonth} - ${exp.current ? "Present" : (exp.endYear ? `${exp.endYear}` : exp.endMonth)}`;
      const descLines = exp.description
        ? exp.description.split(/\n/).map(l => l.trim()).filter(l => l.length > 0)
            .map(l => `<li style="margin-bottom:2.5px;color:#444;font-size:10.5px;line-height:1.4;">${cleanLineText(l)}</li>`).join("")
        : "";
      return `
        <div style="margin-bottom:14px;box-sizing:border-box;">
          <div style="font-size:11.5px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:0.5px;">${exp.title}</div>
          <div style="font-size:11px;color:#555;margin:1px 0 2px;">${exp.company}</div>
          <div style="font-size:10.5px;font-weight:700;color:#222;margin-bottom:4px;">${dateRange}</div>
          ${descLines ? `<ul style="margin:0 0 0 14px;padding:0;list-style-type:disc;">${descLines}</ul>` : ""}
        </div>
      `;
    }).join("");

    const educationHTML = education.map(edu => {
      const yearRange = `${edu.startYear || "2020"} - ${edu.endYear || "2024"}`;
      return `
        <div style="margin-bottom:12px;box-sizing:border-box;">
          <div style="font-size:10.5px;font-weight:700;color:#222;">${yearRange}</div>
          <div style="font-size:11.5px;font-weight:800;color:#111;text-transform:uppercase;">${edu.college}</div>
          <div style="font-size:10.5px;color:#555;">${edu.degree}${edu.field ? `, ${edu.field}` : ""}${edu.score ? ` · Score: ${edu.score}` : ""}</div>
        </div>
      `;
    }).join("");

    const skillsListHTML = skills.map(s => `<div style="font-size:10.5px;color:#333;margin-bottom:4px;">${cleanLineText(s)}</div>`).join("");

    const renderProjectsHTML = (projs: Project[], certs: Certification[]) => {
      const items = [
        ...projs.map(p => ({ title: p.name, desc: p.description ? cleanLineText(p.description) : "" })),
        ...certs.map(c => ({ title: c.name, desc: c.issuer || "" })),
      ];
      if (items.length === 0) return "";
      return `
        <div style="margin-top:14px;box-sizing:border-box;">
          ${renderHeaderBadge("PROJECTS")}
          ${items.slice(0, 2).map(item => `
            <div style="margin-bottom:8px;">
              <div style="font-size:11px;font-weight:800;color:#111;">${item.title}</div>
              ${item.desc ? `<p style="margin:2px 0 0;font-size:10px;color:#555;line-height:1.35;">${item.desc}</p>` : ""}
            </div>
          `).join("")}
        </div>
      `;
    };

    const page1HTML = `
      <div class="resume-page" style="width:794px;height:1122px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#fff;color:#222;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;margin:0;padding:40px 48px;flex-shrink:0;">
        <div style="box-sizing:border-box;">
          <!-- Editorial Top Header with Lines -->
          <div style="border-top:1.5px solid #222;border-bottom:1.5px solid #222;padding:20px 0 16px;text-align:center;position:relative;margin-bottom:28px;box-sizing:border-box;">
            <!-- Script watermark initials in center -->
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:Georgia,serif;font-style:italic;font-size:64px;color:rgba(0,0,0,0.04);pointer-events:none;z-index:0;letter-spacing:10px;">
              ${(basicInfo.name || "SH").split(" ").map(n => n[0]).join("")}
            </div>

            <div style="position:relative;z-index:1;">
              <h1 style="margin:0;font-size:32px;font-weight:800;color:#111;letter-spacing:4px;text-transform:uppercase;">${basicInfo.name}</h1>
              <p style="margin:8px 0 0;font-size:12px;font-weight:600;color:#555;letter-spacing:6px;text-transform:uppercase;">${headline}</p>
            </div>
          </div>

          <!-- 2-Column Clean Editorial Layout -->
          <div style="display:flex;gap:40px;box-sizing:border-box;">
            <!-- Left Column: Experience & Education -->
            <div style="flex:1.2;box-sizing:border-box;">
              <!-- Experience -->
              ${page1Experiences.length > 0 ? `
              <div style="margin-bottom:22px;">
                ${renderHeaderBadge("EXPERIENCE")}
                ${renderExperiencesHTML(page1Experiences)}
              </div>
              ` : ""}

              <!-- Education -->
              <div>
                ${renderHeaderBadge("EDUCATION")}
                ${educationHTML}
              </div>
            </div>

            <!-- Right Column: Contact, Summary, Skills -->
            <div style="flex:0.85;box-sizing:border-box;">
              <!-- Contact -->
              <div style="margin-bottom:22px;">
                ${renderHeaderBadge("CONTACT")}
                <div style="display:flex;flex-direction:column;gap:8px;font-size:10.5px;color:#333;">
                  <span style="display:inline-flex;align-items:center;gap:8px;">${getPhoneIcon("#333")} ${basicInfo.phone}</span>
                  <span style="display:inline-flex;align-items:center;gap:8px;">${getEmailIcon("#333")} ${basicInfo.email}</span>
                  <span style="display:inline-flex;align-items:center;gap:8px;">${getLocationIcon("#333")} ${basicInfo.location}</span>
                  ${websiteDisplay ? `<span style="display:inline-flex;align-items:center;gap:8px;">${getGlobeIcon("#333")} ${websiteDisplay}</span>` : ""}
                </div>
              </div>

              <!-- Summary -->
              <div style="margin-bottom:22px;">
                ${renderHeaderBadge("SUMMARY")}
                <p style="margin:0;font-size:10.5px;color:#444;line-height:1.55;text-align:justify;">${summary}</p>
              </div>

              <!-- Skills -->
              <div style="margin-bottom:16px;">
                ${renderHeaderBadge("SKILLS")}
                ${skillsListHTML}
              </div>

              ${renderProjectsHTML(page1Projects, page1Certifications)}
            </div>
          </div>
        </div>

        <div style="padding-top:10px;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:#888;box-sizing:border-box;">
          <span>${basicInfo.name} - Resume</span>
          <span>Page 1 ${hasPage2 ? 'of 2' : ''}</span>
        </div>
      </div>
    `;

    const page2HTML = hasPage2 ? `
      <div class="resume-page" style="width:794px;height:1122px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#fff;color:#222;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;margin:0;padding:40px 48px;flex-shrink:0;">
        <div style="box-sizing:border-box;">
          <div style="border-top:1.5px solid #222;border-bottom:1.5px solid #222;padding:12px 0;text-align:center;margin-bottom:24px;">
            <span style="font-size:16px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#111;">${basicInfo.name} — PAGE 2</span>
          </div>

          ${page2Experiences.length > 0 ? `
          <div style="margin-bottom:22px;">
            ${renderHeaderBadge("EXPERIENCE")}
            ${renderExperiencesHTML(page2Experiences)}
          </div>
          ` : ""}

          ${renderProjectsHTML(page2Projects, page2Certifications)}
        </div>

        <div style="padding-top:10px;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:#888;box-sizing:border-box;">
          <span>${basicInfo.name} - Resume</span>
          <span>Page 2 of 2</span>
        </div>
      </div>
    ` : "";

    return `
      <div id="resume-render-target" style="width:794px;background:#fff;display:flex;flex-direction:column;gap:0px;margin:0;padding:0;box-sizing:border-box;">
        ${page1HTML}
        ${page2HTML}
      </div>
    `;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Template 14: Geometric Emerald Diamond (Riya Desai style)
  // ───────────────────────────────────────────────────────────────────────────
  if (templateId === "template-14") {
    const profileImgHTML = safeProfilePic
      ? `<img src="${safeProfilePic}" alt="Profile" style="width:125px;height:125px;border-radius:50%;object-fit:cover;border:4px solid #1E5631;display:block;" />`
      : `<div style="width:125px;height:125px;border-radius:50%;background:#1E5631;display:flex;align-items:center;justify-content:center;font-size:44px;font-weight:800;color:#fff;text-transform:uppercase;">${(basicInfo.name || "U")[0]}</div>`;

    const renderExperiencesHTML = (exps: WorkExp[]) => exps.map(exp => {
      const dateRange = `${exp.startMonth} ${exp.startYear} - ${exp.current ? "Present" : `${exp.endMonth} ${exp.endYear}`}`;
      const descLines = exp.description
        ? exp.description.split(/\n/).map(l => l.trim()).filter(l => l.length > 0)
            .map(l => `<li style="margin-bottom:2.5px;color:#444;font-size:10px;line-height:1.4;">${cleanLineText(l)}</li>`).join("")
        : "";
      return `
        <div style="margin-bottom:12px;box-sizing:border-box;">
          <div style="font-size:11.5px;font-weight:800;color:#111;">${exp.title} - <span style="font-weight:600;color:#555;">${exp.company}</span></div>
          <div style="font-size:10px;font-weight:600;color:#4C9A2A;margin-bottom:3px;">${dateRange}</div>
          ${descLines ? `<ul style="margin:0 0 0 14px;padding:0;list-style-type:disc;">${descLines}</ul>` : ""}
        </div>
      `;
    }).join("");

    const educationHTML = education.map(edu => {
      const year = edu.endYear || edu.startYear || "2024";
      return `
        <div style="margin-bottom:8px;font-size:10.5px;color:#333;box-sizing:border-box;">
          <div style="font-weight:800;color:#111;">• ${edu.degree}${edu.field ? ` in ${edu.field}` : ""}</div>
          <div style="color:#555;margin-left:10px;">${edu.college}</div>
          <div style="color:#4C9A2A;margin-left:10px;font-weight:600;">Graduated: ${year}</div>
        </div>
      `;
    }).join("");

    const skillsListHTML = skills.map(s => `<li style="margin-bottom:3px;font-size:10.5px;color:#333;">${cleanLineText(s)}</li>`).join("");

    const renderHobbiesHTML = (projs: Project[], certs: Certification[]) => {
      const items = [
        ...projs.map(p => p.name),
        ...certs.map(c => c.name),
      ];
      if (items.length === 0) return "";
      return `
        <div style="margin-bottom:16px;box-sizing:border-box;">
          <h2 style="margin:0 0 6px;font-size:12.5px;font-weight:800;color:#1E5631;text-transform:uppercase;letter-spacing:0.5px;">PROJECTS & HONORS</h2>
          <ul style="margin:0;padding:0 0 0 14px;list-style-type:disc;font-size:10px;color:#333;">
            ${items.slice(0, 3).map(it => `<li style="margin-bottom:2px;">${it}</li>`).join("")}
          </ul>
        </div>
      `;
    };

    const page1HTML = `
      <div class="resume-page" style="width:794px;height:1122px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#fff;color:#333;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;margin:0;padding:0;flex-shrink:0;position:relative;">
        <div style="box-sizing:border-box;">
          <!-- Top Right Geometric Diamonds Graphic -->
          <div style="position:absolute;top:0;right:0;width:180px;height:180px;pointer-events:none;overflow:hidden;z-index:0;">
            <svg width="180" height="180" viewBox="0 0 180 180">
              <rect x="70" y="-30" width="80" height="80" transform="rotate(45 110 10)" fill="none" stroke="#1E5631" stroke-width="12" />
              <rect x="110" y="30" width="50" height="50" transform="rotate(45 135 55)" fill="#4C9A2A" opacity="0.8" />
              <rect x="40" y="50" width="40" height="40" transform="rotate(45 60 70)" fill="#74B72E" opacity="0.5" />
            </svg>
          </div>

          <!-- Bottom Left Geometric Diamonds Graphic -->
          <div style="position:absolute;bottom:20px;left:0;width:140px;height:140px;pointer-events:none;overflow:hidden;z-index:0;">
            <svg width="140" height="140" viewBox="0 0 140 140">
              <rect x="20" y="40" width="60" height="60" transform="rotate(45 50 70)" fill="none" stroke="#1E5631" stroke-width="8" />
              <rect x="-10" y="80" width="40" height="40" transform="rotate(45 10 100)" fill="#4C9A2A" opacity="0.7" />
            </svg>
          </div>

          <!-- Header Section -->
          <div style="padding:32px 36px 16px;display:flex;align-items:center;gap:24px;position:relative;z-index:1;box-sizing:border-box;">
            <div style="flex-shrink:0;">
              ${profileImgHTML}
            </div>
            <div style="flex:1;">
              <h1 style="margin:0;font-size:32px;font-weight:900;color:#1E5631;letter-spacing:1px;text-transform:uppercase;line-height:1.05;">${basicInfo.name}</h1>
              <p style="margin:6px 0 0;font-size:13px;font-weight:800;color:#222;letter-spacing:1.5px;text-transform:uppercase;">${headline}</p>
            </div>
          </div>

          <!-- 2-Column Body -->
          <div style="display:flex;gap:28px;padding:12px 36px;position:relative;z-index:1;box-sizing:border-box;">
            <!-- Left Column: Skills & Education -->
            <div style="width:230px;flex-shrink:0;box-sizing:border-box;">
              <!-- Skills -->
              <div style="margin-bottom:20px;">
                <h2 style="margin:0 0 8px;font-size:13px;font-weight:800;color:#1E5631;text-transform:uppercase;letter-spacing:0.5px;">SKILLS</h2>
                <ul style="margin:0;padding:0 0 0 14px;list-style-type:disc;">
                  ${skillsListHTML}
                </ul>
              </div>

              <!-- Education -->
              <div style="margin-bottom:20px;">
                <h2 style="margin:0 0 8px;font-size:13px;font-weight:800;color:#1E5631;text-transform:uppercase;letter-spacing:0.5px;">EDUCATION</h2>
                ${educationHTML}
              </div>

              ${languages.length > 0 ? `
              <div>
                <h2 style="margin:0 0 6px;font-size:13px;font-weight:800;color:#1E5631;text-transform:uppercase;letter-spacing:0.5px;">LANGUAGES</h2>
                <div style="font-size:10px;color:#333;">${languages.map(l => l.language).join(", ")}</div>
              </div>
              ` : ""}
            </div>

            <!-- Right Column: About, Experience, Projects, Contact -->
            <div style="flex:1;box-sizing:border-box;">
              <!-- About Me -->
              <div style="margin-bottom:16px;">
                <h2 style="margin:0 0 6px;font-size:13px;font-weight:800;color:#1E5631;text-transform:uppercase;letter-spacing:0.5px;">ABOUT ME</h2>
                <p style="margin:0;font-size:10.5px;color:#444;line-height:1.5;text-align:justify;">${summary}</p>
              </div>

              <!-- Work Experience -->
              ${page1Experiences.length > 0 ? `
              <div style="margin-bottom:16px;">
                <h2 style="margin:0 0 8px;font-size:13px;font-weight:800;color:#1E5631;text-transform:uppercase;letter-spacing:0.5px;">WORK EXPERIENCE</h2>
                ${renderExperiencesHTML(page1Experiences)}
              </div>
              ` : ""}

              ${renderHobbiesHTML(page1Projects, page1Certifications)}

              <!-- Contact Me (2 Column Grid) -->
              <div style="border-top:1px solid #eee;padding-top:12px;box-sizing:border-box;">
                <h2 style="margin:0 0 8px;font-size:13px;font-weight:800;color:#1E5631;text-transform:uppercase;letter-spacing:0.5px;">CONTACT ME</h2>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;font-size:10px;color:#333;">
                  <div>• ${basicInfo.phone}</div>
                  <div>• ${basicInfo.email}</div>
                  <div>• ${basicInfo.location}</div>
                  ${websiteDisplay ? `<div>• ${websiteDisplay}</div>` : ""}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style="padding:10px 36px;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:#888;box-sizing:border-box;">
          <span>${basicInfo.name} - Resume</span>
          <span>Page 1 ${hasPage2 ? 'of 2' : ''}</span>
        </div>
      </div>
    `;

    const page2HTML = hasPage2 ? `
      <div class="resume-page" style="width:794px;height:1122px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#fff;color:#333;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;margin:0;padding:0;flex-shrink:0;">
        <div style="box-sizing:border-box;">
          <div style="background:#1E5631;padding:18px 36px;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;">
            <span style="font-size:16px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:0.5px;">${basicInfo.name}</span>
            <span style="font-size:11px;color:rgba(255,255,255,0.8);font-weight:600;">Resume</span>
          </div>

          <div style="padding:24px 36px;box-sizing:border-box;">
            ${page2Experiences.length > 0 ? `
            <div style="margin-bottom:16px;">
              <h2 style="margin:0 0 8px;font-size:13px;font-weight:800;color:#1E5631;text-transform:uppercase;letter-spacing:0.5px;">WORK EXPERIENCE</h2>
              ${renderExperiencesHTML(page2Experiences)}
            </div>
            ` : ""}

            ${renderHobbiesHTML(page2Projects, page2Certifications)}
          </div>
        </div>

        <div style="padding:10px 36px;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:#888;box-sizing:border-box;">
          <span>${basicInfo.name} - Resume</span>
          <span>Page 2 of 2</span>
        </div>
      </div>
    ` : "";

    return `
      <div id="resume-render-target" style="width:794px;background:#fff;display:flex;flex-direction:column;gap:0px;margin:0;padding:0;box-sizing:border-box;">
        ${page1HTML}
        ${page2HTML}
      </div>
    `;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Template 3: Seema Chaudhry (Bright Blue Banner) - Default
  // ───────────────────────────────────────────────────────────────────────────
  const profileImgHTML = safeProfilePic
    ? `<img src="${safeProfilePic}" alt="Profile" style="width:105px;height:105px;border-radius:6px;object-fit:cover;border:2px solid rgba(255,255,255,0.4);" />`
    : `<div style="width:105px;height:105px;border-radius:6px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.4);font-size:36px;font-weight:700;color:white;text-transform:uppercase;">${(basicInfo.name || "U")[0]}</div>`;

  const renderExperiencesHTML = (exps: WorkExp[]) => exps.map(exp => {
    const dateRange = `${exp.startMonth} ${exp.startYear} – ${exp.current ? "Present" : `${exp.endMonth} ${exp.endYear}`}`;
    const descLines = exp.description
      ? exp.description
          .split(/\n/)
          .map(l => l.trim())
          .filter(l => l.length > 0)
          .map(l => `<li style="margin-bottom:3px;color:#444;font-size:11px;line-height:1.4;">${cleanLineText(l)}</li>`)
          .join("")
      : "";
    return `
      <div style="margin-bottom:12px;">
        <div style="display:flex;justify-content:between;align-items:baseline;margin-bottom:3px;">
          <span style="font-weight:700;color:#111;font-size:12px;">${exp.company}</span>
          <span style="margin:0 6px;color:#666;font-size:11px;">|</span>
          <span style="font-weight:600;color:#333;font-size:11px;flex:1;">${exp.title}</span>
          <span style="color:#555;font-size:11px;font-weight:500;white-space:nowrap;">${dateRange}</span>
        </div>
        ${descLines ? `<ul style="margin:0 0 0 16px;padding:0;list-style-type:disc;">${descLines}</ul>` : ""}
      </div>`;
  }).join("");

  const educationHTML = education.map(edu => {
    const yearRange = `${formatMonthYear(edu.startMonth, edu.startYear)} – ${formatMonthYear(edu.endMonth, edu.endYear)}`;
    const details: string[] = [];
    if (edu.field) details.push(edu.field);
    if (edu.score) details.push(`Score: ${edu.score}`);
    return `
      <div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:between;align-items:baseline;margin-bottom:2px;">
          <span style="font-weight:700;color:#111;font-size:12px;flex:1;">${edu.college}</span>
          <span style="color:#555;font-size:11px;font-weight:500;white-space:nowrap;">${yearRange}</span>
        </div>
        <p style="margin:0;color:#444;font-size:11px;">${edu.degree}${details.length ? ` · ${details.join(" · ")}` : ""}</p>
      </div>`;
  }).join("");

  const skillsHTML = skills.map(s => {
    const cleanSkill = cleanLineText(s);
    return `<li style="margin-bottom:3px;color:#444;font-size:11px;line-height:1.3;">${cleanSkill}</li>`;
  }).join("");

  const renderLanguagesHTML = (langs: Language[]) => langs.length > 0
    ? `<div style="margin-top:14px;padding-top:10px;border-top:1.5px solid #1a4d8f;">
        <h2 style="margin:0 0 6px;color:#1a4d8f;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Languages</h2>
        <div style="display:flex;flex-wrap:wrap;gap:12px;">
          ${langs.map(l => `<span style="font-size:11px;color:#444;">• ${l.language}${l.proficiency ? ` (${l.proficiency})` : ""}</span>`).join("")}
        </div>
      </div>`
    : "";

  const renderProjectsHTML = (projs: Project[]) => projs.length > 0
    ? `<div style="margin-top:14px;padding-top:10px;border-top:1.5px solid #1a4d8f;">
        <h2 style="margin:0 0 8px;color:#1a4d8f;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Projects</h2>
        ${projs.map(p => `
          <div style="margin-bottom:8px;">
            <div style="display:flex;justify-content:between;align-items:baseline;margin-bottom:2px;">
              <span style="font-weight:700;color:#111;font-size:12px;flex:1;">${p.name}</span>
              ${p.startYear ? `<span style="color:#555;font-size:11px;font-weight:500;white-space:nowrap;">${formatMonthYear(p.startMonth, p.startYear)} – ${p.endYear ? formatMonthYear(p.endMonth, p.endYear) : "Present"}</span>` : ""}
            </div>
            ${p.description ? `<p style="margin:0;color:#444;font-size:11px;line-height:1.4;">${p.description}</p>` : ""}
          </div>
        `).join("")}
      </div>`
    : "";

  const renderCertificationsHTML = (certs: Certification[]) => certs.length > 0
    ? `<div style="margin-top:14px;padding-top:10px;border-top:1.5px solid #1a4d8f;">
        <h2 style="margin:0 0 8px;color:#1a4d8f;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Certifications</h2>
        ${certs.map(c => `
          <div style="margin-bottom:6px;display:flex;justify-content:between;align-items:baseline;">
            <span style="font-weight:700;color:#111;font-size:11.5px;flex:1;">${c.name}${c.issuer ? ` – ${c.issuer}` : ""}</span>
            ${c.issueDate ? `<span style="color:#666;font-size:10px;font-weight:500;white-space:nowrap;">Issued: ${formatYearMonthString(c.issueDate)}</span>` : ""}
          </div>
        `).join("")}
      </div>`
    : "";

  const page1HTML = `
    <div class="resume-page" style="width:794px;height:1122px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#fff;color:#333;position:relative;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;margin:0;padding:0;flex-shrink:0;">
      <div style="box-sizing:border-box;">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#1a4d8f 0%,#0d3567 100%);padding:28px 36px 24px;display:flex;align-items:center;justify-content:space-between;position:relative;box-sizing:border-box;">
          <!-- Decorative pattern -->
          <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:repeating-linear-gradient(45deg,transparent,transparent 8px,rgba(255,255,255,0.03) 8px,rgba(255,255,255,0.03) 16px);pointer-events:none;"></div>
          <div style="position:relative;z-index:1;flex:1;padding-right:20px;box-sizing:border-box;">
            <h1 style="margin:0;font-size:26px;font-weight:800;color:#fff;letter-spacing:0.8px;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${basicInfo.name}</h1>
            <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.9);font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${headline}</p>
            <div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:8px 20px;">
              <span style="display:inline-flex;align-items:center;gap:5px;color:rgba(255,255,255,0.95);font-size:11px;line-height:1.4;padding-bottom:2px;">${getPhoneIcon()} ${basicInfo.phone}</span>
              ${websiteDisplay ? `<span style="display:inline-flex;align-items:center;gap:5px;color:rgba(255,255,255,0.95);font-size:11px;line-height:1.4;padding-bottom:2px;">${getGlobeIcon()} ${websiteDisplay}</span>` : ""}
              <span style="display:inline-flex;align-items:center;gap:5px;color:rgba(255,255,255,0.95);font-size:11px;line-height:1.4;padding-bottom:2px;">${getLocationIcon()} ${basicInfo.location}</span>
              <span style="display:inline-flex;align-items:center;gap:5px;color:rgba(255,255,255,0.95);font-size:11px;line-height:1.4;padding-bottom:2px;">${getEmailIcon()} ${basicInfo.email}</span>
            </div>
          </div>
          <div style="position:relative;z-index:1;flex-shrink:0;">
            ${profileImgHTML}
          </div>
        </div>

        <!-- Body -->
        <div style="padding:20px 36px;box-sizing:border-box;">
          <!-- About Me -->
          <div style="margin-bottom:14px;padding-bottom:10px;border-bottom:1.5px solid #1a4d8f;">
            <h2 style="margin:0 0 6px;color:#1a4d8f;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">About Me</h2>
            <p style="margin:0;color:#333;font-size:11px;line-height:1.6;text-align:justify;">${summary}</p>
          </div>

          <!-- Work Experience -->
          ${page1Experiences.length > 0 ? `
          <div style="margin-bottom:14px;padding-bottom:10px;border-bottom:1.5px solid #1a4d8f;">
            <h2 style="margin:0 0 8px;color:#1a4d8f;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Work Experience</h2>
            ${renderExperiencesHTML(page1Experiences)}
          </div>
          ` : ""}

          <!-- Education & Skills side by side -->
          <div style="display:flex;gap:36px;box-sizing:border-box;">
            <div style="flex:1;box-sizing:border-box;">
              <h2 style="margin:0 0 8px;color:#1a4d8f;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Education</h2>
              ${educationHTML}
            </div>
            <div style="flex:0 0 220px;box-sizing:border-box;">
              <h2 style="margin:0 0 8px;color:#1a4d8f;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Skills</h2>
              <ul style="margin:0;padding:0 0 0 16px;list-style-type:disc;">${skillsHTML}</ul>
            </div>
          </div>

          ${page1Languages.length > 0 ? renderLanguagesHTML(page1Languages) : ""}
          ${page1Projects.length > 0 ? renderProjectsHTML(page1Projects) : ""}
          ${page1Certifications.length > 0 ? renderCertificationsHTML(page1Certifications) : ""}
        </div>
      </div>
      <div style="padding:10px 36px;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#888;box-sizing:border-box;">
        <span>${basicInfo.name} - Resume</span>
        <span>Page 1 ${hasPage2 ? 'of 2' : ''}</span>
      </div>
    </div>
  `;

  const page2HTML = hasPage2 ? `
    <div class="resume-page" style="width:794px;height:1122px;font-family:'Segoe UI',Arial,Helvetica,sans-serif;background:#fff;color:#333;position:relative;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;margin:0;padding:0;flex-shrink:0;">
      <div style="box-sizing:border-box;">
        <!-- Page 2 Header Banner -->
        <div style="background:linear-gradient(135deg,#1a4d8f 0%,#0d3567 100%);padding:18px 36px;display:flex;align-items:center;justify-content:space-between;position:relative;box-sizing:border-box;margin-bottom:20px;">
          <!-- Decorative pattern -->
          <div style="position:absolute;top:0;left:0;width:100%;height:100%;background:repeating-linear-gradient(45deg,transparent,transparent 8px,rgba(255,255,255,0.03) 8px,rgba(255,255,255,0.03) 16px);pointer-events:none;"></div>
          <span style="position:relative;z-index:1;font-size:15px;font-weight:700;color:#fff;letter-spacing:0.8px;text-transform:uppercase;">${basicInfo.name}</span>
          <span style="position:relative;z-index:1;font-size:11px;color:rgba(255,255,255,0.8);font-weight:600;">Resume</span>
        </div>

        <!-- Body -->
        <div style="padding:20px 36px;box-sizing:border-box;">
          ${page2Experiences.length > 0 ? `
          <div style="margin-bottom:14px;padding-bottom:10px;border-bottom:1.5px solid #1a4d8f;">
            <h2 style="margin:0 0 8px;color:#1a4d8f;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Work Experience</h2>
            ${renderExperiencesHTML(page2Experiences)}
          </div>
          ` : ""}

          ${page2Languages.length > 0 ? renderLanguagesHTML(page2Languages) : ""}
          ${page2Projects.length > 0 ? renderProjectsHTML(page2Projects) : ""}
          ${page2Certifications.length > 0 ? renderCertificationsHTML(page2Certifications) : ""}
        </div>
      </div>
      <div style="padding:10px 36px;border-top:1px solid #eee;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#888;box-sizing:border-box;">
        <span>${basicInfo.name} - Resume</span>
        <span>Page 2 of 2</span>
      </div>
    </div>
  ` : "";

  return `
    <div id="resume-render-target" style="width:794px;background:#fff;display:flex;flex-direction:column;gap:0px;margin:0;padding:0;box-sizing:border-box;">
      ${page1HTML}
      ${page2HTML}
    </div>
  `;
}

// ── Component ───────────────────────────────────────────────────────────────────
export default function ResumeBuilder(props: ResumeBuilderProps) {
  const [generating, setGenerating] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [resolvedProfilePic, setResolvedProfilePic] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("template-3");
  const renderContainerRef = useRef<HTMLDivElement | null>(null);

  const validation = useMemo(() => validateProfile(props), [props]);

  // Preload/convert avatar to base64 on mount or when profilePic changes
  useEffect(() => {
    let active = true;
    async function loadAvatar() {
      if (props.profilePic) {
        const base64 = await imageUrlToDataUrl(props.profilePic);
        if (active) setResolvedProfilePic(base64);
      } else {
        if (active) setResolvedProfilePic(null);
      }
    }
    void loadAvatar();
    return () => { active = false; };
  }, [props.profilePic]);

  const handleBuildResume = useCallback(async () => {
    if (!validation.isComplete) {
      setShowValidation(true);
      return;
    }

    setGenerating(true);
    setShowValidation(false);

    let container: HTMLDivElement | null = null;
    try {
      container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.zIndex = "-1";
      container.innerHTML = buildResumeHTML(props, resolvedProfilePic, selectedTemplate);
      document.body.appendChild(container);

      const target = container.querySelector("#resume-render-target") as HTMLElement;
      if (!target) throw new Error("Resume render target not found");

      await new Promise(r => setTimeout(r, 300));

      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: false,
        allowTaint: false,
        backgroundColor: "#ffffff",
        width: 794,
        windowWidth: 794,
        logging: false,
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      if (imgHeight <= pageHeight + 5) {
        pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, Math.min(imgHeight, pageHeight));
      } else {
        const totalPages = Math.ceil(imgHeight / pageHeight);
        for (let i = 0; i < totalPages; i++) {
          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, "JPEG", 0, -(i * pageHeight), imgWidth, imgHeight);
        }
      }

      const firstName = props.basicInfo.name.split(" ")[0] || "Resume";
      pdf.save(`${firstName}_Resume.pdf`);
    } catch (err) {
      console.error("Resume generation failed:", err);
      alert(`Resume generation failed: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`);
    } finally {
      if (container && container.parentNode) {
        try { container.parentNode.removeChild(container); } catch { /* ignore */ }
      }
      setGenerating(false);
    }
  }, [props, validation, resolvedProfilePic, selectedTemplate]);

  const handlePreviewClick = () => {
    if (!validation.isComplete) {
      setShowValidation(true);
      return;
    }
    setShowValidation(false);

    window.open(`/jobseeker/dashboard/profile/resume?template=${selectedTemplate}`, "_blank");
  };

  const templatesList = [
    { id: "template-1", name: "Charcoal Classic", desc: "Gray banner headers & bold alignments" },
    { id: "template-2", name: "Timeline Navy", desc: "Sidebar details & vertical timeline nodes" },
    { id: "template-3", name: "Modern Blue", desc: "Classic banner header with blue accents" },
    { id: "template-4", name: "Elegant Crimson", desc: "Off-white sidebar with crimson red accents" },
    { id: "template-5", name: "Rounded Pastel", desc: "Rounded top header panel & two columns" },
    { id: "template-6", name: "Maroon Creative", desc: "Burgundy header with side rails & slider skills" },
    { id: "template-7", name: "Executive Hexagon", desc: "Geometric hex photo with skill ring gauges" },
    { id: "template-8", name: "Black & Gold Minimalist", desc: "High-contrast dark header & progress meters" },
    { id: "template-9", name: "Creative Pastel Bento", desc: "Playful lilac bento grid & pill badges" },
    { id: "template-10", name: "Emerald Botanical", desc: "Fresh green split layout & elegant serif header" },
    { id: "template-11", name: "Corporate Cyan", desc: "Cyan gradient header, icon badges & balanced 2-col" },
    { id: "template-12", name: "Minimalist Arch", desc: "Charcoal arch sidebar & clean timeline details" },
    { id: "template-13", name: "Editorial Signature", desc: "Monochrome editorial banner & boxed initial badges" },
    { id: "template-14", name: "Geometric Emerald", desc: "Forest green diamond frames & split modern grid" },
  ];

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layout className="h-5 w-5 text-[#FF2B2B]" />
          <h4 className="text-base font-semibold text-[#3A1F1F]">Choose Resume Template</h4>
        </div>
        {validation.isComplete && (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full font-medium">
            <CheckCircle className="h-3.5 w-3.5" /> Ready to build
          </span>
        )}
      </div>

      {/* Grid selector of 5 templates */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {templatesList.map((t) => {
          const isSelected = selectedTemplate === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSelectedTemplate(t.id)}
              className={`text-left rounded-xl p-4 border transition-all duration-200 cursor-pointer relative group flex flex-col justify-between min-h-[110px] ${
                isSelected
                  ? "border-[#FF2B2B] bg-[#FFF2F2] shadow-sm ring-1 ring-[#FF2B2B]"
                  : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50"
              }`}
            >
              <div>
                <p className={`font-semibold text-sm ${isSelected ? "text-[#FF2B2B]" : "text-[#3A1F1F]"}`}>
                  {t.name}
                </p>
                <p className="text-xs text-gray-500 mt-1 leading-normal">
                  {t.desc}
                </p>
              </div>
              
              {isSelected && (
                <span className="absolute top-2 right-2 bg-[#FF2B2B] text-white p-0.5 rounded-full">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-sm text-[#8A8A8A] mb-4">
        Select a design template above to preview or export your profile information.
      </p>

      {/* Validation messages */}
      {showValidation && !validation.isComplete && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700 mb-2">
                Please complete the following fields before previewing or building your resume:
              </p>
              <ul className="space-y-1">
                {validation.missingFields.map((field) => (
                  <li key={field} className="text-sm text-red-600 flex items-center gap-1.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    {field}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {/* Preview Resume Button */}
        <Button
          onClick={handlePreviewClick}
          variant="outline"
          className="rounded-full px-5 py-2 text-sm font-medium border-gray-200 text-[#3A1F1F] hover:bg-[#F6F6F6] transition-colors cursor-pointer"
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview Resume
        </Button>

        {/* Build Resume Button */}
        <Button
          onClick={handleBuildResume}
          disabled={generating}
          className={`rounded-full px-6 py-2.5 font-medium transition-all duration-200 cursor-pointer ${
            validation.isComplete
              ? "bg-[#FF2B2B] hover:bg-[#e02525] text-white shadow-md hover:shadow-lg"
              : "bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300"
          }`}
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Resume...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Build Resume
            </>
          )}
        </Button>
      </div>

      {!validation.isComplete && !showValidation && (
        <p className="text-xs text-[#8A8A8A] mt-2">
          Complete all required profile fields to enable resume preview and generation.
        </p>
      )}

      {/* Hidden render container */}
      <div ref={renderContainerRef} style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -1 }} />
    </div>
  );
}
