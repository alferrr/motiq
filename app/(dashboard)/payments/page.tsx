"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import Modal from "@/components/shared/Modal";
import {
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaSyncAlt,
} from "react-icons/fa";
import PageHeader from "@/components/shared/PageHeader";

type Payment = {
  Payment_ID: number;
  Invoice_ID: number;
  PaymentMethod: string;
  AmountPaid: string;
  PaymentDate: string;
  ReferenceNumber: string | null;
  KasaPaymentId: string | null;
  Status: string;
  RefundedAmount: string;
  customerName: string;
  Make: string;
  Model: string;
  PlateNumber: string;
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

const PAYMENT_STATUS_LIGHT: Record<string, { color: string; bg: string }> = {
  requires_payment_method: { color: "#f59e0b", bg: "#fef3c7" },
  processing: { color: "#3b82f6", bg: "#dbeafe" },
  succeeded: { color: "#10b981", bg: "#d1fae5" },
  failed: { color: "#ef4444", bg: "#fee2e2" },
  cancelled: { color: "#6b7280", bg: "#f3f4f6" },
  refunded: { color: "#6b7280", bg: "#f3f4f6" },
  partially_refunded: { color: "#f59e0b", bg: "#fef3c7" },
};
const PAYMENT_STATUS_DARK: Record<string, { color: string; bg: string }> = {
  requires_payment_method: { color: "#fbbf24", bg: "#fbbf2420" },
  processing: { color: "#60a5fa", bg: "#60a5fa20" },
  succeeded: { color: "#34d399", bg: "#34d39920" },
  failed: { color: "#f87171", bg: "#f8717120" },
  cancelled: { color: "#9ca3af", bg: "#9ca3af20" },
  refunded: { color: "#9ca3af", bg: "#9ca3af20" },
  partially_refunded: { color: "#fbbf24", bg: "#fbbf2420" },
};

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />;
}

function peso(n: number | string) {
  return `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}


function RefundForm({
  maxAmount,
  onSubmit,
  onCancel,
  loading,
  dark,
  muted,
}: {
  maxAmount: number;
  onSubmit: (amount?: number) => void;
  onCancel: () => void;
  loading: boolean;
  dark: boolean;
  muted: string;
}) {
  const [amount, setAmount] = useState(String(maxAmount));

  const inputCls = `w-full rounded-xl border px-4 py-2.5 text-sm bg-transparent outline-none transition-colors
    ${dark ? "border-white/10 text-white" : "border-gray-200 text-gray-900"}`;

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <p className={`text-xs ${muted}`}>Refund Amount</p>
        <input
          className={inputCls}
          type="number"
          min="0"
          max={maxAmount}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <p className={`text-[10px] ${muted}`}>Up to {peso(maxAmount)}</p>
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
          onClick={() => onSubmit(Number(amount) === maxAmount ? undefined : Number(amount))}
          disabled={loading || !Number(amount) || Number(amount) > maxAmount}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-60"
        >
          {loading ? "Refunding…" : "Refund"}
        </button>
      </div>
    </div>
  );
}

function PaymentsPageInner() {
  const { dark, primaryColor } = useTheme();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState("");

  const limit = 10;
  const totalPages = Math.ceil(total / limit);

  const innerBg = dark ? "bg-[#0d0f13]" : "bg-[#f8f9fb]";
  const card = dark ? "bg-[#111318] border-white/5" : "bg-white border-gray-100";
  const text = dark ? "text-white" : "text-gray-900";
  const muted = dark ? "text-gray-500" : "text-gray-400";
  const divide = dark ? "divide-white/5 border-white/5" : "divide-gray-100 border-gray-100";
  const border = dark ? "border-white/5" : "border-gray-100";
  const thBg = dark ? "bg-white/3" : "bg-gray-50";
  const hoverRow = dark ? "hover:bg-white/3" : "hover:bg-gray-50";
  const STATUS = dark ? PAYMENT_STATUS_DARK : PAYMENT_STATUS_LIGHT;

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/v1/payments", {
        params: { search, page, status: statusFilter, method: methodFilter },
      });
      setPayments(res.data.payments);
      setTotal(res.data.total);
    } catch {
      setError("Failed to load payments.");
    } finally {
      setLoading(false);
    }
  }, [search, page, statusFilter, methodFilter]);

  const handleRefresh = async (id: number) => {
    setRefreshingId(id);
    setError("");
    try {
      await axios.post(`/api/v1/payments/${id}/refresh`);
      await fetchPayments();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to refresh status.");
    } finally {
      setRefreshingId(null);
    }
  };

  const handleRefund = async (amount?: number) => {
    if (!refundTarget) return;
    setRefundLoading(true);
    setRefundError("");
    try {
      await axios.post(`/api/v1/payments/${refundTarget.Payment_ID}/refund`, {
        amount,
      });
      setRefundTarget(null);
      fetchPayments();
    } catch (err: any) {
      setRefundError(err.response?.data?.error ?? "Failed to refund payment.");
    } finally {
      setRefundLoading(false);
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
    fetchPayments();
  }, [fetchPayments]);

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
    <div suppressHydrationWarning className={`flex-1 flex flex-col min-h-0 ${innerBg} ${text}`}>
      <PageHeader title="Payments" />

      <main className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto min-h-0 [&>*]:shrink-0">
        {error && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${dark ? "bg-red-900/20 border-red-800/50 text-red-400" : "bg-red-50 border-red-200 text-red-600"}`}
          >
            {error}
          </div>
        )}

        <div>
          <h1 className={`text-lg font-semibold ${text}`}>Payments</h1>
          <p className={`text-sm mt-0.5 ${muted}`}>
            {total} payment{total !== 1 ? "s" : ""} total
          </p>
        </div>

        <div className={`rounded-2xl border overflow-hidden ${card}`}>
          <div className={`flex items-center justify-between gap-3 px-5 py-3 border-b flex-wrap ${border}`}>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-1 min-w-[140px] sm:hidden">
                <FaSearch size={11} className={muted} />
                <input
                  className={`bg-transparent outline-none w-full text-xs ${dark ? "text-gray-300 placeholder:text-gray-600" : "text-gray-700 placeholder:text-gray-400"}`}
                  placeholder="Search payments..."
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
                {Object.entries(PAYMENT_STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                className={`text-xs rounded-lg border px-2.5 py-1.5 bg-transparent outline-none ${dark ? "border-white/10 text-gray-300" : "border-gray-200 text-gray-600"}`}
                value={methodFilter}
                onChange={(e) => {
                  setMethodFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All methods</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="GCash">GCash</option>
                <option value="Maya">Maya</option>
                <option value="QR Ph">QR Ph</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center border disabled:opacity-30 ${dark ? "border-white/10 text-gray-400 hover:text-white" : "border-gray-200 text-gray-400 hover:text-gray-700"}`}
                >
                  <FaChevronLeft size={10} />
                </button>
                <span className={`text-xs ${muted}`}>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center border disabled:opacity-30 ${dark ? "border-white/10 text-gray-400 hover:text-white" : "border-gray-200 text-gray-400 hover:text-gray-700"}`}
                >
                  <FaChevronRight size={10} />
                </button>
              </div>
            )}
          </div>

          <table className="w-full text-xs">
            <thead>
              <tr className={thBg}>
                <th className={`text-left px-5 py-3 font-medium ${muted}`}>Customer</th>
                <th className={`text-left px-5 py-3 font-medium ${muted} hidden sm:table-cell`}>
                  Invoice
                </th>
                <th className={`text-left px-5 py-3 font-medium ${muted}`}>Method</th>
                <th className={`text-left px-5 py-3 font-medium ${muted}`}>Amount</th>
                <th className={`text-left px-5 py-3 font-medium ${muted}`}>Status</th>
                <th className={`text-left px-5 py-3 font-medium ${muted} hidden lg:table-cell`}>
                  Date
                </th>
                <th className={`text-left px-5 py-3 font-medium ${muted}`}></th>
              </tr>
            </thead>
            <tbody className={`divide-y ${divide}`}>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-5 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !payments.length ? (
                <tr>
                  <td colSpan={7} className={`px-5 py-12 text-center ${muted}`}>
                    No payments recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const s = STATUS[p.Status] ?? STATUS["succeeded"];
                  const canRefresh =
                    p.KasaPaymentId &&
                    !["succeeded", "failed", "cancelled", "refunded"].includes(p.Status);
                  const canRefund = p.KasaPaymentId && p.Status === "succeeded";
                  return (
                    <tr key={p.Payment_ID} className={`transition-colors ${hoverRow}`}>
                      <td className="px-5 py-3">
                        <span className={`font-medium ${text}`}>{p.customerName}</span>
                        <p className={`text-[10px] ${muted}`}>
                          {p.Make} {p.Model} · {p.PlateNumber}
                        </p>
                      </td>
                      <td className={`px-5 py-3 ${muted} hidden sm:table-cell`}>
                        #{p.Invoice_ID}
                      </td>
                      <td className={`px-5 py-3 ${text}`}>{p.PaymentMethod}</td>
                      <td className={`px-5 py-3 ${text}`}>{peso(p.AmountPaid)}</td>
                      <td className="px-5 py-3">
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{ color: s.color, backgroundColor: s.bg }}
                        >
                          {PAYMENT_STATUS_LABEL[p.Status] ?? p.Status}
                        </span>
                      </td>
                      <td className={`px-5 py-3 ${muted} hidden lg:table-cell`}>
                        {new Date(p.PaymentDate).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {canRefresh && (
                            <button
                              onClick={() => handleRefresh(p.Payment_ID)}
                              disabled={refreshingId === p.Payment_ID}
                              className="flex items-center gap-1"
                              style={{ color: primaryColor }}
                              title="Refresh status"
                            >
                              <FaSyncAlt
                                size={10}
                                className={refreshingId === p.Payment_ID ? "animate-spin" : ""}
                              />
                            </button>
                          )}
                          {canRefund && (
                            <button
                              onClick={() => {
                                setRefundTarget(p);
                                setRefundError("");
                              }}
                              className="text-[10px] text-red-400"
                            >
                              Refund
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {refundTarget && (
        <Modal
          title="Refund Payment"
          onClose={() => setRefundTarget(null)}
          card={card}
          text={text}
          border={border}
        >
          {refundError && (
            <p className="px-5 pt-4 text-xs text-red-400">{refundError}</p>
          )}
          <RefundForm
            maxAmount={
              Number(refundTarget.AmountPaid) - Number(refundTarget.RefundedAmount)
            }
            onSubmit={handleRefund}
            onCancel={() => setRefundTarget(null)}
            loading={refundLoading}
            dark={dark}
            muted={muted}
          />
        </Modal>
      )}
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={null}>
      <PaymentsPageInner />
    </Suspense>
  );
}
