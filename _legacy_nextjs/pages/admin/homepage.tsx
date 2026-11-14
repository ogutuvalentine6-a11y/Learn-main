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

        {/* ── Hero Slides (replaces single hero when non-empty) ── */}
        <section className="rounded bg-white p-5 shadow">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Hero Slides</h2>
              <p className="text-xs text-gray-500">
                If any slides are active, they replace the single hero above.
              </p>
            </div>
            <button
              onClick={() =>
                setData({
                  ...data,
                  heroSlides: [
                    ...(data.heroSlides || []),
                    {
                      id: `slide-${Date.now()}`,
                      title: "New Slide",
                      subtitle: "",
                      imageUrl: "",
                      ctaLabel: "Get Started",
                      ctaHref: "/register",
                      active: true,
                    },
                  ],
                })
              }
              className="rounded border border-brand-600 px-3 py-1 text-xs text-brand-600"
            >
              + Add slide
            </button>
          </div>
          {(data.heroSlides || []).length === 0 ? (
            <p className="text-sm text-gray-500">No slides — single hero is shown.</p>
          ) : (
            (data.heroSlides || []).map((s, i) => (
              <div key={s.id} className="mb-2 rounded border p-3">
                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    value={s.title}
                    onChange={(e) => {
                      const arr = [...(data.heroSlides || [])];
                      arr[i] = { ...arr[i], title: e.target.value };
                      setData({ ...data, heroSlides: arr });
                    }}
                    placeholder="Title"
                    className="rounded border px-2 py-1 text-sm"
                  />
                  <input
                    value={s.subtitle}
                    onChange={(e) => {
                      const arr = [...(data.heroSlides || [])];
                      arr[i] = { ...arr[i], subtitle: e.target.value };
                      setData({ ...data, heroSlides: arr });
                    }}
                    placeholder="Subtitle"
                    className="rounded border px-2 py-1 text-sm"
                  />
                  <input
                    value={s.imageUrl}
                    onChange={(e) => {
                      const arr = [...(data.heroSlides || [])];
                      arr[i] = { ...arr[i], imageUrl: e.target.value };
                      setData({ ...data, heroSlides: arr });
                    }}
                    placeholder="Image URL"
                    className="rounded border px-2 py-1 text-sm md:col-span-2"
                  />
                  <input
                    value={s.ctaLabel}
                    onChange={(e) => {
                      const arr = [...(data.heroSlides || [])];
                      arr[i] = { ...arr[i], ctaLabel: e.target.value };
                      setData({ ...data, heroSlides: arr });
                    }}
                    placeholder="CTA label"
                    className="rounded border px-2 py-1 text-sm"
                  />
                  <input
                    value={s.ctaHref}
                    onChange={(e) => {
                      const arr = [...(data.heroSlides || [])];
                      arr[i] = { ...arr[i], ctaHref: e.target.value };
                      setData({ ...data, heroSlides: arr });
                    }}
                    placeholder="CTA href"
                    className="rounded border px-2 py-1 text-sm"
                  />
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={s.active}
                      onChange={(e) => {
                        const arr = [...(data.heroSlides || [])];
                        arr[i] = { ...arr[i], active: e.target.checked };
                        setData({ ...data, heroSlides: arr });
                      }}
                    />
                    Active
                  </label>
                  <button
                    onClick={() =>
                      setData({
                        ...data,
                        heroSlides: (data.heroSlides || []).filter((_, j) => j !== i),
                      })
                    }
                    className="text-red-600 underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        {/* ── Testimonials ── */}
        <section className="rounded bg-white p-5 shadow">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Testimonials</h2>
              <p className="text-xs text-gray-500">
                Only approved testimonials appear on the public homepage.
              </p>
            </div>
            <button
              onClick={() =>
                setData({
                  ...data,
                  testimonials: [
                    ...(data.testimonials || []),
                    {
                      id: `t-${Date.now()}`,
                      name: "",
                      role: "",
                      quote: "",
                      avatarUrl: "",
                      approved: false,
                    },
                  ],
                })
              }
              className="rounded border border-brand-600 px-3 py-1 text-xs text-brand-600"
            >
              + Add testimonial
            </button>
          </div>
          {(data.testimonials || []).length === 0 ? (
            <p className="text-sm text-gray-500">No testimonials yet.</p>
          ) : (
            (data.testimonials || []).map((t, i) => (
              <div key={t.id} className="mb-2 rounded border p-3">
                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    value={t.name}
                    onChange={(e) => {
                      const arr = [...(data.testimonials || [])];
                      arr[i] = { ...arr[i], name: e.target.value };
                      setData({ ...data, testimonials: arr });
                    }}
                    placeholder="Name"
                    className="rounded border px-2 py-1 text-sm"
                  />
                  <input
                    value={t.role}
                    onChange={(e) => {
                      const arr = [...(data.testimonials || [])];
                      arr[i] = { ...arr[i], role: e.target.value };
                      setData({ ...data, testimonials: arr });
                    }}
                    placeholder="Role (e.g. Student, BSc CS)"
                    className="rounded border px-2 py-1 text-sm"
                  />
                </div>
                <textarea
                  value={t.quote}
                  onChange={(e) => {
                    const arr = [...(data.testimonials || [])];
                    arr[i] = { ...arr[i], quote: e.target.value };
                    setData({ ...data, testimonials: arr });
                  }}
                  placeholder="Quote"
                  rows={2}
                  className="mt-2 w-full rounded border px-2 py-1 text-sm"
                />
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={t.approved}
                      onChange={(e) => {
                        const arr = [...(data.testimonials || [])];
                        arr[i] = { ...arr[i], approved: e.target.checked };
                        setData({ ...data, testimonials: arr });
                      }}
                    />
                    Approved (show publicly)
                  </label>
                  <button
                    onClick={() =>
                      setData({
                        ...data,
                        testimonials: (data.testimonials || []).filter((_, j) => j !== i),
                      })
                    }
                    className="text-red-600 underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        {/* ── FAQ ── */}
        <section className="rounded bg-white p-5 shadow">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">FAQ</h2>
              <p className="text-xs text-gray-500">
                If empty, the homepage shows its built-in default FAQ.
              </p>
            </div>
            <button
              onClick={() =>
                setData({
                  ...data,
                  faqs: [
                    ...(data.faqs || []),
                    { id: `faq-${Date.now()}`, question: "", answer: "" },
                  ],
                })
              }
              className="rounded border border-brand-600 px-3 py-1 text-xs text-brand-600"
            >
              + Add FAQ
            </button>
          </div>
          {(data.faqs || []).length === 0 ? (
            <p className="text-sm text-gray-500">No FAQs — homepage default is used.</p>
          ) : (
            (data.faqs || []).map((f, i) => (
              <div key={f.id} className="mb-2 rounded border p-3">
                <input
                  value={f.question}
                  onChange={(e) => {
                    const arr = [...(data.faqs || [])];
                    arr[i] = { ...arr[i], question: e.target.value };
                    setData({ ...data, faqs: arr });
                  }}
                  placeholder="Question"
                  className="w-full rounded border px-2 py-1 text-sm"
                />
                <textarea
                  value={f.answer}
                  onChange={(e) => {
                    const arr = [...(data.faqs || [])];
                    arr[i] = { ...arr[i], answer: e.target.value };
                    setData({ ...data, faqs: arr });
                  }}
                  placeholder="Answer"
                  rows={2}
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                />
                <button
                  onClick={() =>
                    setData({ ...data, faqs: (data.faqs || []).filter((_, j) => j !== i) })
                  }
                  className="mt-1 text-xs text-red-600 underline"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </section>

        {/* ── Featured Courses & Instructors ── */}
        <section className="rounded bg-white p-5 shadow">
          <h2 className="mb-3 font-semibold">Featured Courses & Instructors</h2>
          <label className="block text-xs text-gray-500">
            Featured Course IDs (comma-separated — leave empty to show newest 6)
          </label>
          <input
            value={(data.featuredCourseIds || []).join(",")}
            onChange={(e) =>
              setData({
                ...data,
                featuredCourseIds: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
              })
            }
            placeholder="60f1234...,60f5678..."
            className="mb-3 w-full rounded border px-3 py-2 text-sm font-mono"
          />

          <label className="block text-xs text-gray-500">
            Featured Instructor IDs (comma-separated — leave empty to show all staff)
          </label>
          <input
            value={(data.featuredInstructorIds || []).join(",")}
            onChange={(e) =>
              setData({
                ...data,
                featuredInstructorIds: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
              })
            }
            placeholder="60f9abc..."
            className="w-full rounded border px-3 py-2 text-sm font-mono"
          />
        </section>

        {/* ── Footer links ── */}
        <section className="rounded bg-white p-5 shadow">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Footer Link Groups</h2>
              <p className="text-xs text-gray-500">
                If empty, the footer shows its built-in default links.
              </p>
            </div>
            <button
              onClick={() =>
                setData({
                  ...data,
                  footerLinks: [
                    ...(data.footerLinks || []),
                    { title: "New Group", links: [] },
                  ],
                })
              }
              className="rounded border border-brand-600 px-3 py-1 text-xs text-brand-600"
            >
              + Add group
            </button>
          </div>
          {(data.footerLinks || []).map((g, gi) => (
            <div key={gi} className="mb-2 rounded border p-3">
              <div className="flex gap-2">
                <input
                  value={g.title}
                  onChange={(e) => {
                    const arr = [...(data.footerLinks || [])];
                    arr[gi] = { ...arr[gi], title: e.target.value };
                    setData({ ...data, footerLinks: arr });
                  }}
                  placeholder="Group title (e.g. Platform)"
                  className="flex-1 rounded border px-2 py-1 text-sm"
                />
                <button
                  onClick={() =>
                    setData({
                      ...data,
                      footerLinks: (data.footerLinks || []).filter((_, j) => j !== gi),
                    })
                  }
                  className="text-xs text-red-600 underline"
                >
                  Remove group
                </button>
              </div>
              {(g.links || []).map((l, li) => (
                <div key={li} className="mt-1 flex gap-2">
                  <input
                    value={l.label}
                    onChange={(e) => {
                      const arr = [...(data.footerLinks || [])];
                      const links = [...(arr[gi].links || [])];
                      links[li] = { ...links[li], label: e.target.value };
                      arr[gi] = { ...arr[gi], links };
                      setData({ ...data, footerLinks: arr });
                    }}
                    placeholder="Label"
                    className="flex-1 rounded border px-2 py-1 text-xs"
                  />
                  <input
                    value={l.href}
                    onChange={(e) => {
                      const arr = [...(data.footerLinks || [])];
                      const links = [...(arr[gi].links || [])];
                      links[li] = { ...links[li], href: e.target.value };
                      arr[gi] = { ...arr[gi], links };
                      setData({ ...data, footerLinks: arr });
                    }}
                    placeholder="/path"
                    className="flex-1 rounded border px-2 py-1 text-xs font-mono"
                  />
                  <button
                    onClick={() => {
                      const arr = [...(data.footerLinks || [])];
                      const links = (arr[gi].links || []).filter((_, j) => j !== li);
                      arr[gi] = { ...arr[gi], links };
                      setData({ ...data, footerLinks: arr });
                    }}
                    className="text-xs text-red-600 underline"
                  >
                    x
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const arr = [...(data.footerLinks || [])];
                  const links = [...(arr[gi].links || []), { label: "", href: "" }];
                  arr[gi] = { ...arr[gi], links };
                  setData({ ...data, footerLinks: arr });
                }}
                className="mt-1 text-xs text-brand-600 underline"
              >
                + Add link
              </button>
            </div>
          ))}
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
