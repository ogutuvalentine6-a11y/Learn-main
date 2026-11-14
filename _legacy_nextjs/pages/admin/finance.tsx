import { useEffect, useState } from "react";
import Layout from "@/components/Layout";

export default function AdminFinance() {
  const [summary, setSummary] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [filter, setFilter] = useState({ status: "", q: "" });
  const [selected, setSelected] = useState<any>(null);
  const [refundForm, setRefundForm] = useState({ amount: "", reason: "" });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter.status) params.set("status", filter.status);
    if (filter.q) params.set("q", filter.q);
    const [s, i] = await Promise.all([
      fetch("/api/finance/summary").then((r) => r.ok ? r.json() : null),
      fetch(`/api/finance/invoices?${params}`).then((r) => r.ok ? r.json() : []),
    ]);
    setSummary(s);
    setInvoices(Array.isArray(i) ? i : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter]);

  async function refund() {
    if (!selected) return;
    const amount = Number(refundForm.amount);
    if (!amount || amount <= 0) return alert("Enter a positive amount");
    const res = await fetch(`/api/finance/invoices/${selected._id}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, reason: refundForm.reason }),
    });
    if (!res.ok) {
      const b = await res.json();
      return alert(b.detail || b.error || "Failed");
    }
    setSelected(null);
    setRefundForm({ amount: "", reason: "" });
    load();
  }

  if (!summary) return <Layout role="admin"><p className="text-gray-500">Loading…</p></Layout>;

  return (
    <Layout role="admin">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Finance</h1>
        <a
          href="/api/finance/invoices.csv"
          className="rounded border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Export CSV
        </a>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Invoices" value={summary.totalInvoices} />
        <Stat label="Gross Revenue" value={`NGN ${summary.totalRevenue.toLocaleString()}`} tone="text-brand-600" />
        <Stat label="Refunded" value={`NGN ${summary.totalRefunded.toLocaleString()}`} tone="text-red-600" />
        <Stat label="Net Revenue" value={`NGN ${summary.netRevenue.toLocaleString()}`} tone="text-green-600" />
      </div>

      {/* Monthly */}
      {summary.monthly.length > 0 && (
        <div className="mt-6 rounded bg-white p-5 shadow">
          <h2 className="mb-3 font-semibold">Monthly Revenue (last 12)</h2>
          <div className="space-y-1">
            {summary.monthly.map((m: any) => {
              const max = Math.max(...summary.monthly.map((x: any) => x.revenue), 1);
              const pct = (m.revenue / max) * 100;
              return (
                <div key={`${m.year}-${m.month}`} className="flex items-center gap-3 text-xs">
                  <span className="w-16 text-gray-500">{m.year}-{String(m.month).padStart(2, "0")}</span>
                  <div className="flex-1 h-2 rounded bg-gray-100">
                    <div className="h-2 rounded bg-brand-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-24 text-right font-medium">NGN {m.revenue.toLocaleString()}</span>
                  <span className="w-10 text-right text-gray-500">({m.count})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-3">
        <input
          placeholder="Search invoice, student, reference…"
          value={filter.q}
          onChange={(e) => setFilter({ ...filter, q: e.target.value })}
          className="flex-1 rounded border px-3 py-2 text-sm"
        />
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="rounded border px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="partially_refunded">Partially refunded</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {/* Invoices table */}
      <div className="mt-4 rounded bg-white p-5 shadow">
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-gray-500">No invoices match the filter.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs uppercase text-gray-500">
              <tr>
                <th className="py-2">Invoice</th>
                <th>Student</th>
                <th>Course</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv._id} className="border-b">
                  <td className="py-2 font-mono text-xs">{inv.invoiceNumber}</td>
                  <td className="text-xs">{inv.studentName}</td>
                  <td className="text-xs">{inv.courseTitle}</td>
                  <td className="font-medium">NGN {inv.amount.toLocaleString()}</td>
                  <td>
                    <span className={`text-xs rounded px-2 py-0.5 ${
                      inv.status === "paid" ? "bg-green-100 text-green-700" :
                      inv.status === "refunded" ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>{inv.status.replace("_", " ")}</span>
                  </td>
                  <td className="text-xs text-gray-500">{new Date(inv.issuedAt).toLocaleDateString()}</td>
                  <td>
                    {inv.status !== "refunded" && (
                      <button
                        onClick={() => { setSelected(inv); setRefundForm({ amount: String(inv.amount - inv.refundedAmount), reason: "" }); }}
                        className="text-xs text-brand-600 underline"
                      >
                        Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Refund Invoice</h2>
            <p className="mt-1 text-sm text-gray-500">{selected.invoiceNumber} — {selected.studentName}</p>
            <p className="mt-3 text-sm">Amount: <strong>NGN {selected.amount.toLocaleString()}</strong></p>
            <p className="text-sm">Already refunded: NGN {selected.refundedAmount.toLocaleString()}</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs text-gray-500">Refund amount</label>
                <input
                  type="number"
                  value={refundForm.amount}
                  onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })}
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Reason (optional)</label>
                <textarea
                  rows={3}
                  value={refundForm.reason}
                  onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={refund} className="flex-1 rounded bg-red-600 py-2 text-sm text-white hover:bg-red-700">
                Confirm refund
              </button>
              <button onClick={() => setSelected(null)} className="flex-1 rounded border py-2 text-sm text-gray-700">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function Stat({ label, value, tone }: any) {
  return (
    <div className="rounded bg-white p-4 shadow">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone || "text-gray-900"}`}>{value}</p>
    </div>
  );
}
