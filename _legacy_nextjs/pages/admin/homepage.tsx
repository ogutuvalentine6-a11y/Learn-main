import { useEffect, useState } from "react";
import Layout from "@/components/Layout";

interface Hero { title: string; subtitle: string; badgeText: string; primaryCtaLabel: string; primaryCtaHref: string; secondaryCtaLabel: string; secondaryCtaHref: string; backgroundImageUrl: string; }
interface Founder { name: string; role: string; bio: string; githubUrl: string; avatarUrl: string; }
interface Cta { title: string; subtitle: string; primaryLabel: string; primaryHref: string; secondaryLabel: string; secondaryHref: string; }
interface Announcement { id: string; text: string; link: string; active: boolean; }
interface Homepage {
  hero: Hero; founder: Founder; cta: Cta;
  announcements: Announcement[];
  published: boolean;
}

export default function AdminHomepage() {
  const [data, setData] = useState<Homepage | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/homepage-content")
      .then((r) => r.json())
      .then(setData);
  }, []);

  async function save() {
    if (!data) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/homepage-content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setBusy(false);
    const body = await res.json();
    if (!res.ok) return setMsg(body.error || "Save failed");
    setMsg("Saved. Visit / to see changes.");
  }

  if (!data) {
    return (
      <Layout role="admin">
        <p className="text-gray-500">Loading…</p>
      </Layout>
    );
  }

  return (
    <Layout role="admin">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Homepage Editor</h1>
        <a href="/" target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 underline">
          Preview →
        </a>
      </div>

      <div className="space-y-6">
        {/* Hero */}
        <section className="rounded bg-white p-5 shadow">
          <h2 className="mb-3 font-semibold">Hero</h2>
          <label className="block text-xs text-gray-500">Badge</label>
          <input
            value={data.hero.badgeText}
            onChange={(e) => setData({ ...data, hero: { ...data.hero, badgeText: e.target.value } })}
            className="mb-3 w-full rounded border px-3 py-2 text-sm"
          />
          <label className="block text-xs text-gray-500">Title</label>
          <input
            value={data.hero.title}
            onChange={(e) => setData({ ...data, hero: { ...data.hero, title: e.target.value } })}
            className="mb-3 w-full rounded border px-3 py-2 text-sm"
          />
          <label className="block text-xs text-gray-500">Subtitle</label>
          <textarea
            rows={3}
            value={data.hero.subtitle}
            onChange={(e) => setData({ ...data, hero: { ...data.hero, subtitle: e.target.value } })}
            className="mb-3 w-full rounded border px-3 py-2 text-sm"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs text-gray-500">Primary CTA Label</label>
              <input value={data.hero.primaryCtaLabel} onChange={(e) => setData({ ...data, hero: { ...data.hero, primaryCtaLabel: e.target.value } })} className="mb-1 w-full rounded border px-3 py-2 text-sm" />
              <label className="block text-xs text-gray-500">Primary CTA Href</label>
              <input value={data.hero.primaryCtaHref} onChange={(e) => setData({ ...data, hero: { ...data.hero, primaryCtaHref: e.target.value } })} className="w-full rounded border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Secondary CTA Label</label>
              <input value={data.hero.secondaryCtaLabel} onChange={(e) => setData({ ...data, hero: { ...data.hero, secondaryCtaLabel: e.target.value } })} className="mb-1 w-full rounded border px-3 py-2 text-sm" />
              <label className="block text-xs text-gray-500">Secondary CTA Href</label>
              <input value={data.hero.secondaryCtaHref} onChange={(e) => setData({ ...data, hero: { ...data.hero, secondaryCtaHref: e.target.value } })} className="w-full rounded border px-3 py-2 text-sm" />
            </div>
          </div>
        </section>

        {/* Founder */}
        <section className="rounded bg-white p-5 shadow">
          <h2 className="mb-3 font-semibold">Founder</h2>
          <label className="block text-xs text-gray-500">Name</label>
          <input value={data.founder.name} onChange={(e) => setData({ ...data, founder: { ...data.founder, name: e.target.value } })} className="mb-3 w-full rounded border px-3 py-2 text-sm" />
          <label className="block text-xs text-gray-500">Role</label>
          <input value={data.founder.role} onChange={(e) => setData({ ...data, founder: { ...data.founder, role: e.target.value } })} className="mb-3 w-full rounded border px-3 py-2 text-sm" />
          <label className="block text-xs text-gray-500">Bio</label>
          <textarea rows={4} value={data.founder.bio} onChange={(e) => setData({ ...data, founder: { ...data.founder, bio: e.target.value } })} className="mb-3 w-full rounded border px-3 py-2 text-sm" />
          <label className="block text-xs text-gray-500">GitHub URL</label>
          <input value={data.founder.githubUrl} onChange={(e) => setData({ ...data, founder: { ...data.founder, githubUrl: e.target.value } })} className="w-full rounded border px-3 py-2 text-sm" />
        </section>

        {/* CTA */}
        <section className="rounded bg-white p-5 shadow">
          <h2 className="mb-3 font-semibold">Final CTA</h2>
          <label className="block text-xs text-gray-500">Title</label>
          <input value={data.cta.title} onChange={(e) => setData({ ...data, cta: { ...data.cta, title: e.target.value } })} className="mb-3 w-full rounded border px-3 py-2 text-sm" />
          <label className="block text-xs text-gray-500">Subtitle</label>
          <input value={data.cta.subtitle} onChange={(e) => setData({ ...data, cta: { ...data.cta, subtitle: e.target.value } })} className="mb-3 w-full rounded border px-3 py-2 text-sm" />
        </section>

        {/* Announcements */}
        <section className="rounded bg-white p-5 shadow">
          <h2 className="mb-3 font-semibold">Announcements</h2>
          {data.announcements.length === 0 && (
            <p className="mb-3 text-sm text-gray-500">No announcements.</p>
          )}
          {data.announcements.map((a, i) => (
            <div key={i} className="mb-2 flex items-center gap-2">
              <input
                value={a.text}
                onChange={(e) => {
                  const ann = [...data.announcements];
                  ann[i] = { ...ann[i], text: e.target.value };
                  setData({ ...data, announcements: ann });
                }}
                placeholder="Text"
                className="flex-1 rounded border px-3 py-2 text-sm"
              />
              <input
                value={a.link}
                onChange={(e) => {
                  const ann = [...data.announcements];
                  ann[i] = { ...ann[i], link: e.target.value };
                  setData({ ...data, announcements: ann });
                }}
                placeholder="/link"
                className="w-40 rounded border px-3 py-2 text-sm"
              />
              <button
                onClick={() => setData({ ...data, announcements: data.announcements.filter((_, j) => j !== i) })}
                className="text-red-600 underline text-sm"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={() => setData({ ...data, announcements: [...data.announcements, { id: `ann-${Date.now()}`, text: "New announcement", link: "", active: true }] })}
            className="mt-2 rounded border border-brand-600 px-3 py-1.5 text-sm text-brand-600"
          >
            + Add announcement
          </button>
        </section>

        {/* Publish state */}
        <section className="rounded bg-white p-5 shadow">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={data.published}
              onChange={(e) => setData({ ...data, published: e.target.checked })}
            />
            Published (visible to public)
          </label>
        </section>

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={busy}
            className="rounded bg-brand-600 px-5 py-2.5 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
          {msg && <span className="text-sm text-gray-700">{msg}</span>}
        </div>
      </div>
    </Layout>
  );
}
