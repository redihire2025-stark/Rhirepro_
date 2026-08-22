import { supabase } from "./supabase";

export interface NewsletterTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  description: string;
  content: string;
}

export const SAMPLE_NEWSLETTER_TEMPLATES: NewsletterTemplate[] = [
  {
    id: "strategy-email-marketing",
    name: "Strategy Email Marketing Newsletter",
    category: "Marketing & Strategy",
    subject: "Strategy Email Marketing - Key Insights & Automation Tips",
    description: "Teal & White 2-column layout with content personalization, mobile optimization, and email automation tips.",
    content: `
<div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #F8FAF9; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
  <!-- Header Bar -->
  <div style="background-color: #FF2B2B; color: #ffffff; padding: 12px 24px; text-align: right; font-size: 13px; font-weight: 600;">
    <span>⚡ RhirePro Recruitment Solutions</span>
  </div>

  <!-- Main 2-Column Container -->
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <!-- Left Column (Red Accent) -->
      <td width="50%" valign="top" style="background-color: #3A1F1F; color: #ffffff; padding: 32px 24px;">
        <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.7); margin: 0 0 8px 0;">Official Newsletter | 2026 Edition</p>
        <h1 style="font-size: 28px; font-weight: 800; margin: 0 0 12px 0; line-height: 1.1; border-bottom: 2px solid rgba(255,255,255,0.3); padding-bottom: 8px;">RhirePro</h1>
        <h2 style="font-size: 16px; font-weight: 600; color: #E2E8F0; margin: 0 0 20px 0;">{{SUBJECT}}</h2>
        
        <p style="font-size: 12px; line-height: 1.6; color: rgba(255,255,255,0.9); margin-bottom: 24px;">
          Welcome to the official RhirePro Newsletter! In this edition, we explore modern recruitment strategies to help you hire faster and optimize candidate outreach.
        </p>

        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 14px; font-weight: 700; color: #ffffff; margin: 0 0 6px 0;">01. Outreach Personalization</h3>
          <p style="font-size: 12px; line-height: 1.5; color: rgba(255,255,255,0.85); margin: 0;">
            Tailoring job alerts and interview invitations to candidate profiles dramatically improves response rates and candidate satisfaction.
          </p>
        </div>

        <div>
          <h3 style="font-size: 14px; font-weight: 700; color: #ffffff; margin: 0 0 6px 0;">02. Mobile-First Experience</h3>
          <p style="font-size: 12px; line-height: 1.5; color: rgba(255,255,255,0.85); margin: 0;">
            Over 75% of job seekers apply on mobile devices. Ensure your job postings and career portals are streamlined for quick 1-click applications.
          </p>
        </div>
      </td>

      <!-- Right Column (White Main) -->
      <td width="50%" valign="top" style="background-color: #ffffff; color: #1E293B; padding: 32px 24px;">
        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 15px; font-weight: 800; color: #FF2B2B; margin: 0 0 6px 0;">03. AI-Powered Matching</h3>
          <p style="font-size: 12px; line-height: 1.5; color: #475569; margin: 0 0 12px 0;">
            Automated resume parsing and candidate ranking save hours of manual screening for recruiters.
          </p>
          <div style="border-bottom: 1px solid #E2E8F0;"></div>
        </div>

        <div style="margin-bottom: 24px;">
          <h4 style="font-size: 13px; font-weight: 700; font-style: italic; color: #1E293B; margin: 0 0 6px 0;">Benefits of Automated Hiring</h4>
          <p style="font-size: 12px; line-height: 1.5; color: #64748B; margin: 0 0 12px 0;">
            Reduce time-to-hire by 50%, eliminate scheduling friction, and connect top talent with verified organization admins.
          </p>
          <div style="border-bottom: 1px solid #E2E8F0;"></div>
        </div>

        <div>
          <h4 style="font-size: 13px; font-weight: 700; font-style: italic; color: #1E293B; margin: 0 0 6px 0;">Next-Gen Recruiter Tools</h4>
          <p style="font-size: 12px; line-height: 1.5; color: #64748B; margin: 0 0 12px 0;">
            Utilize live applicant tracking, real-time candidate search, and verified team member permissions.
          </p>
          <div style="border-bottom: 1px solid #E2E8F0;"></div>
        </div>
      </td>
    </tr>
  </table>

  <!-- Bottom Footer -->
  <div style="background-color: #F1F5F9; padding: 20px 24px; border-top: 1px solid #E2E8F0;">
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td valign="middle" style="font-size: 12px; color: #475569; line-height: 1.5;">
          Thank you for subscribing to RhirePro updates! We hope our recruitment insights empower your hiring journey.
        </td>
        <td width="160" align="right" valign="middle" style="font-size: 11px; color: #64748B; line-height: 1.4;">
          <strong>RhirePro Support</strong><br />
          support@rhirepro.com<br />
          www.rhirepro.com
        </td>
      </tr>
    </table>
  </div>
</div>
`.trim(),
  },
  {
    id: "company-equality-newsletter",
    name: "Company & HR Equality Newsletter",
    category: "Corporate & HR",
    subject: "Company Newsletter - Achievements in Pay Equity & Upcoming Events",
    description: "Deep Navy Blue & Orange corporate newsletter layout with pay equity milestones, workshops, and HR contact info.",
    content: `
<div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #1E293B; color: #ffffff; border-radius: 8px; overflow: hidden;">
  <!-- Header Bar -->
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td style="background-color: #EA580C; padding: 18px 24px;">
        <h1 style="font-size: 18px; font-weight: 800; color: #ffffff; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">{{SUBJECT}}</h1>
      </td>
      <td align="right" style="background-color: #1E293B; padding: 18px 24px; font-size: 16px; font-weight: 800; color: #ffffff; letter-spacing: 1px;">
        //RHIREPRO//
      </td>
    </tr>
  </table>

  <!-- Intro Text -->
  <div style="padding: 24px 24px 16px 24px; font-size: 13px; line-height: 1.6; color: #CBD5E1;">
    At RhirePro, we believe in equal pay for equal work. As International Equal Pay Day reminds us of the global quest for pay equity, we're excited to share our progress and invite you to participate in making equality a reality here.
  </div>

  <!-- Inner White Card -->
  <div style="margin: 0 24px 24px 24px; background-color: #ffffff; color: #1E293B; border-radius: 12px; padding: 24px;">
    <!-- Section 1: Achievements -->
    <h3 style="font-size: 15px; font-weight: 700; color: #BE123C; margin: 0 0 16px 0;">Achievements in Pay Equity</h3>
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
      <tr>
        <td width="48%" valign="top">
          <strong style="font-size: 13px; color: #1E293B; display: block; margin-bottom: 4px;">🏆 Salary Transparency</strong>
          <p style="font-size: 12px; color: #64748B; margin: 0; line-height: 1.5;">We've conducted thorough reviews and adjustments to ensure fair pay across the company.</p>
        </td>
        <td width="4%"></td>
        <td width="48%" valign="top">
          <strong style="font-size: 13px; color: #1E293B; display: block; margin-bottom: 4px;">🎯 Bias-Free Training</strong>
          <p style="font-size: 12px; color: #64748B; margin: 0; line-height: 1.5;">All team leaders have been trained to recognize and eliminate bias in pay decisions.</p>
        </td>
      </tr>
    </table>

    <div style="border-bottom: 1px dashed #E2E8F0; margin-bottom: 20px;"></div>

    <!-- Section 2: Upcoming Events -->
    <h3 style="font-size: 15px; font-weight: 700; color: #EA580C; margin: 0 0 16px 0;">Upcoming Events</h3>
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
      <tr>
        <td width="48%" valign="top">
          <strong style="font-size: 13px; color: #1E293B; display: block; margin-bottom: 4px;">Understanding Equal Pay Workshop</strong>
          <p style="font-size: 12px; color: #64748B; margin: 0; line-height: 1.5;">
            Dive deep into the principles of fair pay with insights from industry experts.<br />
            • <strong>When:</strong> Sept 18, 10 AM<br />
            • <strong>Where:</strong> Virtual Session (Link provided)<br />
            • <strong>Host:</strong> RhirePro HR Team
          </p>
        </td>
        <td width="4%"></td>
        <td width="48%" valign="top">
          <strong style="font-size: 13px; color: #1E293B; display: block; margin-bottom: 4px;">Equal Pay Panel Discussion</strong>
          <p style="font-size: 12px; color: #64748B; margin: 0; line-height: 1.5;">
            Join key team members as they discuss strategies to ensure pay equity at our organization.<br />
            • <strong>When:</strong> Sept 18, 2 PM<br />
            • <strong>Where:</strong> Virtual (Link provided)
          </p>
        </td>
      </tr>
    </table>

    <div style="border-bottom: 1px dashed #E2E8F0; margin-bottom: 20px;"></div>

    <!-- Section 3: How You Can Contribute -->
    <h3 style="font-size: 15px; font-weight: 700; color: #BE123C; margin: 0 0 16px 0;">How You Can Contribute</h3>
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td width="48%" valign="top">
          <strong style="font-size: 13px; color: #1E293B; display: block; margin-bottom: 4px;">🗣 Voice Concerns</strong>
          <p style="font-size: 12px; color: #64748B; margin: 0; line-height: 1.5;">If you notice pay issues, please talk to HR or your manager.</p>
        </td>
        <td width="4%"></td>
        <td width="48%" valign="top">
          <strong style="font-size: 13px; color: #1E293B; display: block; margin-bottom: 4px;">🤝 Support Peers</strong>
          <p style="font-size: 12px; color: #64748B; margin: 0; line-height: 1.5;">Encourage and support each other in professional growth and advocating for equitable pay.</p>
        </td>
      </tr>
    </table>
  </div>

  <!-- Sign-off & Footer -->
  <div style="padding: 0 24px 24px 24px; font-size: 13px; line-height: 1.6; color: #CBD5E1;">
    <p style="margin: 0 0 12px 0;">Together, let's embrace equal pay and ensure that our company not only supports but leads in creating an equitable work environment.</p>
    <p style="margin: 0 0 20px 0; color: #F87171; font-weight: 600;">Join us in pushing for pay equity at RhirePro. Your involvement matters!</p>

    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td valign="middle">
          <strong style="font-size: 14px; color: #ffffff;">Warm regards,</strong><br />
          <span style="font-size: 13px; color: #94A3B8;">RhirePro HR Team</span><br />
          <span style="font-size: 12px; color: #64748B;">Human Resources | support@rhirepro.com</span>
        </td>
        <td align="right" valign="middle">
          <div style="background-color: #EA580C; color: #ffffff; padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 600;">
            www.rhirepro.com
          </div>
        </td>
      </tr>
    </table>
  </div>
</div>
`.trim(),
  },
  {
    id: "holiday-reflection-newsletter",
    name: "Holiday & Year-End Reflection Newsletter",
    category: "Seasonal Update",
    subject: "A Year-End Reflection: Celebrating the Holiday Season Together",
    description: "Clean White & Sky Blue newsletter with festive banner image, 4-part holiday reflection grid, and author sign-off.",
    content: `
<div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #ffffff; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; color: #1E293B;">
  <!-- Hero Banner Image Placeholder -->
  <div style="background-color: #334155; color: #ffffff; padding: 48px 24px; text-align: center;">
    <h2 style="font-size: 24px; font-weight: 300; margin: 0 0 8px 0; letter-spacing: 2px;">HAPPY HOLIDAYS</h2>
    <p style="font-size: 14px; color: #94A3B8; margin: 0;">Celebrating togetherness, joy, and reflection</p>
  </div>

  <!-- Header Info -->
  <div style="padding: 24px 32px 12px 32px; border-bottom: 2px solid #0EA5E9;">
    <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748B; margin: 0 0 6px 0;">RHIREPRO BULLETIN | VOL 09</p>
    <p style="font-size: 13px; color: #0EA5E9; font-weight: 600; margin: 0 0 8px 0;">Holiday Newsletter</p>
    <h1 style="font-size: 24px; font-weight: 800; color: #0F172A; margin: 0; line-height: 1.3;">
      {{SUBJECT}}
    </h1>
  </div>

  <!-- 4-Grid Content Section -->
  <div style="padding: 28px 32px;">
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
      <tr>
        <td width="48%" valign="top">
          <h3 style="font-size: 14px; font-weight: 700; color: #0F172A; margin: 0 0 8px 0;">Embracing the Festive Spirit: Holiday Traditions Around the World</h3>
          <p style="font-size: 12px; line-height: 1.6; color: #475569; margin: 0;">
            In this section, we will explore diverse holiday traditions and customs celebrated across the globe during the holiday season. From Christmas markets to new year celebrations, join us on a cultural journey.
          </p>
        </td>
        <td width="4%"></td>
        <td width="48%" valign="top">
          <h3 style="font-size: 14px; font-weight: 700; color: #0F172A; margin: 0 0 8px 0;">Giving Back: Spreading Kindness During the Holiday Season</h3>
          <p style="font-size: 12px; line-height: 1.6; color: #475569; margin: 0;">
            The holiday season is also a time for giving and spreading kindness. In this section, we will explore various ways to make a positive impact in our communities, from shelter volunteering to food drives.
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td width="48%" valign="top">
          <h3 style="font-size: 14px; font-weight: 700; color: #0F172A; margin: 0 0 8px 0;">Creating Lasting Memories: Fun Activities for the Whole Team</h3>
          <p style="font-size: 12px; line-height: 1.6; color: #475569; margin: 0;">
            The holiday season is a wonderful time to bond with colleagues and create lasting memories. From team gift exchanges to game nights, let's make the most of this joyful season.
          </p>
        </td>
        <td width="4%"></td>
        <td width="48%" valign="top">
          <h3 style="font-size: 14px; font-weight: 700; color: #0F172A; margin: 0 0 8px 0;">Finding Peace and Relaxation: Tips for a Stress-Free Holiday</h3>
          <p style="font-size: 12px; line-height: 1.6; color: #475569; margin: 0;">
            While the holiday season is filled with joy, it can also be busy. In this section, we will provide helpful strategies to ensure a more relaxed and enjoyable holiday season.
          </p>
        </td>
      </tr>
    </table>
  </div>

  <!-- Footer Banner -->
  <div style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 16px 32px;">
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="font-size: 12px; color: #64748B; font-weight: 600;">RhirePro Broadcast</td>
        <td align="right" style="font-size: 12px; color: #64748B;">By <strong>RhirePro Team</strong></td>
      </tr>
    </table>
  </div>
</div>
`.trim(),
  },
  {
    id: "annual-sports-day-newsletter",
    name: "Annual Event & Sports Day Announcement",
    category: "Event & Education",
    subject: "Save the Date for Our Annual Sports Day & School Updates!",
    description: "Warm Terracotta & Soft Beige grid newsletter layout with event schedules, science experiments, and literacy tips.",
    content: `
<div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #FAF5F0; border: 1px solid #E7D5C7; border-radius: 8px; overflow: hidden; color: #292524;">
  <!-- Title Header -->
  <div style="padding: 32px 24px 16px 24px; text-align: center; border-bottom: 2px solid #C2410C;">
    <h1 style="font-size: 32px; font-weight: 900; color: #C2410C; margin: 0 0 8px 0; letter-spacing: 1px;">NEWSLETTER</h1>
    <h2 style="font-size: 16px; font-weight: 700; color: #292524; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">{{SUBJECT}}</h2>
  </div>

  <div style="padding: 24px;">
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
      <tr>
        <!-- Left Image Card -->
        <td width="48%" valign="top">
          <div style="background-color: #C2410C; color: #ffffff; padding: 10px 16px; border-radius: 6px; font-size: 13px; font-weight: 700; display: inline-block; margin-bottom: 12px;">
            Issue Vol. 03
          </div>
          <div style="background-color: #E7D5C7; height: 180px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #78350F; font-size: 14px; font-weight: 600; text-align: center; padding: 16px;">
            📚 Community & Event Showcase
          </div>
        </td>
        <td width="4%"></td>
        <!-- Right Main Text -->
        <td width="48%" valign="top">
          <h3 style="font-size: 15px; font-weight: 800; color: #C2410C; margin: 0 0 8px 0;">Dear Team & Members,</h3>
          <p style="font-size: 12px; line-height: 1.6; color: #44403C; margin: 0;">
            We are delighted to announce our upcoming Annual Event & Sports Day! It will be a day filled with fun, healthy competition, and team bonding. Members across all departments will have the opportunity to showcase their talents.
          </p>
        </td>
      </tr>
    </table>

    <!-- 2-Column Terracotta Feature Cards -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
      <tr>
        <td width="48%" valign="top" style="background-color: #C2410C; color: #ffffff; padding: 20px; border-radius: 8px;">
          <h4 style="font-size: 14px; font-weight: 700; margin: 0 0 8px 0; color: #ffffff;">Interactive Workshops</h4>
          <p style="font-size: 12px; line-height: 1.5; color: #FFEDD5; margin: 0;">
            Get ready to participate in skill-building sessions and collaborative workshops hosted by industry mentors.
          </p>
        </td>
        <td width="4%"></td>
        <td width="48%" valign="top" style="background-color: #C2410C; color: #ffffff; padding: 20px; border-radius: 8px;">
          <h4 style="font-size: 14px; font-weight: 700; margin: 0 0 8px 0; color: #ffffff;">Boosting Professional Skills</h4>
          <p style="font-size: 12px; line-height: 1.5; color: #FFEDD5; margin: 0;">
            We are excited to launch new learning programs this month to encourage continuous career growth across all teams.
          </p>
        </td>
      </tr>
    </table>

    <p style="font-size: 13px; line-height: 1.6; color: #292524; font-weight: 600; text-align: center; margin-bottom: 20px;">
      Stay tuned for more updates and upcoming events. Thank you for your continuous support!
    </p>

    <!-- Footer Banner -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="background-color: #C2410C; color: #ffffff; padding: 10px 20px; border-radius: 20px; font-size: 12px; font-weight: 600;">
          www.rhirepro.com
        </td>
        <td align="right" style="background-color: #C2410C; color: #ffffff; padding: 10px 20px; border-radius: 20px; font-size: 12px; font-weight: 600;">
          RhirePro Updates
        </td>
      </tr>
    </table>
  </div>
</div>
`.trim(),
  },
  {
    id: "milestone-50years-newsletter",
    name: "Reflecting on Milestones & Anniversary Edition",
    category: "Company Milestones",
    subject: "Reflecting on 50 Years: Celebrating Memories & Milestones",
    description: "Sleek Monochromatic Slate & Black architectural newsletter celebrating company history, community stories, and future vision.",
    content: `
<div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; overflow: hidden; color: #0F172A;">
  <!-- Header Top Bar -->
  <div style="padding: 24px 28px 12px 28px; background-color: #E2E8F0;">
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="font-size: 16px; font-weight: 700; color: #334155;">Reflecting on Milestones</td>
        <td align="right" style="font-size: 12px; font-style: italic; color: #64748B;">RhirePro Special Edition</td>
      </tr>
    </table>
    <h1 style="font-size: 38px; font-weight: 900; color: #0F172A; margin: 12px 0 0 0; letter-spacing: -0.5px;">Newsletter</h1>
  </div>

  <!-- Black Milestone Banner -->
  <div style="background-color: #000000; color: #ffffff; padding: 24px 28px;">
    <h2 style="font-size: 22px; font-weight: 800; margin: 0; line-height: 1.3;">
      {{SUBJECT}}
    </h2>
  </div>

  <!-- Content Body -->
  <div style="padding: 24px 28px;">
    <p style="font-size: 13px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
      We are excited to present this special edition newsletter revisiting our key achievements, memorable moments, and future vision.
    </p>

    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
      <tr>
        <td width="45%" valign="top" style="background-color: #E2E8F0; padding: 20px; border-radius: 8px; text-align: center; color: #334155; font-size: 13px; font-weight: 600;">
          🏛 Platform Excellence & Legacy Highlights
        </td>
        <td width="5%"></td>
        <td width="50%" valign="top">
          <h3 style="font-size: 14px; font-weight: 700; color: #0F172A; margin: 0 0 6px 0;">Spotlight on Milestones</h3>
          <p style="font-size: 12px; line-height: 1.6; color: #64748B; margin: 0 0 16px 0;">
            Explore key milestones that have marked our journey. From groundbreaking recruitment innovations to platform enhancements, this section highlights our dedicated community.
          </p>

          <h3 style="font-size: 14px; font-weight: 700; color: #0F172A; margin: 0 0 6px 0;">Your Stories, Your Growth</h3>
          <p style="font-size: 12px; line-height: 1.6; color: #64748B; margin: 0;">
            We invite you, our valued subscribers, to share your favorite career and hiring achievements with us.
          </p>
        </td>
      </tr>
    </table>

    <!-- Contact & Contribution Black Footer -->
    <div style="background-color: #000000; color: #ffffff; border-radius: 8px; padding: 24px;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td width="48%" valign="top" style="border-right: 1px solid rgba(255,255,255,0.2); padding-right: 16px;">
            <strong style="font-size: 13px; color: #ffffff; display: block; margin-bottom: 8px;">RhirePro Headquarters</strong>
            <p style="font-size: 11px; color: #94A3B8; margin: 0 0 4px 0;">✉ support@rhirepro.com</p>
            <p style="font-size: 11px; color: #94A3B8; margin: 0;">🌐 www.rhirepro.com</p>
          </td>
          <td width="4%"></td>
          <td width="48%" valign="top" style="padding-left: 8px;">
            <strong style="font-size: 13px; color: #ffffff; display: block; margin-bottom: 8px;">How You Can Contribute</strong>
            <ul style="font-size: 11px; color: #94A3B8; margin: 0; padding-left: 16px; line-height: 1.6;">
              <li><strong>Share Your Story:</strong> Send your feedback to support@rhirepro.com.</li>
              <li><strong>Join the Community:</strong> Stay active on RhirePro for new opportunities.</li>
            </ul>
          </td>
        </tr>
      </table>
    </div>
  </div>
</div>
`.trim(),
  },
];

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getTemplateWithPastedMatter(templateId: string, subject: string, formattedMatter: string): string {
  const escapedSubject = escapeHtml(subject);

  if (templateId === "company-equality-newsletter") {
    return `
<div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #1E293B; color: #ffffff; border-radius: 8px; overflow: hidden;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td style="background-color: #EA580C; padding: 18px 24px;">
        <h1 style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">${escapedSubject}</h1>
      </td>
      <td align="right" style="background-color: #1E293B; padding: 18px 24px; font-size: 16px; font-weight: 800; color: #ffffff; letter-spacing: 1px;">
        //RHIREPRO//
      </td>
    </tr>
  </table>
  <div style="margin: 24px; background-color: #ffffff; color: #1E293B; border-radius: 12px; padding: 24px; font-size: 14px; line-height: 1.6;">
    ${formattedMatter}
  </div>
  <div style="padding: 0 24px 24px 24px; font-size: 13px; line-height: 1.6; color: #CBD5E1;">
    <p style="margin: 0 0 16px 0; color: #F87171; font-weight: 600;">Thank you for being a valued subscriber to RhirePro updates!</p>
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td valign="middle">
          <strong style="font-size: 14px; color: #ffffff;">Warm regards,</strong><br />
          <span style="font-size: 13px; color: #94A3B8;">RhirePro Team</span><br />
          <span style="font-size: 12px; color: #64748B;">support@rhirepro.com</span>
        </td>
        <td align="right" valign="middle">
          <div style="background-color: #EA580C; color: #ffffff; padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 600;">
            www.rhirepro.com
          </div>
        </td>
      </tr>
    </table>
  </div>
</div>`.trim();
  }

  if (templateId === "holiday-reflection-newsletter") {
    return `
<div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #ffffff; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; color: #1E293B;">
  <div style="background-color: #334155; color: #ffffff; padding: 36px 24px; text-align: center;">
    <h2 style="font-size: 22px; font-weight: 300; margin: 0 0 8px 0; letter-spacing: 2px;">RHIREPRO OFFICIAL ANNOUNCEMENT</h2>
    <p style="font-size: 14px; color: #94A3B8; margin: 0;">Special Update & Community Newsletter</p>
  </div>
  <div style="padding: 24px 32px 12px 32px; border-bottom: 2px solid #0EA5E9;">
    <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748B; margin: 0 0 6px 0;">SPECIAL BULLETIN</p>
    <h1 style="font-size: 22px; font-weight: 800; color: #0F172A; margin: 0; line-height: 1.3;">
      ${escapedSubject}
    </h1>
  </div>
  <div style="padding: 28px 32px; font-size: 14px; line-height: 1.6; color: #334155;">
    ${formattedMatter}
  </div>
  <div style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 16px 32px;">
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="font-size: 12px; color: #64748B; font-weight: 600;">RhirePro Broadcast</td>
        <td align="right" style="font-size: 12px; color: #64748B;">By <strong>RhirePro Team</strong></td>
      </tr>
    </table>
  </div>
</div>`.trim();
  }

  if (templateId === "annual-sports-day-newsletter") {
    return `
<div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #FAF5F0; border: 1px solid #E7D5C7; border-radius: 8px; overflow: hidden; color: #292524;">
  <div style="padding: 32px 24px 16px 24px; text-align: center; border-bottom: 2px solid #C2410C;">
    <h1 style="font-size: 28px; font-weight: 900; color: #C2410C; margin: 0 0 8px 0; letter-spacing: 1px;">NEWSLETTER</h1>
    <h2 style="font-size: 16px; font-weight: 700; color: #292524; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">${escapedSubject}</h2>
  </div>
  <div style="padding: 24px; font-size: 14px; line-height: 1.6; color: #44403C;">
    ${formattedMatter}
    <div style="margin-top: 24px; background-color: #C2410C; color: #ffffff; padding: 16px; border-radius: 8px; font-size: 13px; line-height: 1.5;">
      <strong>Stay connected with RhirePro:</strong> Explore job opportunities, candidate tools, and recruitment updates on our platform.
    </div>
  </div>
  <div style="padding: 16px 24px; border-top: 1px solid #E7D5C7;">
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="background-color: #C2410C; color: #ffffff; padding: 8px 16px; border-radius: 16px; font-size: 12px; font-weight: 600; display: inline-block;">
          www.rhirepro.com
        </td>
        <td align="right" style="font-size: 12px; color: #78350F; font-weight: 600;">
          RhirePro Updates
        </td>
      </tr>
    </table>
  </div>
</div>`.trim();
  }

  if (templateId === "milestone-50years-newsletter") {
    return `
<div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; overflow: hidden; color: #0F172A;">
  <div style="padding: 20px 28px 12px 28px; background-color: #E2E8F0;">
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td style="font-size: 14px; font-weight: 700; color: #334155;">RhirePro Official Broadcast</td>
        <td align="right" style="font-size: 12px; font-style: italic; color: #64748B;">Newsletter Edition</td>
      </tr>
    </table>
    <h1 style="font-size: 30px; font-weight: 900; color: #0F172A; margin: 10px 0 0 0; letter-spacing: -0.5px;">Newsletter</h1>
  </div>
  <div style="background-color: #000000; color: #ffffff; padding: 20px 28px;">
    <h2 style="font-size: 20px; font-weight: 800; margin: 0; line-height: 1.3;">
      ${escapedSubject}
    </h2>
  </div>
  <div style="padding: 24px 28px; font-size: 14px; line-height: 1.6; color: #475569;">
    ${formattedMatter}
    <div style="margin-top: 24px; background-color: #000000; color: #ffffff; border-radius: 8px; padding: 20px;">
      <strong style="font-size: 13px; color: #ffffff; display: block; margin-bottom: 6px;">RhirePro Platform Support</strong>
      <p style="font-size: 12px; color: #94A3B8; margin: 0;">✉ support@rhirepro.com | 🌐 www.rhirepro.com</p>
    </div>
  </div>
</div>`.trim();
  }

  // Default: strategy-email-marketing
  return `
<div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #F8FAF9; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #FF2B2B; color: #ffffff; padding: 12px 24px; text-align: right; font-size: 13px; font-weight: 600;">
    <span>⚡ RhirePro Recruitment Solutions</span>
  </div>
  <div style="background-color: #3A1F1F; color: #ffffff; padding: 24px;">
    <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.7); margin: 0 0 6px 0;">Official Newsletter</p>
    <h1 style="font-size: 24px; font-weight: 800; margin: 0 0 8px 0; border-bottom: 2px solid rgba(255,255,255,0.3); padding-bottom: 8px;">RhirePro</h1>
    <h2 style="font-size: 16px; font-weight: 600; color: #E2E8F0; margin: 0;">${escapedSubject}</h2>
  </div>
  <div style="background-color: #ffffff; color: #1E293B; padding: 24px; font-size: 14px; line-height: 1.6;">
    ${formattedMatter}
  </div>
  <div style="background-color: #F1F5F9; padding: 20px 24px; border-top: 1px solid #E2E8F0;">
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td valign="middle" style="font-size: 12px; color: #475569; line-height: 1.5;">
          Thank you for subscribing to RhirePro updates!
        </td>
        <td width="160" align="right" valign="middle" style="font-size: 11px; color: #64748B; line-height: 1.4;">
          <strong>RhirePro Support</strong><br />
          support@rhirepro.com<br />
          www.rhirepro.com
        </td>
      </tr>
    </table>
  </div>
</div>`.trim();
}

export function wrapNewsletterHtml(subject: string, contentHtml: string, templateId?: string): string {
  const trimmed = contentHtml.trim();
  if (trimmed.toLowerCase().startsWith("<!doctype html") || trimmed.toLowerCase().startsWith("<html")) {
    return trimmed;
  }

  const selectedTemplate = SAMPLE_NEWSLETTER_TEMPLATES.find((t) => t.id === templateId);

  // Check if contentHtml is full raw template HTML (e.g. contains container div with max-width/table)
  const isFullTemplateHtml =
    /<div[\s\S]*style=/i.test(trimmed) && (trimmed.includes("max-width:") || trimmed.includes("<table"));
  const isHtml = /<[a-z][\s\S]*>/i.test(trimmed);

  let finalBodyHtml = trimmed;
  let bgStyle = "background-color: #f4f4f5;";

  if (selectedTemplate) {
    if (selectedTemplate.id === "company-equality-newsletter") {
      bgStyle = "background-color: #0f172a;";
    } else if (selectedTemplate.id === "annual-sports-day-newsletter") {
      bgStyle = "background-color: #faf5f0;";
    } else if (selectedTemplate.id === "milestone-50years-newsletter") {
      bgStyle = "background-color: #f8fafc;";
    } else if (selectedTemplate.id === "strategy-email-marketing") {
      bgStyle = "background-color: #f8faf9;";
    } else if (selectedTemplate.id === "holiday-reflection-newsletter") {
      bgStyle = "background-color: #f1f5f9;";
    }

    if (isFullTemplateHtml) {
      if (finalBodyHtml.includes("{{SUBJECT}}")) {
        finalBodyHtml = finalBodyHtml.replace(/\{\{SUBJECT\}\}/g, escapeHtml(subject));
      }
    } else {
      // User pasted matter / plain text or custom HTML snippet into composer while template is selected!
      const formattedMatter = isHtml
        ? trimmed
        : trimmed
            .split(/\n{2,}/)
            .map((p) => `<p style="font-size: 14px; line-height: 1.6; margin: 0 0 14px 0;">${p.replace(/\n/g, "<br/>")}</p>`)
            .join("");

      finalBodyHtml = getTemplateWithPastedMatter(selectedTemplate.id, subject, formattedMatter);
    }
  } else if (!isHtml) {
    finalBodyHtml = trimmed
      .split(/\n{2,}/)
      .map((p) => `<p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">${p.replace(/\n/g, "<br/>")}</p>`)
      .join("");
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 24px 12px; ${bgStyle} font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  ${finalBodyHtml}
</body>
</html>`;
}

export async function sendNewsletterBroadcast(params: {
  subject: string;
  contentHtml: string;
  templateId?: string;
}): Promise<{ success: boolean; count: number; message: string }> {
  const { subject, contentHtml, templateId } = params;

  if (!subject.trim()) {
    return { success: false, count: 0, message: "Please enter a subject line for the newsletter." };
  }

  if (!contentHtml.trim()) {
    return { success: false, count: 0, message: "Please enter content for the newsletter." };
  }

  const formattedHtml = wrapNewsletterHtml(subject.trim(), contentHtml.trim(), templateId);

  try {
    // 1. Fetch all subscribers from Supabase newsletter_subscribers table
    const { data: subscribers, error: fetchError } = await supabase
      .from("newsletter_subscribers")
      .select("email");

    if (fetchError) {
      return { success: false, count: 0, message: `Failed to fetch subscribers: ${fetchError.message}` };
    }

    const rawList = (subscribers ?? []).map((s) => s.email?.trim()).filter((e): e is string => Boolean(e) && e.includes("@"));
    const emailList = Array.from(new Set(rawList));

    if (emailList.length === 0) {
      return { success: false, count: 0, message: "No subscribers found in database to receive newsletter." };
    }

    // 2. First attempt: server-side delivery via Netlify Function / API endpoint
    try {
      const serverRes = await fetch("/api/send-newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          contentHtml: formattedHtml,
          recipients: emailList,
        }),
      });

      if (serverRes.ok) {
        const serverData = await serverRes.json().catch(() => null);
        if (serverData?.success && serverData.sent_count > 0) {
          return {
            success: true,
            count: serverData.sent_count,
            message: `Newsletter successfully sent to ${serverData.sent_count} subscriber${serverData.sent_count === 1 ? "" : "s"}!`,
          };
        }
      }
    } catch {
      // API endpoint unreachable -> Fallback to direct client Resend API delivery below
    }

    let sentCount = 0;
    let failedCount = 0;
    const logs: any[] = [];

    // Access each variable directly. Vite can only statically replace
    // `import.meta.env.SOMETHING`; a bare `import.meta.env` reference — as the
    // previous `(import.meta.env && ...)` guards were — makes it serialise the
    // ENTIRE env object into the client bundle. That is how VITE_GROQ_API_KEY
    // ended up published verbatim in dist/assets/index-*.js.
    // Only VITE_-prefixed values are ever exposed, so nothing server-side (the
    // service role key, the Supabase access token) was affected — but any
    // future VITE_ secret would leak the same way.
    const resendApiKey = import.meta.env.VITE_RESEND_API_KEY || "";
    const resendSenderEmail = import.meta.env.VITE_RESEND_SENDER_EMAIL || "support@rhirepro.com";
    const resendSenderName = import.meta.env.VITE_RESEND_SENDER_NAME || "RhirePro";

    // 3. Fallback: Direct Resend API Delivery
    for (const recipientEmail of emailList) {
      let isSent = false;
      let sendErrorMsg: string | null = null;

      if (resendApiKey) {
        try {
          const resendRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: `${resendSenderName} <${resendSenderEmail}>`,
              to: [recipientEmail],
              subject: subject.trim(),
              html: formattedHtml,
            }),
          });

          const resendData = await resendRes.json().catch(() => null);
          if (resendRes.ok && (resendData?.id || resendData?.name === "success")) {
            isSent = true;
          } else if (resendData?.message) {
            sendErrorMsg = resendData.message;
          }
        } catch (rErr: any) {
          console.error(`Resend API dispatch failed for ${recipientEmail}:`, rErr);
          sendErrorMsg = rErr?.message || "Resend API connection error";
        }
      }

      if (isSent) {
        sentCount++;
        logs.push({
          recipient_email: recipientEmail,
          email_type: "newsletter",
          subject: subject.trim(),
          status: "sent",
          error_message: null,
          created_at: new Date().toISOString(),
        });
      } else {
        failedCount++;
        logs.push({
          recipient_email: recipientEmail,
          email_type: "newsletter",
          subject: subject.trim(),
          status: "failed",
          error_message: sendErrorMsg || "Delivery failed via email dispatch service.",
          created_at: new Date().toISOString(),
        });
      }
    }

    // 4. Audit logging
    if (logs.length > 0) {
      await supabase.from("email_logs").insert(logs);
    }

    if (sentCount > 0) {
      return {
        success: true,
        count: sentCount,
        message: `Newsletter successfully sent to ${sentCount} subscriber${sentCount === 1 ? "" : "s"}!`,
      };
    }

    return {
      success: false,
      count: 0,
      message: `Failed to deliver newsletter to subscribers. Please verify network and API configuration.`,
    };
  } catch (err) {
    console.error("Newsletter broadcast exception:", err);
    return {
      success: false,
      count: 0,
      message: "An unexpected error occurred while broadcasting the newsletter.",
    };
  }
}

