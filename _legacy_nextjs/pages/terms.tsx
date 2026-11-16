import Link from "next/link";
import Navbar from "@/components/Navbar";
import FooterMega from "@/components/FooterMega";

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-bg text-fg font-sans">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <h1 className="text-3xl md:text-4xl font-extrabold text-fg">Terms of Service</h1>
          <p className="mt-2 text-sm text-fg-muted">Last updated: November 2026</p>

          <div className="mt-8 space-y-6 text-fg-muted leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-fg">1. Your account</h2>
              <p className="mt-2">You are responsible for keeping your password confidential. Do not share your login credentials. Notify us immediately at <Link href="/contact" className="text-brand-600 underline">Contact</Link> if you suspect unauthorized access.</p>
            </section>
            <section>
              <h2 className="text-xl font-bold text-fg">2. Acceptable use</h2>
              <p className="mt-2">You agree to use the platform only for lawful educational purposes. You may not upload copyrighted material without permission, harass other users, attempt to gain unauthorized access to protected areas, or interfere with the platform's operation.</p>
            </section>
            <section>
              <h2 className="text-xl font-bold text-fg">3. Course content</h2>
              <p className="mt-2">Course materials are provided for your personal learning. Redistribution, resale, or public posting of instructor-provided materials is not permitted without written consent.</p>
            </section>
            <section>
              <h2 className="text-xl font-bold text-fg">4. Payments</h2>
              <p className="mt-2">Paid courses are processed through Paystack. Refund eligibility is stated on each course page at the point of purchase. Contact support within the refund window if you have a billing issue.</p>
            </section>
            <section>
              <h2 className="text-xl font-bold text-fg">5. Termination</h2>
              <p className="mt-2">We may suspend or terminate accounts that violate these terms, with notice where reasonable. You may close your account at any time via the contact page.</p>
            </section>
            <section>
              <h2 className="text-xl font-bold text-fg">6. Limitation of liability</h2>
              <p className="mt-2">The platform is provided "as is". We aim for high availability but do not guarantee uninterrupted service. Our total liability for any claim is limited to the fees you have paid us in the preceding twelve months.</p>
            </section>
          </div>

          <p className="mt-10 text-xs text-fg-muted border-t border-border pt-6">
            Plain-language terms template. Have reviewed by a qualified legal professional before production use.
          </p>
        </div>
      </main>
      <FooterMega />
    </>
  );
}
