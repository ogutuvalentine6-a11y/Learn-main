import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-4xl font-bold text-gray-900">Contact</h1>
        <p className="mt-4 text-lg text-gray-600">
          Questions, feedback, or partnership inquiries — the fastest way
          to reach the founder is on GitHub.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Founder</h2>
            <p className="mt-2 text-sm text-gray-600">
              Valentine Otieno Ogutu<br />
              Software Engineer
            </p>
            <a
              href="https://github.com/ogutuvalentine6-a11y"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-sm text-brand-600 hover:underline"
            >
              github.com/ogutuvalentine6-a11y →
            </a>
          </div>

          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Platform Support</h2>
            <p className="mt-2 text-sm text-gray-600">
              For account issues, payment questions, or course access problems,
              please open an issue on the GitHub repository.
            </p>
            <a
              href="https://github.com/ogutuvalentine6-a11y/Learn/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-sm text-brand-600 hover:underline"
            >
              Open an issue →
            </a>
          </div>
        </div>

        <div className="mt-10 rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Helpful links</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href="/courses" className="text-brand-600 hover:underline">
                Browse courses
              </a>
            </li>
            <li>
              <a href="/register" className="text-brand-600 hover:underline">
                Create an account
              </a>
            </li>
            <li>
              <a href="/login" className="text-brand-600 hover:underline">
                Sign in
              </a>
            </li>
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  );
}
