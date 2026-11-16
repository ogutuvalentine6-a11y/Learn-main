import Link from "next/link";
import Navbar from "@/components/Navbar";
import FooterMega from "@/components/FooterMega";

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-bg text-fg font-sans">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <h1 className="text-3xl md:text-4xl font-extrabold text-fg">Privacy Policy</h1>
          <p className="mt-2 text-sm text-fg-muted">Last updated: November 2026</p>

          <div className="mt-8 space-y-6 text-fg-muted leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-fg">What we collect</h2>
              <p className="mt-2">When you create an account, we collect your name, email address, and role (student, staff, guardian, or administrator). If you enrol in courses, we also store enrolment, progress, assignment, and payment information necessary to deliver the platform.</p>
            </section>
            <section>
              <h2 className="text-xl font-bold text-fg">How we use it</h2>
              <p className="mt-2">Your data is used only to operate the Learn platform: authenticating your account, delivering courses and materials, tracking your academic progress, and processing payments. We do not sell your data.</p>
            </section>
            <section>
              <h2 className="text-xl font-bold text-fg">Third-party services</h2>
              <p className="mt-2">We use the following processors: Paystack (payment processing), Cloudinary (media storage), Resend (email delivery), and MongoDB Atlas (database hosting). Each is bound by its own privacy policy.</p>
            </section>
            <section>
              <h2 className="text-xl font-bold text-fg">Your rights</h2>
              <p className="mt-2">You may request a copy of your data, correction of inaccurate information, or deletion of your account by contacting us through the <Link href="/contact" className="text-brand-600 underline">Contact page</Link>. Account deletion removes your personal data; anonymised academic records may be retained for institutional reporting.</p>
            </section>
            <section>
              <h2 className="text-xl font-bold text-fg">Cookies</h2>
              <p className="mt-2">We use a session cookie for authentication and a language preference cookie. We do not use third-party tracking cookies.</p>
            </section>
            <section>
              <h2 className="text-xl font-bold text-fg">Contact</h2>
              <p className="mt-2">Questions about this policy: <Link href="/contact" className="text-brand-600 underline">contact us</Link>.</p>
            </section>
          </div>

          <p className="mt-10 text-xs text-fg-muted border-t border-border pt-6">
            This is a plain-language privacy policy template. For production use with real user data, have it reviewed by a qualified legal professional in your jurisdiction.
          </p>
        </div>
      </main>
      <FooterMega />
    </>
  );
}
