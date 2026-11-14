// ─────────────────────────────────────────────────────────────────
// Site-wide attribution footer.
//
// Author : Valentine Otieno Ogutu — Software Engineer
// GitHub : https://github.com/ogutuvalentine6-a11y
//
// Rendered on every page (homepage, auth pages, and all
// student/staff/admin dashboards via Layout). Preserves the
// Next.js + FastAPI stack this project is built on.
// ─────────────────────────────────────────────────────────────────

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 md:flex-row">
        <div className="text-center md:text-left">
          <p className="text-sm font-semibold text-gray-900">
            Valentine Otieno Ogutu
          </p>
          <p className="text-xs text-gray-500">Software Engineer</p>
        </div>
        <div className="text-center md:text-right">
          <a
            href="https://github.com/ogutuvalentine6-a11y"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-brand-600 hover:underline"
          >
            github.com/ogutuvalentine6-a11y
          </a>
          <p className="mt-1 text-xs text-gray-400">
            © {year} Learn Platform — Built with Next.js + FastAPI
          </p>
        </div>
      </div>
    </footer>
  );
}
