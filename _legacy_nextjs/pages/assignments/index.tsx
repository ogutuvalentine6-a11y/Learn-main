import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "@/components/Layout";

interface Assignment {
  _id: string;
  title: string;
  instructions: string;
  dueAt: string | null;
  maxScore: number;
  createdAt: string;
}

export default function Assignments() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth-me").then((r) => (r.ok ? r.json() : null)).then((u) => {
      if (!u) router.push("/login"); else setMe(u);
    });
  }, [router]);

  useEffect(() => {
    if (!me) return;
    fetch("/api/assignments").then((r) => (r.ok ? r.json() : []))
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [me]);

  if (!me) return null;

  return (
    <Layout role={me.role} name={me.fullName}>
      <div className="mb-6 flex justify-between">
        <h1 className="text-2xl font-bold">Assignments</h1>
        {me.role !== "student" && (
          <Link href="/assignments/new" className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">
            + Create assignment
          </Link>
        )}
      </div>

      <div className="rounded bg-white p-5 shadow">
        {loading ? <p className="text-sm text-gray-500">Loading…</p> :
         items.length === 0 ? (
          <div className="rounded border border-dashed p-8 text-center">
            <p className="text-sm text-gray-500">No assignments yet.</p>
          </div>
        ) : (
          <div className="divide-y">
            {items.map((a) => {
              const overdue = a.dueAt && new Date(a.dueAt) < new Date();
              return (
                <Link key={a._id} href={`/assignments/${a._id}`} className="block py-3 hover:bg-gray-50">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-medium">{a.title}</h3>
                      <p className="text-xs text-gray-500 line-clamp-1">{a.instructions}</p>
                    </div>
                    <div className="text-right text-xs">
                      {a.dueAt && (
                        <p className={overdue ? "text-red-600 font-medium" : "text-gray-500"}>
                          {overdue ? "Overdue" : "Due"} {new Date(a.dueAt).toLocaleDateString()}
                        </p>
                      )}
                      <p className="text-gray-500">max {a.maxScore}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
