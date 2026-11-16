import Link from "next/link";
import Navbar from "@/components/Navbar";
import FooterMega from "@/components/FooterMega";

const FAQ = [
  { q: "How do I create an account?", a: "Click 'Get Started' at the top of any page. You'll need an email address and a password. Students, instructors, and guardians all register through the same form — role selection happens after registration." },
  { q: "How do I enrol in a course?", a: "Browse /courses, click a course you like, and press Enrol. Free courses enrol instantly. Paid courses redirect to Paystack for secure checkout." },
  { q: "Do you offer certificates?", a: "Yes. Complete a course and pass its assessments. Your certificate becomes available in /student/certificate and carries a verifiable ID." },
  { q: "How are live sessions scheduled?", a: "Instructors publish live sessions in /live/schedule. You can join from the schedule page or your student dashboard when a session is live." },
  { q: "What payment methods are supported?", a: "Card payments via Paystack. All transactions are processed over HTTPS on Paystack's PCI-compliant infrastructure — card details never touch our servers." },
  { q: "I forgot my password. What do I do?", a: "Password reset is being added. For now, contact support through /contact and we'll verify your identity and reset it manually." },
  { q: "How do I contact an instructor?", a: "Each course has a discussion forum. For direct questions, use the instructor's profile page which lists their contact preference." },
  { q: "Can I access the platform on mobile?", a: "Yes — the entire platform is designed mobile-first. Courses, videos, resources, and dashboards all work on phones and tablets." },
  { q: "Is my data secure?", a: "Passwords are hashed with bcrypt. Sessions use signed JWT tokens. Role-based access control is enforced on the backend, not just the frontend. See our Privacy Policy for full details." },
  { q: "How do I report a problem?", a: "For bugs or account issues, use /contact. Students can also raise welfare tickets through their dashboard for non-technical concerns." },
];

export default function FAQPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-bg text-fg font-sans">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <h1 className="text-3xl md:text-4xl font-extrabold text-fg">Frequently asked questions</h1>
          <p className="mt-2 text-fg-muted">Answers to the questions we hear most often.</p>

          <div className="mt-10 space-y-3">
            {FAQ.map((item, i) => (
              <details key={i} className="group bg-surface rounded-lg border border-border p-5">
                <summary className="font-semibold text-fg cursor-pointer list-none flex justify-between items-center gap-4">
                  <span>{item.q}</span>
                  <span className="text-brand-600 group-open:rotate-180 transition-transform flex-shrink-0">▾</span>
                </summary>
                <p className="mt-3 text-sm text-fg-muted leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>

          <div className="mt-10 text-center p-6 bg-surface rounded-lg border border-border">
            <p className="text-fg-muted">Didn't find your answer?</p>
            <Link href="/contact" className="mt-3 inline-flex items-center justify-center px-6 py-3 rounded-md bg-brand-600 text-white font-medium hover:bg-brand-700">
              Contact support
            </Link>
          </div>
        </div>
      </main>
      <FooterMega />
    </>
  );
}
