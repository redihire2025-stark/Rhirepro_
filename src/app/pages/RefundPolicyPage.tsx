import { useNavigate } from "react-router";
const logoImage = new URL("../../logo/logo.png", import.meta.url).href;

/**
 * Refund & Cancellation policy.
 *
 * Razorpay requires a reachable refund/cancellation policy before it will
 * approve a website on a live merchant account, and its absence is a common
 * reason for a domain submission to be rejected. It also has to name the legal
 * entity that actually holds the payment account — Redihire Global Services
 * Private Limited — rather than the product brand, so the page a customer reads
 * matches the name that appears on their statement.
 */
export default function RefundPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F6F6F6]">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <img src={logoImage} alt="RhirePro Logo" className="w-9 h-9" />
            <div className="text-xl font-bold text-[#3A1F1F]">Rhire<span className="text-[#FF2B2B]">Pro</span></div>
          </div>
          <button onClick={() => navigate(-1)} className="text-sm text-[#FF2B2B] hover:underline">← Back</button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-4xl font-bold text-[#3A1F1F] mb-2">Refund &amp; Cancellation Policy</h1>
        <p className="text-sm text-[#8A8A8A] mb-10">Last updated: 22 August 2026</p>

        <div className="space-y-8 text-[#3A1F1F]">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Who you are paying</h2>
            <p className="text-[#555] leading-relaxed">
              RhirePro is a product operated by <strong>Redihire Global Services Private Limited</strong>.
              All subscription payments are collected by Redihire Global Services Private Limited, and that
              is the name that will appear on your card or bank statement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. What you are buying</h2>
            <p className="text-[#555] leading-relaxed">
              Recruiter plans are prepaid subscriptions that unlock job posting, candidate search and
              related hiring features for a fixed period. Access is granted immediately once a payment is
              confirmed, and the plan runs for the duration shown at checkout.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Cancellation</h2>
            <p className="text-[#555] leading-relaxed mb-3">
              You may cancel a subscription at any time from your recruiter dashboard, or by writing to us
              at the address in section 6. Cancelling stops the plan from renewing.
            </p>
            <p className="text-[#555] leading-relaxed">
              Cancellation does not end your current billing period. Your plan stays active until the
              expiry date shown in your dashboard, and you keep full access until then.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Refunds</h2>
            <ul className="list-disc pl-5 space-y-2 text-[#555] leading-relaxed">
              <li>
                <strong>Duplicate or failed payments.</strong> If you were charged more than once for the
                same plan, or money left your account for a payment that did not activate a plan, we refund
                the full amount. Contact us with the payment reference and we will process it.
              </li>
              <li>
                <strong>Within 7 days, plan unused.</strong> If you have not posted a job or used a paid
                feature, you may request a full refund within 7 days of payment.
              </li>
              <li>
                <strong>After the plan has been used.</strong> Once jobs have been posted or candidate
                features used, the subscription is generally non-refundable, because the service has been
                delivered. We will still review genuine cases individually.
              </li>
              <li>
                <strong>Service failure on our side.</strong> If the platform is unavailable for a
                prolonged period during your paid term, we will extend your plan or refund the affected
                portion, whichever you prefer.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. How refunds are paid</h2>
            <p className="text-[#555] leading-relaxed">
              Approved refunds are returned to the original payment method through our payment gateway.
              Once we initiate a refund it typically reaches your account within <strong>5–7 business
              days</strong>, depending on your bank. We cannot refund to a different account or method.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Contact us about a payment</h2>
            <p className="text-[#555] leading-relaxed">
              Email{" "}
              <a href="mailto:redihire2025@gmail.com" className="text-[#FF2B2B] font-medium hover:underline">
                redihire2025@gmail.com
              </a>{" "}
              with your registered email address and the payment reference shown on your receipt. We
              acknowledge refund requests within 2 business days.
            </p>
            <p className="text-[#555] leading-relaxed mt-3">
              Redihire Global Services Private Limited, Hyderabad, Telangana, India.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
