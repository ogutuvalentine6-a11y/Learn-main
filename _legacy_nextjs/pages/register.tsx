import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useTranslation } from "@/contexts/LanguageContext";
import Footer from "@/components/Footer";

const FIELDS = [
  { name: "fullName", labelKey: "auth.register.fullName", type: "text" },
  { name: "idNumber", labelKey: "auth.register.idNumber", type: "text" },
  { name: "email", labelKey: "auth.register.email", type: "email" },
  { name: "phone", labelKey: "auth.register.phone", type: "text" },
  { name: "location", labelKey: "auth.register.location", type: "text" },
  { name: "school", labelKey: "auth.register.school", type: "text" },
  { name: "fieldOfStudy", labelKey: "auth.register.fieldOfStudy", type: "text" },
  { name: "courseOfStudy", labelKey: "auth.register.courseOfStudy", type: "text" },
  { name: "password", labelKey: "auth.register.password", type: "password" },
] as const;

export default function Register() {
  const router = useRouter();
  const { t } = useTranslation();
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth-register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok)
      return setError(
        typeof data.error === "string" ? data.error : "Registration failed"
      );
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="mx-auto mt-10 mb-8 w-full max-w-2xl flex-1 rounded-lg bg-white p-8 shadow">
        <h1 className="mb-6 text-2xl font-bold">{t("auth.register.title")}</h1>
        <form onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.name} className={f.name === "password" ? "md:col-span-2" : ""}>
              <label className="mb-1 block text-sm font-medium">{t(f.labelKey)}</label>
              <input
                type={f.type}
                value={form[f.name] || ""}
                onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                required
                className="w-full rounded border px-3 py-2"
              />
            </div>
          ))}
          {error && <p className="md:col-span-2 text-sm text-red-600">{error}</p>}
          <button
            disabled={busy}
            className="md:col-span-2 rounded bg-brand-600 py-2 text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? "..." : t("auth.register.submit")}
          </button>
        </form>
        <p className="mt-4 text-sm text-gray-600">
          {t("auth.register.haveAccount")}{" "}
          <Link href="/login" className="text-brand-600 underline">
            {t("auth.register.login")}
          </Link>
        </p>
      </div>
      <Footer />
    </div>
  );
}
