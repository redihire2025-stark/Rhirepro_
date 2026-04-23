import { useNavigate } from "react-router";
const logoImage = new URL("../../logo/logo.png", import.meta.url).href;

export default function TermsOfServicePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F6F6F6]">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <img src={logoImage} alt="RhirePro Logo" className="w-9 h-9" />
            <div className="text-xl font-bold text-[#3A1F1F]">Rhire<span className="text-[#FF2B2B]">Pro</span></div>
          </div>
          <button onClick={() => navigate(-1)} className="text-sm text-[#FF2B2B] hover:underline">← Back</button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-4xl font-bold text-[#3A1F1F] mb-2">Terms of Service</h1>
        <p className="text-sm text-[#8A8A8A] mb-10">Last updated: April 21, 2025</p>

        <div className="space-y-8 text-[#3A1F1F]">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-[#555] leading-relaxed">
              By accessing or using RhirePro ("the Platform"), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use our platform. These terms apply to all users, including job seekers, recruiters, and visitors.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Eligibility</h2>
            <p className="text-[#555] leading-relaxed">
              You must be at least 18 years old to use RhirePro. By registering, you confirm that you are 18 or older and that the information you provide is accurate and truthful. We reserve the right to terminate accounts found to be in violation of this requirement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
            <p className="text-[#555] leading-relaxed mb-3">When creating an account, you agree to:</p>
            <ul className="list-disc list-inside space-y-2 text-[#555]">
              <li>Provide accurate, current, and complete information</li>
              <li>Keep your password confidential and not share it with others</li>
              <li>Notify us immediately of any unauthorised use of your account</li>
              <li>Be responsible for all activity that occurs under your account</li>
            </ul>
            <p className="text-[#555] leading-relaxed mt-3">
              We reserve the right to suspend or terminate accounts that violate these terms or engage in fraudulent activity.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Job Seekers</h2>
            <p className="text-[#555] leading-relaxed mb-3">As a job seeker, you agree to:</p>
            <ul className="list-disc list-inside space-y-2 text-[#555]">
              <li>Provide truthful and accurate information in your profile and applications</li>
              <li>Not misrepresent your qualifications, experience, or identity</li>
              <li>Use the platform only for legitimate job-seeking purposes</li>
              <li>Not apply to jobs you are clearly unqualified for in bad faith</li>
              <li>Respond to recruiters in a professional and respectful manner</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Recruiters</h2>
            <p className="text-[#555] leading-relaxed mb-3">As a recruiter, you agree to:</p>
            <ul className="list-disc list-inside space-y-2 text-[#555]">
              <li>Post only genuine, accurate, and lawful job listings</li>
              <li>Not post misleading, discriminatory, or fraudulent job offers</li>
              <li>Use candidate data only for recruitment purposes</li>
              <li>Not share candidate information with third parties without consent</li>
              <li>Comply with all applicable employment laws and regulations</li>
              <li>Adhere to the subscription plan limits applicable to your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Prohibited Conduct</h2>
            <p className="text-[#555] leading-relaxed mb-3">You must not:</p>
            <ul className="list-disc list-inside space-y-2 text-[#555]">
              <li>Use the platform for any unlawful purpose</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Scrape, crawl, or extract data from the platform without permission</li>
              <li>Attempt to gain unauthorised access to any part of the platform</li>
              <li>Introduce viruses, malware, or any harmful code</li>
              <li>Create fake profiles or impersonate others</li>
              <li>Use the platform to send spam or unsolicited messages</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Subscription Plans & Payments</h2>
            <p className="text-[#555] leading-relaxed">
              Certain features of RhirePro are available through paid subscription plans for recruiters. All payments are processed securely. Subscription fees are non-refundable unless otherwise stated. We reserve the right to change pricing with reasonable notice. Continued use after a price change constitutes acceptance of the new pricing.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Intellectual Property</h2>
            <p className="text-[#555] leading-relaxed">
              All content on the RhirePro platform, including but not limited to the logo, design, text, and software, is the property of RhirePro and protected by applicable intellectual property laws. You may not copy, modify, distribute, or use our content without prior written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Disclaimers</h2>
            <p className="text-[#555] leading-relaxed">
              RhirePro is provided "as is" without warranties of any kind. We do not guarantee that job listings are accurate, that you will secure employment, or that the platform will be available without interruption. We are not responsible for the conduct of recruiters or job seekers on the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Limitation of Liability</h2>
            <p className="text-[#555] leading-relaxed">
              To the fullest extent permitted by law, RhirePro shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform, including loss of employment opportunities, data loss, or financial loss.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Termination</h2>
            <p className="text-[#555] leading-relaxed">
              We reserve the right to suspend or terminate your access to RhirePro at any time, with or without notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties. You may also delete your account at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Changes to Terms</h2>
            <p className="text-[#555] leading-relaxed">
              We may update these Terms of Service from time to time. We will notify you of material changes by posting the updated terms on this page. Your continued use of the platform after changes are posted constitutes your acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Governing Law</h2>
            <p className="text-[#555] leading-relaxed">
              These Terms of Service shall be governed by and construed in accordance with the laws of India. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the courts located in India.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">14. Contact Us</h2>
            <p className="text-[#555] leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at:<br />
              <a href="mailto:redihire2025@gmail.com" className="text-[#FF2B2B] hover:underline">redihire2025@gmail.com</a>
            </p>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#FF2B2B] text-white mt-16 py-6">
        <div className="container mx-auto px-4 text-center text-xs text-white/80">
          <p>Copyright © 2025 RhirePro. All Rights Reserved.</p>
          <div className="flex justify-center gap-4 mt-2">
            <a href="/privacy-policy" className="hover:text-white">Privacy Policy</a>
            <a href="/terms-of-service" className="hover:text-white">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
