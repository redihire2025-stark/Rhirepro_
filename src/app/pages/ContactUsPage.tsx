import { useNavigate } from "react-router";
import { Mail, MapPin, Building2, Clock } from "lucide-react";
const logoImage = new URL("../../logo/logo.png", import.meta.url).href;

/**
 * Contact page.
 *
 * The landing page has a contact section, but Razorpay's website review looks
 * for a dedicated, directly reachable Contact Us page listing the operating
 * entity and a working address — a section inside the home page does not
 * satisfy it. This also names Redihire Global Services Private Limited
 * explicitly, since that is the entity holding the payment account.
 */
export default function ContactUsPage() {
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
        <h1 className="text-4xl font-bold text-[#3A1F1F] mb-2">Contact Us</h1>
        <p className="text-[#8A8A8A] mb-10">
          We usually reply within one business day.
        </p>

        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#FFF2F2] flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-[#FF2B2B]" />
            </div>
            <div>
              <p className="text-sm text-[#8A8A8A] mb-0.5">Operating entity</p>
              <p className="font-semibold text-[#3A1F1F]">Redihire Global Services Private Limited</p>
              <p className="text-sm text-[#555] mt-1">
                RhirePro is a product of Redihire Global Services Private Limited. Subscription payments
                are collected by, and appear on your statement as, this entity.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#FFF2F2] flex items-center justify-center shrink-0">
              <Mail className="h-5 w-5 text-[#FF2B2B]" />
            </div>
            <div>
              <p className="text-sm text-[#8A8A8A] mb-0.5">Email</p>
              <p className="font-semibold text-[#3A1F1F]">
                <a href="mailto:support@rhirepro.com" className="hover:underline">support@rhirepro.com</a>
                <span className="text-[#8A8A8A] font-normal text-sm"> — product &amp; account support</span>
              </p>
              <p className="font-semibold text-[#3A1F1F] mt-1">
                <a href="mailto:redihire2025@gmail.com" className="hover:underline">redihire2025@gmail.com</a>
                <span className="text-[#8A8A8A] font-normal text-sm"> — billing, payments &amp; refunds</span>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#FFF2F2] flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5 text-[#FF2B2B]" />
            </div>
            <div>
              <p className="text-sm text-[#8A8A8A] mb-0.5">Registered address</p>
              <p className="font-semibold text-[#3A1F1F]">Hyderabad, Telangana, India</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#FFF2F2] flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-[#FF2B2B]" />
            </div>
            <div>
              <p className="text-sm text-[#8A8A8A] mb-0.5">Support hours</p>
              <p className="font-semibold text-[#3A1F1F]">Monday to Friday, 10:00 – 18:00 IST</p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-sm text-[#8A8A8A]">
          For payment or refund queries, please include your registered email address and the payment
          reference from your receipt. See our{" "}
          <button onClick={() => navigate("/refund-policy")} className="text-[#FF2B2B] hover:underline">
            Refund &amp; Cancellation Policy
          </button>.
        </div>
      </main>
    </div>
  );
}
