import { useNavigate } from "react-router";
const logoImage = new URL("../../logo/logo.png", import.meta.url).href;

export default function PrivacyPolicyPage() {
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
        <h1 className="text-4xl font-bold text-[#3A1F1F] mb-2">Privacy Policy</h1>
        <p className="text-sm text-[#8A8A8A] mb-10">Last updated: April 21, 2025</p>

        <div className="space-y-8 text-[#3A1F1F]">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
            <p className="text-[#555] leading-relaxed">
              Welcome to RhirePro ("we", "our", or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform at RhirePro, including job seekers and recruiters who register and use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
            <p className="text-[#555] leading-relaxed mb-3">We collect information you provide directly to us, including:</p>
            <ul className="list-disc list-inside space-y-2 text-[#555]">
              <li>Name, email address, phone number, and profile photo</li>
              <li>Resume, work experience, education, and skills</li>
              <li>Job preferences, desired salary, and location</li>
              <li>Company name, job postings, and recruiter profile details</li>
              <li>Messages and communications within the platform</li>
              <li>Sign-in information including Google OAuth data (name, email, profile picture)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
            <p className="text-[#555] leading-relaxed mb-3">We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-2 text-[#555]">
              <li>Create and manage your account</li>
              <li>Match job seekers with relevant job opportunities</li>
              <li>Allow recruiters to search for and contact candidates</li>
              <li>Send notifications about application status and messages</li>
              <li>Improve, personalise, and expand our platform</li>
              <li>Communicate with you about updates, offers, and support</li>
              <li>Ensure platform security and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Sharing Your Information</h2>
            <p className="text-[#555] leading-relaxed">
              We do not sell your personal data. We may share your information with recruiters when you apply to jobs, with service providers who help us operate the platform (such as Supabase for database and authentication services), and where required by law. Recruiter profile information is visible to job seekers browsing job listings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Google Sign-In</h2>
            <p className="text-[#555] leading-relaxed">
              If you choose to sign in with Google, we receive your name, email address, and profile picture from Google. We use this information solely to create and manage your RhirePro account. We do not access your Google Drive, Gmail, or any other Google services beyond basic profile information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Data Storage & Security</h2>
            <p className="text-[#555] leading-relaxed">
              Your data is stored securely using Supabase, which employs industry-standard encryption in transit (TLS) and at rest. We implement appropriate technical and organisational measures to protect your personal information against unauthorised access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Data Retention</h2>
            <p className="text-[#555] leading-relaxed">
              We retain your personal data for as long as your account is active or as needed to provide our services. You may request deletion of your account and associated data at any time by contacting us at the email below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Your Rights</h2>
            <p className="text-[#555] leading-relaxed mb-3">Depending on your location, you may have the right to:</p>
            <ul className="list-disc list-inside space-y-2 text-[#555]">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Data portability</li>
            </ul>
            <p className="text-[#555] leading-relaxed mt-3">To exercise these rights, please contact us at <a href="mailto:redihire2025@gmail.com" className="text-[#FF2B2B] hover:underline">redihire2025@gmail.com</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Cookies</h2>
            <p className="text-[#555] leading-relaxed">
              We use essential cookies and local storage to maintain your session and preferences. We do not use third-party advertising cookies. By using our platform, you consent to the use of these essential cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Changes to This Policy</h2>
            <p className="text-[#555] leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy on this page with an updated date. Continued use of the platform after changes constitutes acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Contact Us</h2>
            <p className="text-[#555] leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at:<br />
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
