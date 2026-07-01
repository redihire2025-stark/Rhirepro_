import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { FileText, Loader2, AlertCircle, CheckCircle, Download, Eye, Layout, Check } from "lucide-react";
import { Button } from "./ui/button";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

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
  startYear: string;
  endYear: string;
  score: string;
}

export interface Project {
  id: number;
  name: string;
  url: string;
  startYear: string;
  endYear: string;
  description: string;
}

export interface Certification {
  id: number;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
  noExpiry: boolean;
  credentialId: string;
}

export interface Language {
  id: number;
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
  if (props.experiences.length < 1) missing.push("At least 1 Work Experience");
  if (props.education.length < 1) missing.push("At least 1 Education entry");
  return { isComplete: missing.length === 0, missingFields: missing };
}

// ── Resume HTML Template ────────────────────────────────────────────────────────
export function buildResumeHTML(
  props: ResumeBuilderProps,
  resolvedProfilePic: string | null,
  templateId: string = "template-3"
): string {
  const { basicInfo, summary: rawSummary, skills: rawSkills, experiences, education, projects, certifications, languages } = props;

  const headline = basicInfo.headline || (experiences.length > 0 ? experiences[0].title : "Professional");

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
  const headerEstimate = (templateId === "template-2" || templateId === "template-4" || templateId === "template-5") ? 180 : 160;
  currentHeight += headerEstimate;

  // Summary Estimate
  const summaryLines = Math.max(3, Math.ceil(summary.length / 80));
  const summaryHeight = summaryLines * 16 + 40;
  currentHeight += summaryHeight;

  // Education/Skills Estimate
  let eduSkillsHeight = 0;
  if (templateId === "template-2" || templateId === "template-4") {
    eduSkillsHeight = 0; // rendered in sidebar, not counting to main content height
  } else if (templateId === "template-5") {
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
    if (templateId === "template-2" || templateId === "template-4" || templateId === "template-5") {
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
          ${p.startYear ? `<span style="color:#555;font-size:11px;font-weight:600;">${p.startYear} – ${p.endYear || "Present"}</span>` : ""}
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
      const yearRange = `${edu.startYear} – ${edu.endYear}`;
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
      const yearRange = `${edu.startYear} – ${edu.endYear}`;
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
                  ${p.startYear ? `<span style="color:#666;font-weight:500;font-size:10.5px;">${p.startYear} – ${p.endYear || "Present"}</span>` : ""}
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
                ${c.issueDate ? `<p style="margin:2px 0 0;color:#666;font-size:10px;">Issued: ${c.issueDate}</p>` : ""}
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
      const yearRange = `${edu.startYear} – ${edu.endYear}`;
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
                ${p.startYear ? `<span style="color:#666;font-size:10.5px;">${p.startYear}–${p.endYear || "Present"}</span>` : ""}
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
              ${c.issueDate ? `<span style="color:#666;font-size:10px;">${c.issueDate}</span>` : ""}
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
              <h2 style="margin:0 0 6px;color:#b91c1c;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">About Me</h2>
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
      const yearRange = `${edu.startYear} – ${edu.endYear}`;
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
                ${p.startYear ? `<span style="color:#666;font-size:10.5px;">${p.startYear}–${p.endYear || "Present"}</span>` : ""}
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
              ${c.issueDate ? `<span style="color:#666;font-size:10px;">${c.issueDate}</span>` : ""}
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
    const yearRange = `${edu.startYear} – ${edu.endYear}`;
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
              ${p.startYear ? `<span style="color:#555;font-size:11px;font-weight:500;white-space:nowrap;">${p.startYear} – ${p.endYear || "Present"}</span>` : ""}
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
            ${c.issueDate ? `<span style="color:#666;font-size:10px;font-weight:500;white-space:nowrap;">Issued: ${c.issueDate}</span>` : ""}
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
