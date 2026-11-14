import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";

interface Invoice {
  _id: string;
  invoiceNumber: string;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  amount: number;
  currency: string;
  status: string;
  refundedAmount: number;
  reference: string;
  issuedAt: string;
}

export default function MyInvoices() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Invoice | null>(null);

  useEffect(() => {
    fetch("/api/auth-me").then((r) => (r.ok ? r.json() : null)).then((u) => {
      if (!u) router.push("/login"); else setMe(u);
    });
  }, [router]);

  useEffect(() => {
    if (!me) return;
    fetch("/api/finance/invoices/my")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setInvoices(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [me]);

  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.amount, 0);
  const totalRefunded = invoices.reduce((sum, i) => sum + i.refundedAmount, 0);

  if (!me) return null;

  return (
    <Layout role={me.role} name={me.fullName}>
      <h1 className="mb-6 text-2xl font-bold">My Invoices</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded bg-white p-4 shadow">
          <p className="text-xs uppercase text-gray-500">Total Invoices</p>
          <p className="mt-1 text-2xl font-bold">{invoices.length}</p>
        </div>
        <div className="rounded bg-white p-4 shadow">
          <p className="text-xs uppercase text-gray-500">Total Paid</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            NGN {totalPaid.toLocaleString()}
          </p>
        </div>
        <div className="rounded bg-white p-4 shadow">
          <p className="text-xs uppercase text-gray-500">Total Refunded</p>
          <p className="mt-1 text-2xl font-bold text-red-600">
            NGN {totalRefunded.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded bg-white p-5 shadow">
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : invoices.length === 0 ? (
          <div className="rounded border border-dashed p-8 text-center text-sm text-gray-500">
            No invoices yet. They appear here after each successful payment.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs uppercase text-gray-500">
              <tr>
                <th className="py-2">Invoice</th>
                <th>Course</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv._id} className="border-b">
                  <td className="py-2 font-mono text-xs">{inv.invoiceNumber}</td>
                  <td>{inv.courseTitle}</td>
                  <td className="text-xs text-gray-500">
                    {new Date(inv.issuedAt).toLocaleDateString()}
                  </td>
                  <td className="font-medium">NGN {inv.amount.toLocaleString()}</td>
                  <td>
                    <span className={`text-xs rounded px-2 py-0.5 ${
                      inv.status === "paid" ? "bg-green-100 text-green-700" :
                      inv.status === "refunded" ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>{inv.status.replace("_", " ")}</span>
                  </td>
                  <td>
                    <button onClick={() => setSelected(inv)} className="text-xs text-brand-600 underline">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && <InvoiceModal invoice={selected} onClose={() => setSelected(null)} />}
    </Layout>
  );
}

function InvoiceModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  function printInvoice() {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>${invoice.invoiceNumber}</title>
      <style>
        body { font-family: sans-serif; max-width: 700px; margin: 40px auto; color: #333; }
        h1 { border-bottom: 2px solid #4f46e5; padding-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 24px; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 24px; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; background: #dcfce7; color: #166534; }
      </style></head><body>
      <h1>Learn Platform — Invoice</h1>
      <p><strong>Invoice:</strong> ${invoice.invoiceNumber}</p>
      <p><strong>Date:</strong> ${new Date(invoice.issuedAt).toLocaleDateString()}</p>
      <p><strong>Billed to:</strong> ${invoice.studentName} (${invoice.studentEmail})</p>
      <table>
        <tr><th>Item</th><th>Amount</th></tr>
        <tr><td>${invoice.courseTitle}</td><td>NGN ${invoice.amount.toLocaleString()}</td></tr>
      </table>
      <p class="total">Total: NGN ${invoice.amount.toLocaleString()}</p>
      <p class="badge">${invoice.status.toUpperCase()}</p>
      <p style="margin-top: 32px; font-size: 12px; color: #666;">
        Payment reference: ${invoice.reference}<br>
        Powered by Learn Platform · Paystack secured
      </p>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 300);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Invoice {invoice.invoiceNumber}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">✕</button>
        </div>
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between border-b pb-1"><dt className="text-gray-500">Course</dt><dd>{invoice.courseTitle}</dd></div>
          <div className="flex justify-between border-b pb-1"><dt className="text-gray-500">Billed to</dt><dd>{invoice.studentName}</dd></div>
          <div className="flex justify-between border-b pb-1"><dt className="text-gray-500">Email</dt><dd>{invoice.studentEmail}</dd></div>
          <div className="flex justify-between border-b pb-1"><dt className="text-gray-500">Issued</dt><dd>{new Date(invoice.issuedAt).toLocaleDateString()}</dd></div>
          <div className="flex justify-between border-b pb-1"><dt className="text-gray-500">Reference</dt><dd className="font-mono text-xs">{invoice.reference}</dd></div>
          <div className="flex justify-between border-b pb-1"><dt className="text-gray-500">Amount</dt><dd className="font-bold">NGN {invoice.amount.toLocaleString()}</dd></div>
          <div className="flex justify-between border-b pb-1"><dt className="text-gray-500">Status</dt><dd>{invoice.status.replace("_", " ")}</dd></div>
          {invoice.refundedAmount > 0 && (
            <div className="flex justify-between border-b pb-1"><dt className="text-gray-500">Refunded</dt><dd className="text-red-600">NGN {invoice.refundedAmount.toLocaleString()}</dd></div>
          )}
        </dl>
        <button onClick={printInvoice} className="mt-6 w-full rounded bg-brand-600 py-2.5 text-white hover:bg-brand-700">
          Print / Save PDF
        </button>
      </div>
    </div>
  );
}
