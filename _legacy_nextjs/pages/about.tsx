import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <h1 className="text-4xl font-bold text-gray-900">About Learn</h1>
        <p className="mt-4 text-lg text-gray-600">
          A modern learning management platform built by an engineer who believes
          education should be accessible, honest, and built to last.
        </p>

        <section className="mt-10 rounded-lg border bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
            Meet the Founder
          </p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            Valentine Otieno Ogutu
          </h2>
          <p className="mt-1 text-gray-600">
            Software Engineer · Founder, Learn
          </p>
          <p className="mt-6 text-gray-700">
            Learn was built on a simple belief: quality education should be accessible,
            honest, and engineered to last. Every course, every dashboard, and every
            integration on this platform was designed and built by Valentine — a
            full-stack engineer who cares as much about clean code as he does about a
            clean user experience.
          </p>
          <p className="mt-4 text-gray-700">
            <strong>The stack:</strong> Python + FastAPI for the backend,
            Next.js + TypeScript for the frontend, MongoDB for data, and
            production integrations with Paystack, Cloudinary, and Resend.
          </p>
          <div className="mt-6">
            <a
              href="https://github.com/ogutuvalentine6-a11y"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded bg-gray-900 px-5 py-2.5 text-white hover:bg-black"
            >
              View on GitHub →
            </a>
          </div>
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold">Mission</h3>
            <p className="mt-2 text-gray-600">
              Make quality learning accessible to students everywhere — with
              a platform that respects their time, data, and privacy.
            </p>
          </div>
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold">Vision</h3>
            <p className="mt-2 text-gray-600">
              A future where every learner can find the right course, connect
              with experienced instructors, and prove their skills with
              verifiable certificates.
            </p>
          </div>
        </section>

        <section className="mt-10 rounded-lg border bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold">What you can do on Learn</h2>
          <ul className="mt-4 space-y-2 text-gray-700">
            <li>→ Browse and enroll in courses from verified instructors</li>
            <li>→ Track your progress through lessons and assessments</li>
            <li>→ Join live classes with real instructors</li>
            <li>→ Watch educational reels from the community</li>
            <li>→ Share study materials in the resource library</li>
            <li>→ Participate in course discussions and study groups</li>
            <li>→ Earn certificates of completion</li>
          </ul>
        </section>

        <div className="mt-10 flex gap-3">
          <Link href="/register" className="rounded bg-brand-600 px-6 py-3 text-white hover:bg-brand-700">
            Create an account
          </Link>
          <Link href="/courses" className="rounded border border-brand-600 px-6 py-3 text-brand-600 hover:bg-brand-50">
            Explore courses
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
