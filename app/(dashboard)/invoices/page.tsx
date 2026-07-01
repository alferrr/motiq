"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useSearchParams } from "next/navigation";
import Drawer from "@/components/shared/Drawer";
import axios from "axios";
import {
  FaSearch,
  FaPlus,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaCopy,
  FaCheck,
  FaSyncAlt,
} from "react-icons/fa";
import PageHeader from "@/components/shared/PageHeader";

type Invoice = {
  Invoice_ID: number;
  DateIssued: string;
  TotalAmount: string;
  Status: "Unpaid" | "Partially Paid" | "Paid";
  Job_ID: number;
  jobStatus: string;
  customerName: string;
  Make: string;
  Model: string;
  PlateNumber: string;
  paidNet: string;
};

type EligibleJob = {
  Job_ID: number;
  Status: string;
  JobDate: string;
  customerName: string;
  Make: string;
  Model: string;
  PlateNumber: string;
};

type Payment = {
  Payment_ID: number;
  PaymentMethod: string;
  AmountPaid: string;
  PaymentDate: string;
  ReferenceNumber: string | null;
  KasaPaymentId: string | null;
  Status: string;
  RefundedAmount: string;
};

type InvoiceDetail = {
  invoice: {
    Invoice_ID: number;
    DateIssued: string;
    TotalAmount: string;
    Status: string;
    Job_ID: number;
    jobStatus: string;
    ReportedIssue: string | null;
    customerName: string;
    customerContact: string;
    Make: string;
    Model: string;
    Year: number;
    PlateNumber: string;
  };
  services: { Service_ID: number; ServiceName: string; LaborRate: string }[];
  parts: {
    Part_ID: number;
    PartName: string;
    QuantityUsed: number;
    UnitPrice: string;
  }[];
  payments: Payment[];
  paidNet: number;
  balance: number;
};

const INVOICE_STATUS_LIGHT: Record<string, { color: string; bg: string }> = {
  Unpaid: { color: "#ef4444", bg: "#fee2e2" },
  "Partially Paid": { color: "#f59e0b", bg: "#fef3c7" },
  Paid: { color: "#10b981", bg: "#d1fae5" },
};
const INVOICE_STATUS_DARK: Record<string, { color: string; bg: string }> = {
  Unpaid: { color: "#f87171", bg: "#f8717120" },
  "Partially Paid": { color: "#fbbf24", bg: "#fbbf2420" },
  Paid: { color: "#34d399", bg: "#34d39920" },
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  requires_payment_method: "Awaiting confirmation",
  processing: "Processing",
  succeeded: "Succeeded",
  failed: "Failed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
};

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />;
}

function peso(n: number | string) {
  return `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

function Modal({
  title,
  onClose,
  children,
  card,
  text,
  border,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  card: string;
  text: string;
  border: string;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);
  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 transition-opacity duration-200"
      style={{
        opacity: visible ? 1 : 0,
        backdropFilter: visible ? "blur(4px)" : "none",
      }}
    >
      <div
        className={`w-full max-w-md rounded-2xl border shadow-2xl transition-all duration-200 ${card}`}
        style={{
          transform: visible ? "scale(1)" : "scale(0.95)",
          opacity: visible ? 1 : 0,
        }}
      >
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${border}`}
        >
          <p className={`text-sm font-semibold ${text}`}>{title}</p>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FaTimes size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CreateInvoiceModal({
  eligibleJobs,
  onSubmit,
  onCancel,
  loading,
  serverError,
  dark,
  text,
  muted,
  primary,
}: {
  eligibleJobs: EligibleJob[];
  onSubmit: (jobId: number) => void;
  onCancel: () => void;
  loading: boolean;
  serverError: string;
  dark: boolean;
  text: string;
  muted: string;
  primary: string;
}) {
  const [jobId, setJobId] = useState<number | "">("");
  const [preview, setPreview] = useState<{ totalLabor: number; totalParts: number } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!jobId) {
      setPreview(null);
      return;
    }
    setPreviewLoading(true);
    axios
      .get(`/api/v1/jobs/${jobId}`)
      .then((res) =>
        setPreview({
          totalLabor: res.data.totalLabor,
          totalParts: res.data.totalParts,
        }),
      )
      .catch(() => setPreview(null))
      .finally(() => setPreviewLoading(false));
  }, [jobId]);

  const inputCls = `w-full rounded-xl border px-4 py-2.5 text-sm bg-transparent outline-none transition-colors
    ${dark ? "border-white/10 text-white" : "border-gray-200 text-gray-900"}`;

  return (
    <div className="p-5 flex flex-col gap-4">
      {serverError && <p className="text-red-400 text-xs">{serverError}</p>}
      {!eligibleJobs.length ? (
        <p className={`text-xs ${muted}`}>
          No completed jobs are available to invoice. Mark a job order as
          Completed or Released first.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <p className={`text-xs ${muted}`}>Job Order</p>
            <select
              className={inputCls}
              value={jobId}
              onChange={(e) => setJobId(Number(e.target.value))}
            >
              <option value="">Select a completed job…</option>
              {eligibleJobs.map((j) => (
                <option key={j.Job_ID} value={j.Job_ID}>
                  #{j.Job_ID} — {j.customerName} — {j.Make} {j.Model} (
                  {j.PlateNumber})
                </option>
              ))}
            </select>
          </div>

          {jobId && (
            <div
              className={`rounded-xl border px-4 py-3 text-xs flex flex-col gap-1.5 ${dark ? "border-white/10" : "border-gray-200"}`}
            >
              {previewLoading || !preview ? (
                <Skeleton className="h-4 w-1/2" />
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className={muted}>Labor</span>
                    <span className={text}>{peso(preview.totalLabor)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={muted}>Parts</span>
                    <span className={text}>{peso(preview.totalParts)}</span>
                  </div>
                  <div
                    className={`flex justify-between pt-1.5 border-t font-semibold ${dark ? "border-white/10" : "border-gray-200"}`}
                  >
                    <span className={text}>Total</span>
                    <span style={{ color: primary }}>
                      {peso(preview.totalLabor + preview.totalParts)}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      <div className="flex gap-3 pt-1">
        <button
          onClick={onCancel}
          className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors
            ${dark ? "border-white/10 text-gray-400 hover:text-white" : "border-gray-200 text-gray-500 hover:text-gray-900"}`}
        >
          Cancel
        </button>
        <button
          onClick={() => jobId && onSubmit(jobId)}
          disabled={loading || !jobId}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity disabled:opacity-60"
          style={{ backgroundColor: primary }}
        >
          {loading ? "Creating…" : "Create Invoice"}
        </button>
      </div>
    </div>
  );
}

function ManualPaymentForm({
  balance,
  onSubmit,
  onCancel,
  loading,
  dark,
  muted,
  primary,
}: {
  balance: number;
  onSubmit: (data: { method: "Cash" | "Card"; amount: number; referenceNumber?: string }) => void;
  onCancel: () => void;
  loading: boolean;
  dark: boolean;
  muted: string;
  primary: string;
}) {
  const [method, setMethod] = useState<"Cash" | "Card">("Cash");
  const [amount, setAmount] = useState(String(balance));
  const [referenceNumber, setReferenceNumber] = useState("");

  const inputCls = `w-full rounded-xl border px-4 py-2.5 text-sm bg-transparent outline-none transition-colors
    ${dark ? "border-white/10 text-white" : "border-gray-200 text-gray-900"}`;

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <p className={`text-xs ${muted}`}>Method</p>
        <select
          className={inputCls}
          value={method}
          onChange={(e) => setMethod(e.target.value as "Cash" | "Card")}
        >
          <option value="Cash">Cash</option>
          <option value="Card">Card</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className={`text-xs ${muted}`}>Amount</p>
        <input
          className={inputCls}
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className={`text-xs ${muted}`}>
          Reference <span className={muted}>(optional)</span>
        </p>
        <input
          className={inputCls}
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
        />
      </div>
      <div className="flex gap-3 pt-1">
        <button
          onClick={onCancel}
          className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors
            ${dark ? "border-white/10 text-gray-400 hover:text-white" : "border-gray-200 text-gray-500 hover:text-gray-900"}`}
        >
          Cancel
        </button>
        <button
          onClick={() =>
            onSubmit({
              method,
              amount: Number(amount),
              referenceNumber: referenceNumber || undefined,
            })
          }
          disabled={loading || !Number(amount)}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity disabled:opacity-60"
          style={{ backgroundColor: primary }}
        >
          {loading ? "Saving…" : "Record Payment"}
        </button>
      </div>
    </div>
  );
}

function InvoiceDrawerContent({
  invoiceId,
  onDeleted,
  onChanged,
  dark,
  text,
  muted,
  border,
  divide,
  primary,
}: {
  invoiceId: number;
  onDeleted: () => void;
  onChanged: () => void;
  dark: boolean;
  text: string;
  muted: string;
  border: string;
  divide: string;
  primary: string;
}) {
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showManualPayment, setShowManualPayment] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const fetchDetail = useCallback(() => {
    setLoading(true);
    return axios
      .get(`/api/v1/invoices/${invoiceId}`)
      .then((res) => setDetail(res.data))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  useEffect(() => {
    setDetail(null);
    setCheckoutUrl("");
    fetchDetail();
  }, [fetchDetail]);

  const STATUS = dark ? INVOICE_STATUS_DARK : INVOICE_STATUS_LIGHT;

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setActionError("");
    try {
      const res = await axios.post(`/api/v1/invoices/${invoiceId}/checkout`);
      setCheckoutUrl(res.data.url);
    } catch (err: any) {
      setActionError(err.response?.data?.error ?? "Failed to create payment link.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(checkoutUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualPayment = async (data: {
    method: "Cash" | "Card";
    amount: number;
    referenceNumber?: string;
  }) => {
    setFormLoading(true);
    setActionError("");
    try {
      await axios.post(`/api/v1/invoices/${invoiceId}/payments`, data);
      setShowManualPayment(false);
      await fetchDetail();
      onChanged();
    } catch (err: any) {
      setActionError(err.response?.data?.error ?? "Failed to record payment.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleRefresh = async (paymentId: number) => {
    setActionError("");
    try {
      await axios.post(`/api/v1/payments/${paymentId}/refresh`);
      await fetchDetail();
      onChanged();
    } catch (err: any) {
      setActionError(err.response?.data?.error ?? "Failed to refresh status.");
    }
  };

  const handleRefund = async (paymentId: number) => {
    setActionError("");
    try {
      await axios.post(`/api/v1/payments/${paymentId}/refund`);
      await fetchDetail();
      onChanged();
    } catch (err: any) {
      setActionError(err.response?.data?.error ?? "Failed to refund payment.");
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/v1/invoices/${invoiceId}`);
      onDeleted();
    } catch (err: any) {
      setActionError(err.response?.data?.error ?? "Failed to delete invoice.");
    }
  };

  if (loading)
    return (
      <div className="p-5 flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );

  if (!detail)
    return <p className={`p-5 text-xs ${muted}`}>Failed to load invoice.</p>;

  const { invoice, services, parts, payments, balance } = detail;
  const s = STATUS[invoice.Status] ?? STATUS["Unpaid"];
  const canDelete = invoice.Status === "Unpaid" && payments.length === 0;

  return (
    <>
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className={`text-sm font-semibold ${text}`}>
            Invoice #{invoice.Invoice_ID}
          </p>
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ color: s.color, backgroundColor: s.bg }}
          >
            {invoice.Status}
          </span>
        </div>
        <div>
          <p className={`text-sm font-medium ${text}`}>{invoice.customerName}</p>
          <p className={`text-xs ${muted}`}>
            {invoice.Make} {invoice.Model} {invoice.Year} · {invoice.PlateNumber}
          </p>
        </div>
        {actionError && <p className="text-red-400 text-xs">{actionError}</p>}
      </div>

      <div className={`border-t ${border}`}>
        <p className={`px-5 py-3 text-xs font-semibold ${text}`}>Line Items</p>
        <div className={`divide-y ${divide}`}>
          {services.map((sv) => (
            <div
              key={`s-${sv.Service_ID}`}
              className="px-5 py-2.5 flex items-center justify-between text-xs"
            >
              <span className={muted}>{sv.ServiceName}</span>
              <span className={text}>{peso(sv.LaborRate)}</span>
            </div>
          ))}
          {parts.map((p) => (
            <div
              key={`p-${p.Part_ID}`}
              className="px-5 py-2.5 flex items-center justify-between text-xs"
            >
              <span className={muted}>
                {p.PartName} × {p.QuantityUsed}
              </span>
              <span className={text}>
                {peso(Number(p.UnitPrice) * p.QuantityUsed)}
              </span>
            </div>
          ))}
          {!services.length && !parts.length && (
            <p className={`px-5 py-4 text-xs ${muted}`}>No line items.</p>
          )}
        </div>
        <div className={`px-5 py-3 border-t ${border} flex flex-col gap-1`}>
          <div className="flex justify-between text-xs">
            <span className={muted}>Total</span>
            <span className={text}>{peso(invoice.TotalAmount)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className={muted}>Paid</span>
            <span className={text}>{peso(detail.paidNet)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold">
            <span className={text}>Balance</span>
            <span style={{ color: balance > 0 ? "#ef4444" : "#10b981" }}>
              {peso(balance)}
            </span>
          </div>
        </div>
      </div>

      <div className={`border-t ${border} p-5 flex flex-col gap-3`}>
        {balance > 0 && (
          <>
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-opacity disabled:opacity-60"
              style={{ backgroundColor: primary }}
            >
              {checkoutLoading ? "Generating…" : "Generate Kasa Payment Link"}
            </button>
            {checkoutUrl && (
              <div
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs ${dark ? "border-white/10" : "border-gray-200"}`}
              >
                <span className={`truncate flex-1 ${muted}`}>{checkoutUrl}</span>
                <button
                  onClick={handleCopy}
                  className="shrink-0"
                  style={{ color: primary }}
                >
                  {copied ? <FaCheck size={12} /> : <FaCopy size={12} />}
                </button>
              </div>
            )}
            <button
              onClick={() => setShowManualPayment(true)}
              className={`w-full py-2.5 rounded-xl border text-sm font-medium transition-colors
                ${dark ? "border-white/10 text-gray-300 hover:text-white" : "border-gray-200 text-gray-600 hover:text-gray-900"}`}
            >
              Record Manual Payment
            </button>
          </>
        )}
        {canDelete && (
          <button
            onClick={handleDelete}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
          >
            Delete Invoice
          </button>
        )}
      </div>

      {showManualPayment && (
        <div className={`border-t ${border}`}>
          <ManualPaymentForm
            balance={balance}
            onSubmit={handleManualPayment}
            onCancel={() => setShowManualPayment(false)}
            loading={formLoading}
            dark={dark}
            muted={muted}
            primary={primary}
          />
        </div>
      )}

      <div className={`border-t ${border}`}>
        <p className={`px-5 py-3 text-xs font-semibold ${text}`}>
          Payment History{" "}
          <span className={`font-normal ${muted}`}>({payments.length})</span>
        </p>
        <div className={`divide-y ${divide}`}>
          {!payments.length ? (
            <p className={`px-5 py-4 text-xs ${muted}`}>No payments yet.</p>
          ) : (
            payments.map((p) => (
              <div key={p.Payment_ID} className="px-5 py-3 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${text}`}>
                    {p.PaymentMethod} · {peso(p.AmountPaid)}
                  </span>
                  <span className={`text-[10px] ${muted}`}>
                    {PAYMENT_STATUS_LABEL[p.Status] ?? p.Status}
                  </span>
                </div>
                <p className={`text-[10px] ${muted}`}>
                  {new Date(p.PaymentDate).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {p.ReferenceNumber ? ` · ${p.ReferenceNumber}` : ""}
                </p>
                {p.KasaPaymentId && (
                  <div className="flex gap-3 mt-1">
                    {!["succeeded", "failed", "cancelled", "refunded"].includes(
                      p.Status,
                    ) && (
                      <button
                        onClick={() => handleRefresh(p.Payment_ID)}
                        className="flex items-center gap-1 text-[10px]"
                        style={{ color: primary }}
                      >
                        <FaSyncAlt size={9} /> Refresh status
                      </button>
                    )}
                    {p.Status === "succeeded" && (
                      <button
                        onClick={() => handleRefund(p.Payment_ID)}
                        className="text-[10px] text-red-400"
                      >
                        Refund
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function InvoicesPageInner() {
  const { dark, primaryColor } = useTheme();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [eligibleJobs, setEligibleJobs] = useState<EligibleJob[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [drawerTarget, setDrawerTarget] = useState<number | null>(null);

  const limit = 10;
  const totalPages = Math.ceil(total / limit);
  const isDrawerOpen = drawerTarget !== null;

  const innerBg = dark ? "bg-[#0d0f13]" : "bg-[#f8f9fb]";
  const card = dark ? "bg-[#111318] border-white/5" : "bg-white border-gray-100";
  const text = dark ? "text-white" : "text-gray-900";
  const muted = dark ? "text-gray-500" : "text-gray-400";
  const divide = dark ? "divide-white/5 border-white/5" : "divide-gray-100 border-gray-100";
  const border = dark ? "border-white/5" : "border-gray-100";
  const thBg = dark ? "bg-white/3" : "bg-gray-50";
  const hoverRow = dark ? "hover:bg-white/3" : "hover:bg-gray-50";
  const STATUS = dark ? INVOICE_STATUS_DARK : INVOICE_STATUS_LIGHT;

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/v1/invoices", {
        params: { search, page, status: statusFilter },
      });
      setInvoices(res.data.invoices);
      setTotal(res.data.total);
      setEligibleJobs(res.data.eligibleJobs);
    } catch {
      setError("Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  }, [search, page, statusFilter]);

  const handleCreate = async (jobId: number) => {
    setCreateLoading(true);
    setCreateError("");
    try {
      await axios.post("/api/v1/invoices", { jobId });
      setShowCreate(false);
      fetchInvoices();
    } catch (err: any) {
      setCreateError(err.response?.data?.error ?? "Failed to create invoice.");
    } finally {
      setCreateLoading(false);
    }
  };

  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.get("search");
    if (q) {
      setSearchInput(q);
      setSearch(q);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const handler = (e: Event) => {
      const value = (e as CustomEvent).detail as string;
      setSearchInput(value);
    };
    window.addEventListener("page-search", handler);
    return () => window.removeEventListener("page-search", handler);
  }, []);

  return (
    <div suppressHydrationWarning className="flex-1 flex relative">
      <div
        className={`flex-1 flex flex-col ${innerBg} ${text} transition-[filter] duration-300`}
        style={{ filter: isDrawerOpen ? "blur(3px)" : "none" }}
      >
        <PageHeader title="Invoices" />

        <main className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto">
          {error && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${dark ? "bg-red-900/20 border-red-800/50 text-red-400" : "bg-red-50 border-red-200 text-red-600"}`}
            >
              {error}
            </div>
          )}

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className={`text-lg font-semibold ${text}`}>Invoices</h1>
              <p className={`text-sm mt-0.5 ${muted}`}>
                {total} invoice{total !== 1 ? "s" : ""} total
              </p>
            </div>
            <button
              onClick={() => {
                setShowCreate(true);
                setCreateError("");
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              <FaPlus size={11} />
              Create Invoice
            </button>
          </div>

          <div className={`rounded-2xl border overflow-hidden ${card}`}>
            <div
              className={`flex items-center gap-3 px-5 py-3 border-b flex-wrap ${border}`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-[140px] sm:hidden">
                <FaSearch size={11} className={muted} />
                <input
                  className={`bg-transparent outline-none w-full text-xs ${dark ? "text-gray-300 placeholder:text-gray-600" : "text-gray-700 placeholder:text-gray-400"}`}
                  placeholder="Search invoices..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
              <select
                className={`text-xs rounded-lg border px-2.5 py-1.5 bg-transparent outline-none ${dark ? "border-white/10 text-gray-300" : "border-gray-200 text-gray-600"}`}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All statuses</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            <table className="w-full text-xs">
              <thead>
                <tr className={thBg}>
                  <th className={`text-left px-5 py-3 font-medium ${muted}`}>
                    Customer
                  </th>
                  <th
                    className={`text-left px-5 py-3 font-medium ${muted} hidden sm:table-cell`}
                  >
                    Vehicle
                  </th>
                  <th className={`text-left px-5 py-3 font-medium ${muted}`}>
                    Total
                  </th>
                  <th
                    className={`text-left px-5 py-3 font-medium ${muted} hidden md:table-cell`}
                  >
                    Balance
                  </th>
                  <th className={`text-left px-5 py-3 font-medium ${muted}`}>
                    Status
                  </th>
                  <th
                    className={`text-left px-5 py-3 font-medium ${muted} hidden lg:table-cell`}
                  >
                    Issued
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${divide}`}>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-5 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : !invoices.length ? (
                  <tr>
                    <td colSpan={6} className={`px-5 py-12 text-center ${muted}`}>
                      {search
                        ? `No invoices matching "${search}"`
                        : "No invoices yet. Create one from a completed job."}
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const s = STATUS[inv.Status] ?? STATUS["Unpaid"];
                    const balance = Number(inv.TotalAmount) - Number(inv.paidNet);
                    return (
                      <tr
                        key={inv.Invoice_ID}
                        onClick={() => setDrawerTarget(inv.Invoice_ID)}
                        className={`cursor-pointer transition-colors ${hoverRow}`}
                      >
                        <td className="px-5 py-3">
                          <span className={`font-medium ${text}`}>
                            {inv.customerName}
                          </span>
                          <p className={`text-[10px] ${muted}`}>
                            Invoice #{inv.Invoice_ID}
                          </p>
                        </td>
                        <td className={`px-5 py-3 ${muted} hidden sm:table-cell`}>
                          {inv.Make} {inv.Model} · {inv.PlateNumber}
                        </td>
                        <td className={`px-5 py-3 ${text}`}>
                          {peso(inv.TotalAmount)}
                        </td>
                        <td className={`px-5 py-3 hidden md:table-cell`}>
                          <span style={{ color: balance > 0 ? "#ef4444" : "#10b981" }}>
                            {peso(balance)}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                            style={{ color: s.color, backgroundColor: s.bg }}
                          >
                            {inv.Status}
                          </span>
                        </td>
                        <td className={`px-5 py-3 ${muted} hidden lg:table-cell`}>
                          {new Date(inv.DateIssued).toLocaleDateString("en-PH", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div
                className={`flex items-center justify-between px-5 py-3 border-t ${border}`}
              >
                <p className={`text-xs ${muted}`}>
                  Showing {(page - 1) * limit + 1}–
                  {Math.min(page * limit, total)} of {total}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center border disabled:opacity-30 ${dark ? "border-white/10 text-gray-400 hover:text-white" : "border-gray-200 text-gray-400 hover:text-gray-700"}`}
                  >
                    <FaChevronLeft size={10} />
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className="w-7 h-7 rounded-lg text-xs font-medium transition-colors"
                      style={
                        page === i + 1
                          ? { backgroundColor: primaryColor, color: "#fff" }
                          : { color: dark ? "#6b7280" : "#9ca3af" }
                      }
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center border disabled:opacity-30 ${dark ? "border-white/10 text-gray-400 hover:text-white" : "border-gray-200 text-gray-400 hover:text-gray-700"}`}
                  >
                    <FaChevronRight size={10} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        {showCreate && (
          <Modal
            title="Create Invoice"
            onClose={() => setShowCreate(false)}
            card={card}
            text={text}
            border={border}
          >
            <CreateInvoiceModal
              eligibleJobs={eligibleJobs}
              onSubmit={handleCreate}
              onCancel={() => setShowCreate(false)}
              loading={createLoading}
              serverError={createError}
              dark={dark}
              text={text}
              muted={muted}
              primary={primaryColor}
            />
          </Modal>
        )}
      </div>

      <Drawer
        open={isDrawerOpen}
        onClose={() => setDrawerTarget(null)}
        title="Invoice Detail"
        dark={dark}
        card={card}
        text={text}
        border={border}
      >
        {drawerTarget !== null && (
          <InvoiceDrawerContent
            invoiceId={drawerTarget}
            onDeleted={() => {
              setDrawerTarget(null);
              fetchInvoices();
            }}
            onChanged={fetchInvoices}
            dark={dark}
            text={text}
            muted={muted}
            border={border}
            divide={divide}
            primary={primaryColor}
          />
        )}
      </Drawer>
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={null}>
      <InvoicesPageInner />
    </Suspense>
  );
}
