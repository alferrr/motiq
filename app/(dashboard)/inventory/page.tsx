"use client";

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useSidebar } from "@/context/SidebarContext";

import Drawer from "@/components/shared/Drawer";
import Modal from "@/components/shared/Modal";
import axios from "axios";
import {
  FaBars,
  FaBell,
  FaMoon,
  FaSun,
  FaSearch,
  FaPlus,
  FaChevronLeft,
  FaChevronRight,
  FaMinus,
} from "react-icons/fa";
import PageHeader from "@/components/shared/PageHeader";

type Part = {
  Part_ID: number;
  PartName: string;
  SKU: string;
  UnitPrice: number;
  StockQuantity: number;
  MinimumStock: number;
};

type FormState = {
  partName: string;
  sku: string;
  unitPrice: string;
  stockQuantity: string;
  minimumStock: string;
};
type FormErrors = Partial<Record<keyof FormState, string>>;

function stockStatus(
  qty: number,
  min: number,
): { label: string; color: string; bg: string } {
  if (qty === 0)
    return { label: "Out of Stock", color: "#ef4444", bg: "#ef444420" };
  if (qty <= min)
    return { label: "Low Stock", color: "#f59e0b", bg: "#f59e0b20" };
  return { label: "In Stock", color: "#10b981", bg: "#10b98120" };
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />;
}


function PartForm({
  initial,
  onSubmit,
  onCancel,
  loading,
  dark,
  text,
  muted,
  border,
  primary,
}: {
  initial?: Partial<FormState>;
  onSubmit: (data: FormState) => void;
  onCancel: () => void;
  loading: boolean;
  dark: boolean;
  text: string;
  muted: string;
  border: string;
  primary: string;
}) {
  const [form, setForm] = useState<FormState>({
    partName: "",
    sku: "",
    unitPrice: "",
    stockQuantity: "",
    minimumStock: "0",
    ...initial,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const inputCls = `w-full rounded-xl border px-4 py-2.5 text-sm bg-transparent outline-none transition-colors
    ${dark ? "border-white/10 text-white placeholder:text-gray-600" : "border-gray-200 text-gray-900 placeholder:text-gray-400"}`;

  const set =
    (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((p) => ({ ...p, [key]: e.target.value }));
      setErrors((p) => ({ ...p, [key]: undefined }));
    };

  const validate = () => {
    const e: FormErrors = {};
    if (!form.partName.trim()) e.partName = "Part name is required";
    if (!form.unitPrice) e.unitPrice = "Unit price is required";
    else if (isNaN(Number(form.unitPrice)) || Number(form.unitPrice) < 0)
      e.unitPrice = "Enter a valid price";
    if (form.stockQuantity && isNaN(Number(form.stockQuantity)))
      e.stockQuantity = "Must be a number";
    setErrors(e);
    return !Object.keys(e).length;
  };

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <p className={`text-xs ${muted}`}>Part Name</p>
        <input
          className={inputCls}
          placeholder="Engine Oil 10W40"
          value={form.partName}
          onChange={set("partName")}
        />
        {errors.partName && (
          <p className="text-red-400 text-xs">{errors.partName}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <p className={`text-xs ${muted}`}>
          SKU <span className={muted}>(optional)</span>
        </p>
        <input
          className={inputCls}
          placeholder="OIL-10W40-001"
          value={form.sku}
          onChange={set("sku")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <p className={`text-xs ${muted}`}>Unit Price (₱)</p>
          <input
            className={inputCls}
            type="number"
            min="0"
            step="0.01"
            placeholder="250.00"
            value={form.unitPrice}
            onChange={set("unitPrice")}
          />
          {errors.unitPrice && (
            <p className="text-red-400 text-xs">{errors.unitPrice}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <p className={`text-xs ${muted}`}>Stock Quantity</p>
          <input
            className={inputCls}
            type="number"
            min="0"
            placeholder="0"
            value={form.stockQuantity}
            onChange={set("stockQuantity")}
          />
          {errors.stockQuantity && (
            <p className="text-red-400 text-xs">{errors.stockQuantity}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className={`text-xs ${muted}`}>Minimum Stock Level</p>
        <input
          className={inputCls}
          type="number"
          min="0"
          placeholder="5"
          value={form.minimumStock}
          onChange={set("minimumStock")}
        />
        <p className={`text-[10px] ${muted}`}>
          Alert will show when stock falls at or below this number.
        </p>
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
          onClick={() => {
            if (validate()) onSubmit(form);
          }}
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity disabled:opacity-60"
          style={{ backgroundColor: primary }}
        >
          {loading ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function AdjustStockModal({
  part,
  onClose,
  onSave,
  dark,
  text,
  muted,
  border,
  primary,
}: {
  part: Part;
  onClose: () => void;
  onSave: (adjustBy: number) => void;
  dark: boolean;
  text: string;
  muted: string;
  border: string;
  primary: string;
}) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [loading, setLoading] = useState(false);

  const parsed = Number(amount);
  const newQty =
    mode === "add"
      ? part.StockQuantity + (isNaN(parsed) ? 0 : parsed)
      : Math.max(0, part.StockQuantity - (isNaN(parsed) ? 0 : parsed));

  const inputCls = `w-full rounded-xl border px-4 py-2.5 text-sm bg-transparent outline-none transition-colors
    ${dark ? "border-white/10 text-white placeholder:text-gray-600" : "border-gray-200 text-gray-900 placeholder:text-gray-400"}`;

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* current stock */}
      <div className={`rounded-xl p-3 ${dark ? "bg-white/3" : "bg-gray-50"}`}>
        <p className={`text-[10px] ${muted}`}>Current Stock</p>
        <p className={`text-xl font-semibold mt-0.5 ${text}`}>
          {part.StockQuantity} units
        </p>
      </div>

      {/* mode toggle */}
      <div
        className={`flex p-0.5 rounded-xl border ${dark ? "border-white/5 bg-white/3" : "border-gray-200 bg-gray-100"}`}
      >
        {(["add", "remove"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors capitalize"
            style={
              mode === m
                ? {
                    backgroundColor: m === "add" ? primary : "#ef4444",
                    color: "#fff",
                  }
                : { color: dark ? "#6b7280" : "#9ca3af" }
            }
          >
            {m === "add" ? "Add Stock" : "Remove Stock"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <p className={`text-xs ${muted}`}>Amount</p>
        <input
          className={inputCls}
          type="number"
          min="1"
          placeholder="10"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
        />
      </div>

      {/* preview */}
      {amount && !isNaN(parsed) && parsed > 0 && (
        <div
          className={`rounded-xl p-3 ${dark ? "bg-white/3" : "bg-gray-50"} flex items-center justify-between`}
        >
          <p className={`text-xs ${muted}`}>New quantity</p>
          <p className={`text-sm font-bold ${text}`}>{newQty} units</p>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          onClick={onClose}
          className={`flex-1 py-2.5 rounded-xl border text-sm font-medium ${dark ? "border-white/10 text-gray-400 hover:text-white" : "border-gray-200 text-gray-500 hover:text-gray-900"}`}
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (!amount || isNaN(parsed) || parsed <= 0) return;
            setLoading(true);
            onSave(mode === "add" ? parsed : -parsed);
          }}
          disabled={loading || !amount || isNaN(parsed) || parsed <= 0}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40"
          style={{ backgroundColor: mode === "add" ? primary : "#ef4444" }}
        >
          {loading ? "Saving…" : mode === "add" ? "Add Stock" : "Remove Stock"}
        </button>
      </div>
    </div>
  );
}

function PartDrawerContent({
  part,
  onEdit,
  onDelete,
  onAdjust,
  dark,
  text,
  muted,
  border,
  primary,
}: {
  part: Part;
  onEdit: () => void;
  onDelete: () => void;
  onAdjust: () => void;
  dark: boolean;
  text: string;
  muted: string;
  border: string;
  primary: string;
}) {
  const status = stockStatus(part.StockQuantity, part.MinimumStock);
  const stockPct =
    part.MinimumStock > 0
      ? Math.min(
          100,
          Math.round((part.StockQuantity / (part.MinimumStock * 3)) * 100),
        )
      : 100;

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-semibold ${text}`}>{part.PartName}</p>
          <span
            className="text-[10px] font-medium px-2 py-1 rounded-full shrink-0"
            style={{ color: status.color, backgroundColor: status.bg }}
          >
            {status.label}
          </span>
        </div>
        {part.SKU && (
          <p className={`text-xs font-mono mt-0.5 ${muted}`}>{part.SKU}</p>
        )}
      </div>

      {/* stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className={`rounded-xl p-3 ${dark ? "bg-white/3" : "bg-gray-50"}`}>
          <p className={`text-[10px] ${muted}`}>Unit Price</p>
          <p
            className="text-sm font-semibold mt-0.5"
            style={{ color: primary }}
          >
            ₱
            {Number(part.UnitPrice).toLocaleString("en-PH", {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${dark ? "bg-white/3" : "bg-gray-50"}`}>
          <p className={`text-[10px] ${muted}`}>In Stock</p>
          <p className={`text-sm font-semibold mt-0.5 ${text}`}>
            {part.StockQuantity} units
          </p>
        </div>
        <div className={`rounded-xl p-3 ${dark ? "bg-white/3" : "bg-gray-50"}`}>
          <p className={`text-[10px] ${muted}`}>Minimum Level</p>
          <p className={`text-sm font-semibold mt-0.5 ${text}`}>
            {part.MinimumStock} units
          </p>
        </div>
        <div className={`rounded-xl p-3 ${dark ? "bg-white/3" : "bg-gray-50"}`}>
          <p className={`text-[10px] ${muted}`}>Total Value</p>
          <p className={`text-sm font-semibold mt-0.5 ${text}`}>
            ₱
            {(Number(part.UnitPrice) * part.StockQuantity).toLocaleString(
              "en-PH",
              { minimumFractionDigits: 2 },
            )}
          </p>
        </div>
      </div>

      {/* stock level bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <p className={`text-[10px] ${muted}`}>Stock Level</p>
          <p className={`text-[10px] ${muted}`}>{stockPct}%</p>
        </div>
        <div
          className={`h-1.5 rounded-full w-full ${dark ? "bg-white/5" : "bg-gray-100"}`}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${stockPct}%`, backgroundColor: status.color }}
          />
        </div>
      </div>

      {/* actions */}
      <button
        onClick={onAdjust}
        className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: primary }}
      >
        Adjust Stock
      </button>
      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-colors
            ${dark ? "border-white/10 text-gray-300 hover:text-white" : "border-gray-200 text-gray-600 hover:text-gray-900"}`}
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex-1 py-2 rounded-xl text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const { dark, toggleTheme, primaryColor } = useTheme();
  const { setOpen } = useSidebar();

  const [parts, setParts] = useState<Part[]>([]);
  const [total, setTotal] = useState(0);
  const [lowCount, setLowCount] = useState(0);
  const [outCount, setOutCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Part | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Part | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<Part | null>(null);
  const [drawerPart, setDrawerPart] = useState<Part | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const limit = 10;
  const totalPages = Math.ceil(total / limit);
  const isDrawerOpen = drawerPart !== null;

  const innerBg = dark ? "bg-[#0d0f13]" : "bg-[#f8f9fb]";
  const card = dark
    ? "bg-[#111318] border-white/5"
    : "bg-white border-gray-100";
  const text = dark ? "text-white" : "text-gray-900";
  const muted = dark ? "text-gray-500" : "text-gray-400";
  const divide = dark
    ? "divide-white/5 border-white/5"
    : "divide-gray-100 border-gray-100";
  const border = dark ? "border-white/5" : "border-gray-100";
  const thBg = dark ? "bg-white/3" : "bg-gray-50";
  const hoverRow = dark ? "hover:bg-white/3" : "hover:bg-gray-50";
  const selectCls = `rounded-xl border px-3 py-2 text-xs outline-none transition-colors
    ${dark ? "border-white/10 text-white bg-[#111318]" : "border-gray-200 text-gray-700 bg-white"}`;

  const fetchParts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/v1/inventory", {
        params: { search, page, filter },
      });
      setParts(res.data.parts);
      setTotal(res.data.total);
      setLowCount(res.data.lowCount);
      setOutCount(res.data.outCount);
    } catch {
      setError("Failed to load inventory.");
    } finally {
      setLoading(false);
    }
  }, [search, page, filter]);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleAdd = async (data: FormState) => {
    setFormLoading(true);
    setServerError("");
    try {
      await axios.post("/api/v1/inventory", {
        partName: data.partName,
        sku: data.sku || undefined,
        unitPrice: Number(data.unitPrice),
        stockQuantity: Number(data.stockQuantity) || 0,
        minimumStock: Number(data.minimumStock) || 0,
      });
      setShowAdd(false);
      fetchParts();
    } catch (err: any) {
      setServerError(err.response?.data?.error ?? "Failed to add part.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (data: FormState) => {
    if (!editTarget) return;
    setFormLoading(true);
    setServerError("");
    try {
      await axios.put(`/api/v1/inventory/${editTarget.Part_ID}`, {
        partName: data.partName || undefined,
        sku: data.sku || undefined,
        unitPrice: data.unitPrice ? Number(data.unitPrice) : undefined,
        stockQuantity:
          data.stockQuantity !== "" ? Number(data.stockQuantity) : undefined,
        minimumStock:
          data.minimumStock !== "" ? Number(data.minimumStock) : undefined,
      });
      setEditTarget(null);
      setDrawerPart(null);
      fetchParts();
    } catch (err: any) {
      setServerError(err.response?.data?.error ?? "Failed to update part.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleAdjust = async (adjustBy: number) => {
    if (!adjustTarget) return;
    try {
      await axios.put(`/api/v1/inventory/${adjustTarget.Part_ID}`, {
        adjustBy,
      });
      setAdjustTarget(null);
      setDrawerPart(null);
      fetchParts();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to adjust stock.");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/api/v1/inventory/${id}`);
      setDeleteTarget(null);
      setDrawerPart(null);
      fetchParts();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to delete part.");
    }
  };

  return (
    <div suppressHydrationWarning className="flex-1 flex relative min-h-0">
      <div
        className={`flex-1 flex flex-col min-h-0 ${innerBg} ${text} transition-[filter] duration-300`}
        style={{ filter: isDrawerOpen ? "blur(3px)" : "none" }}
      >
        <PageHeader title="Inventory" />

        <main className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto min-h-0 [&>*]:shrink-0">
          {error && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${dark ? "bg-red-900/20 border-red-800/50 text-red-400" : "bg-red-50 border-red-200 text-red-600"}`}
            >
              {error}
            </div>
          )}

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className={`text-lg font-semibold ${text}`}>Inventory</h1>
              <p className={`text-sm mt-0.5 ${muted}`}>
                {total} part{total !== 1 ? "s" : ""} in stock
              </p>
            </div>
            <div className="flex items-center gap-3">
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
              <select
                className={selectCls}
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All parts</option>
                <option value="low">
                  Low stock {lowCount > 0 ? `(${lowCount})` : ""}
                </option>
                <option value="out">
                  Out of stock {outCount > 0 ? `(${outCount})` : ""}
                </option>
              </select>
              <button
                onClick={() => {
                  setShowAdd(true);
                  setServerError("");
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                <FaPlus size={11} />
                Add Part
              </button>
            </div>
          </div>

          {outCount > 0 && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-red-500 font-medium">
                {outCount} part{outCount !== 1 ? "s" : ""} out of stock
              </p>
              <button
                onClick={() => setFilter("out")}
                className="text-xs text-red-500 underline"
              >
                View
              </button>
            </div>
          )}
          {lowCount > 0 && (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                {lowCount} part{lowCount !== 1 ? "s" : ""} running low
              </p>
              <button
                onClick={() => setFilter("low")}
                className="text-xs text-yellow-600 dark:text-yellow-400 underline"
              >
                View
              </button>
            </div>
          )}

          <div className={`rounded-2xl border overflow-hidden ${card}`}>
            <table className="w-full text-xs">
              <thead>
                <tr className={thBg}>
                  <th className={`text-left px-5 py-3 font-medium ${muted}`}>
                    Part
                  </th>
                  <th
                    className={`text-left px-5 py-3 font-medium ${muted} hidden sm:table-cell`}
                  >
                    SKU
                  </th>
                  <th className={`text-left px-5 py-3 font-medium ${muted}`}>
                    Stock
                  </th>
                  <th
                    className={`text-left px-5 py-3 font-medium ${muted} hidden md:table-cell`}
                  >
                    Unit Price
                  </th>
                  <th
                    className={`text-left px-5 py-3 font-medium ${muted} hidden lg:table-cell`}
                  >
                    Total Value
                  </th>
                  <th className={`text-left px-5 py-3 font-medium ${muted}`}>
                    Status
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
                ) : !parts.length ? (
                  <tr>
                    <td
                      colSpan={6}
                      className={`px-5 py-12 text-center ${muted}`}
                    >
                      {search
                        ? `No parts matching "${search}"`
                        : "No parts in inventory yet."}
                    </td>
                  </tr>
                ) : (
                  parts.map((p) => {
                    const status = stockStatus(p.StockQuantity, p.MinimumStock);
                    return (
                      <tr
                        key={p.Part_ID}
                        onClick={() => setDrawerPart(p)}
                        className={`cursor-pointer transition-colors ${hoverRow}`}
                      >
                        <td className={`px-5 py-3 font-medium ${text}`}>
                          {p.PartName}
                        </td>
                        <td
                          className={`px-5 py-3 font-mono ${muted} hidden sm:table-cell`}
                        >
                          {p.SKU || "—"}
                        </td>
                        <td className={`px-5 py-3 font-semibold ${text}`}>
                          {p.StockQuantity}
                          <span className={`ml-1 font-normal ${muted}`}>
                            / {p.MinimumStock} min
                          </span>
                        </td>
                        <td
                          className={`px-5 py-3 ${text} hidden md:table-cell`}
                        >
                          ₱
                          {Number(p.UnitPrice).toLocaleString("en-PH", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td
                          className={`px-5 py-3 ${muted} hidden lg:table-cell`}
                        >
                          ₱
                          {(
                            Number(p.UnitPrice) * p.StockQuantity
                          ).toLocaleString("en-PH", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className="text-[10px] font-medium px-2 py-1 rounded-full"
                            style={{
                              color: status.color,
                              backgroundColor: status.bg,
                            }}
                          >
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </main>

        {showAdd && (
          <Modal
            title="Add Part"
            onClose={() => setShowAdd(false)}
            card={card}
            text={text}
            border={border}
          >
            {serverError && (
              <p className="px-5 pt-4 text-xs text-red-400">{serverError}</p>
            )}
            <PartForm
              onSubmit={handleAdd}
              onCancel={() => setShowAdd(false)}
              loading={formLoading}
              dark={dark}
              text={text}
              muted={muted}
              border={border}
              primary={primaryColor}
            />
          </Modal>
        )}

        {editTarget && (
          <Modal
            title="Edit Part"
            onClose={() => setEditTarget(null)}
            card={card}
            text={text}
            border={border}
          >
            {serverError && (
              <p className="px-5 pt-4 text-xs text-red-400">{serverError}</p>
            )}
            <PartForm
              initial={{
                partName: editTarget.PartName,
                sku: editTarget.SKU ?? "",
                unitPrice: String(editTarget.UnitPrice),
                stockQuantity: String(editTarget.StockQuantity),
                minimumStock: String(editTarget.MinimumStock),
              }}
              onSubmit={handleEdit}
              onCancel={() => setEditTarget(null)}
              loading={formLoading}
              dark={dark}
              text={text}
              muted={muted}
              border={border}
              primary={primaryColor}
            />
          </Modal>
        )}

        {adjustTarget && (
          <Modal
            title="Adjust Stock"
            onClose={() => setAdjustTarget(null)}
            card={card}
            text={text}
            border={border}
          >
            <AdjustStockModal
              part={adjustTarget}
              onClose={() => setAdjustTarget(null)}
              onSave={handleAdjust}
              dark={dark}
              text={text}
              muted={muted}
              border={border}
              primary={primaryColor}
            />
          </Modal>
        )}

        {deleteTarget !== null && (
          <Modal
            title="Delete Part"
            onClose={() => setDeleteTarget(null)}
            card={card}
            text={text}
            border={border}
          >
            <div className="p-5 flex flex-col gap-4">
              <p className={`text-sm ${muted}`}>
                Delete <span className={text}>{deleteTarget.PartName}</span>?
                This won't affect existing job orders that used this part.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium ${dark ? "border-white/10 text-gray-400 hover:text-white" : "border-gray-200 text-gray-500 hover:text-gray-900"}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteTarget.Part_ID)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>

      <Drawer
        open={isDrawerOpen}
        onClose={() => setDrawerPart(null)}
        title="Part Details"
        dark={dark}
        card={card}
        text={text}
        border={border}
      >
        {drawerPart !== null && (
          <PartDrawerContent
            part={drawerPart}
            onEdit={() => {
              setEditTarget(drawerPart);
              setDrawerPart(null);
            }}
            onDelete={() => {
              setDeleteTarget(drawerPart);
              setDrawerPart(null);
            }}
            onAdjust={() => {
              setAdjustTarget(drawerPart);
              setDrawerPart(null);
            }}
            dark={dark}
            text={text}
            muted={muted}
            border={border}
            primary={primaryColor}
          />
        )}
      </Drawer>
    </div>
  );
}
