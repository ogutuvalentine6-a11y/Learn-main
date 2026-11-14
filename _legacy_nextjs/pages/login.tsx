import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useTranslation } from "@/contexts/LanguageContext";
import Footer from "@/components/Footer";

export default function Login() {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error || t("auth.login.failed"));
    if (data.role === "admin") router.push("/admin/dashboard");
    else if (data.role === "staff") router.push("/staff/dashboard");
    else router.push("/student/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="mx-auto mt-16 w-full max-w-md flex-1 rounded-lg bg-white p-8 shadow">
        <h1 className="mb-6 text-2xl font-bold">{t("auth.login.title")}</h1>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="email"
            placeholder={t("auth.login.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded border px-3 py-2"
          />
          <input
            type="password"
            placeholder={t("auth.login.password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded border px-3 py-2"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            disabled={busy}
            className="w-full rounded bg-brand-600 py-2 text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? "..." : t("auth.login.submit")}
          </button>
        </form>
        <p className="mt-4 text-sm text-gray-600">
          {t("auth.login.noAccount")}{" "}
          <Link href="/register" className="text-brand-600 underline">
            {t("auth.login.register")}
          </Link>
        </p>
      </div>
      <Footer />
    </div>
  );
}
