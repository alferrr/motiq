"use client";

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useSidebar } from "@/context/SidebarContext";
import Drawer from "@/components/shared/Drawer";
import axios from "axios";
import {
  FaBars,
  FaBell,
  FaMoon,
  FaSun,
  FaSearch,
  FaPlus,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaWrench,
} from "react-icons/fa";

type Service = {
  Service_ID: number;
  ServiceName: string;
  Category: string;
  Description: string;
  LaborRate: number;
  usageCount: number;
};

type FormState = {
  serviceName: string;
  category: string;
  description: string;
  laborRate: string;
};
type FormErrors = Partial<Record<keyof FormState, string>>;

const DEFAULT_CATEGORIES = [
  "Oil & Fluids",
  "Brakes",
  "Engine",
  "Transmission",
  "Electrical",
  "Suspension",
  "Tires & Wheels",
  "AC & Cooling",
  "Body & Paint",
  "Diagnostic",
  "General Service",
];

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />;
}

function ServiceIcon({
  category,
  primary,
}: {
  category: string;
  primary: string;
}) {
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
      style={{ backgroundColor: primary + "20", color: primary }}
    >
      <FaWrench size={14} />
    </div>
  );
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

function ServiceForm({
  initial,
  categories,
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
  categories: string[];
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
    serviceName: "",
    category: "",
    description: "",
    laborRate: "",
    ...initial,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const inputCls = `w-full rounded-xl border px-4 py-2.5 text-sm bg-transparent outline-none transition-colors
    ${dark ? "border-white/10 text-white placeholder:text-gray-600" : "border-gray-200 text-gray-900 placeholder:text-gray-400"}`;
  const selectCls = `w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors
    ${dark ? "border-white/10 text-white bg-[#111318]" : "border-gray-200 text-gray-900 bg-white"}`;

  const allCategories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...categories]),
  ).sort();

  const validate = () => {
    const e: FormErrors = {};
    if (!form.serviceName.trim()) e.serviceName = "Service name is required";
    if (!form.laborRate) e.laborRate = "Labor rate is required";
    else if (isNaN(Number(form.laborRate)) || Number(form.laborRate) < 0)
      e.laborRate = "Enter a valid amount";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const set =
    (key: keyof FormState) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      setForm((p) => ({ ...p, [key]: e.target.value }));
      setErrors((p) => ({ ...p, [key]: undefined }));
    };

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <p className={`text-xs ${muted}`}>Service Name</p>
        <input
          className={inputCls}
          placeholder="Oil Change"
          value={form.serviceName}
          onChange={set("serviceName")}
        />
        {errors.serviceName && (
          <p className="text-red-400 text-xs">{errors.serviceName}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <p className={`text-xs ${muted}`}>
          Category <span className={muted}>(optional)</span>
        </p>
        <select
          className={selectCls}
          value={form.category}
          onChange={set("category")}
        >
          <option value="">Select category</option>
          {allCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className={`text-xs ${muted}`}>Labor Rate (₱)</p>
        <input
          className={inputCls}
          type="number"
          placeholder="500"
          min="0"
          step="0.01"
          value={form.laborRate}
          onChange={set("laborRate")}
        />
        {errors.laborRate && (
          <p className="text-red-400 text-xs">{errors.laborRate}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <p className={`text-xs ${muted}`}>
          Description <span className={muted}>(optional)</span>
        </p>
        <textarea
          className={`${inputCls} resize-none`}
          placeholder="Brief description of the service..."
          rows={3}
          value={form.description}
          onChange={set("description")}
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

function ServiceDrawerContent({
  service,
  onEdit,
  onDelete,
  dark,
  text,
  muted,
  border,
  primary,
}: {
  service: Service;
  onEdit: () => void;
  onDelete: () => void;
  dark: boolean;
  text: string;
  muted: string;
  border: string;
  primary: string;
}) {
  return (
    <>
      <div className="p-5 flex flex-col gap-4">
        {/* header */}
        <div className="flex items-center gap-3">
          <ServiceIcon category={service.Category} primary={primary} />
          <div>
            <p className={`text-sm font-semibold ${text}`}>
              {service.ServiceName}
            </p>
            <p className={`text-xs ${muted}`}>
              {service.Category || "Uncategorized"}
            </p>
          </div>
        </div>

        {/* stats */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className={`rounded-xl p-3 ${dark ? "bg-white/3" : "bg-gray-50"}`}
          >
            <p className={`text-[10px] ${muted}`}>Labor Rate</p>
            <p
              className="text-sm font-semibold mt-0.5"
              style={{ color: primary }}
            >
              ₱
              {Number(service.LaborRate).toLocaleString("en-PH", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
          <div
            className={`rounded-xl p-3 ${dark ? "bg-white/3" : "bg-gray-50"}`}
          >
            <p className={`text-[10px] ${muted}`}>Times Used</p>
            <p className={`text-sm font-semibold mt-0.5 ${text}`}>
              {service.usageCount} job{service.usageCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* description */}
        {service.Description && (
          <div
            className={`rounded-xl p-3 ${dark ? "bg-white/3" : "bg-gray-50"}`}
          >
            <p className={`text-[10px] ${muted} mb-1`}>Description</p>
            <p className={`text-xs ${text} leading-relaxed`}>
              {service.Description}
            </p>
          </div>
        )}

        {/* actions */}
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
    </>
  );
}

export default function ServicesPage() {
  const { dark, toggleTheme, primaryColor } = useTheme();
  const { setOpen } = useSidebar();

  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Service | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [drawerTarget, setDrawerTarget] = useState<Service | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const limit = 10;
  const totalPages = Math.ceil(total / limit);
  const isDrawerOpen = drawerTarget !== null;

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

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/v1/services", {
        params: { search: categoryFilter ? `${search}` : search, page },
      });
      let svcs = res.data.services as Service[];
      if (categoryFilter)
        svcs = svcs.filter((s) => s.Category === categoryFilter);
      setServices(svcs);
      setTotal(res.data.total);
      setCategories(res.data.categories);
    } catch {
      setError("Failed to load services.");
    } finally {
      setLoading(false);
    }
  }, [search, page, categoryFilter]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

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
      await axios.post("/api/v1/services", {
        serviceName: data.serviceName,
        category: data.category || undefined,
        description: data.description || undefined,
        laborRate: Number(data.laborRate),
      });
      setShowAdd(false);
      fetchServices();
    } catch (err: any) {
      setServerError(err.response?.data?.error ?? "Failed to add service.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (data: FormState) => {
    if (!editTarget) return;
    setFormLoading(true);
    setServerError("");
    try {
      await axios.put(`/api/v1/services/${editTarget.Service_ID}`, {
        serviceName: data.serviceName || undefined,
        category: data.category || undefined,
        description: data.description || undefined,
        laborRate: data.laborRate ? Number(data.laborRate) : undefined,
      });
      setEditTarget(null);
      setDrawerTarget(null);
      fetchServices();
    } catch (err: any) {
      setServerError(err.response?.data?.error ?? "Failed to update service.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/api/v1/services/${id}`);
      setDeleteTarget(null);
      setDrawerTarget(null);
      fetchServices();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to delete service.");
    }
  };

  return (
    <div suppressHydrationWarning className="flex-1 flex relative">
      <div
        className={`flex-1 flex flex-col ${innerBg} ${text} transition-[filter] duration-300`}
        style={{ filter: isDrawerOpen ? "blur(3px)" : "none" }}
      >
        <header className="h-14 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={() => setOpen(true)}
              className={`lg:hidden ${muted}`}
            >
              <FaBars size={15} />
            </button>
            <p className={`text-sm font-semibold ${text}`}>Services</p>
          </div>
          <div
            className={`hidden sm:flex items-center gap-2 border rounded-full px-3 py-1.5 flex-1 max-w-xs mx-4 ${dark ? "border-white/5 bg-white/5" : "border-gray-200 bg-white"}`}
          >
            <FaSearch size={10} className={muted} />
            <input
              className={`bg-transparent outline-none w-full text-xs ${dark ? "text-gray-300 placeholder:text-gray-600" : "text-gray-700 placeholder:text-gray-400"}`}
              placeholder="Search anything..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <span className={`text-[10px] ${muted} shrink-0`}>⌘ F</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${dark ? "border-white/5 text-gray-500 hover:text-white" : "border-gray-200 text-gray-400 hover:text-gray-700"}`}
            >
              {dark ? <FaSun size={12} /> : <FaMoon size={12} />}
            </button>
            <button
              className={`relative w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${dark ? "border-white/5 text-gray-500 hover:text-white" : "border-gray-200 text-gray-400 hover:text-gray-700"}`}
            >
              <FaBell size={12} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
          </div>
        </header>

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
              <h1 className={`text-lg font-semibold ${text}`}>Services</h1>
              <p className={`text-sm mt-0.5 ${muted}`}>
                {total} service{total !== 1 ? "s" : ""} in catalog
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                className={selectCls}
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
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
                Add Service
              </button>
            </div>
          </div>

          <div className={`rounded-2xl border overflow-hidden ${card}`}>
            <table className="w-full text-xs">
              <thead>
                <tr className={thBg}>
                  <th className={`text-left px-5 py-3 font-medium ${muted}`}>
                    Service
                  </th>
                  <th
                    className={`text-left px-5 py-3 font-medium ${muted} hidden sm:table-cell`}
                  >
                    Category
                  </th>
                  <th
                    className={`text-left px-5 py-3 font-medium ${muted} hidden md:table-cell`}
                  >
                    Description
                  </th>
                  <th className={`text-left px-5 py-3 font-medium ${muted}`}>
                    Rate
                  </th>
                  <th
                    className={`text-left px-5 py-3 font-medium ${muted} hidden md:table-cell`}
                  >
                    Usage
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${divide}`}>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-5 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : !services.length ? (
                  <tr>
                    <td
                      colSpan={5}
                      className={`px-5 py-12 text-center ${muted}`}
                    >
                      {search
                        ? `No services matching "${search}"`
                        : "No services yet. Add your first one."}
                    </td>
                  </tr>
                ) : (
                  services.map((s) => (
                    <tr
                      key={s.Service_ID}
                      onClick={() => setDrawerTarget(s)}
                      className={`cursor-pointer transition-colors ${hoverRow}`}
                    >
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-3">
                          {/* <ServiceIcon
                            category={s.Category}
                            primary={primaryColor}
                          /> */}
                          <span className={`font-medium ${text}`}>
                            {s.ServiceName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell">
                        {s.Category ? (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                            style={{
                              color: primaryColor,
                              backgroundColor: primaryColor + "20",
                            }}
                          >
                            {s.Category}
                          </span>
                        ) : (
                          <span className={muted}>—</span>
                        )}
                      </td>
                      <td
                        className={`px-5 py-3 ${muted} hidden md:table-cell max-w-55 truncate`}
                      >
                        {s.Description || "—"}
                      </td>
                      <td
                        className={`px-5 py-3 font-semibold`}
                        style={{ color: primaryColor }}
                      >
                        ₱
                        {Number(s.LaborRate).toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className={`px-5 py-3 ${muted} hidden md:table-cell`}>
                        {s.usageCount} use{s.usageCount !== 1 ? "s" : ""}
                      </td>
                    </tr>
                  ))
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

        {showAdd && (
          <Modal
            title="Add Service"
            onClose={() => setShowAdd(false)}
            card={card}
            text={text}
            border={border}
          >
            {serverError && (
              <p className="px-5 pt-4 text-xs text-red-400">{serverError}</p>
            )}
            <ServiceForm
              categories={categories}
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
            title="Edit Service"
            onClose={() => setEditTarget(null)}
            card={card}
            text={text}
            border={border}
          >
            {serverError && (
              <p className="px-5 pt-4 text-xs text-red-400">{serverError}</p>
            )}
            <ServiceForm
              initial={{
                serviceName: editTarget.ServiceName,
                category: editTarget.Category ?? "",
                description: editTarget.Description ?? "",
                laborRate: String(editTarget.LaborRate),
              }}
              categories={categories}
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

        {deleteTarget !== null && (
          <Modal
            title="Delete Service"
            onClose={() => setDeleteTarget(null)}
            card={card}
            text={text}
            border={border}
          >
            <div className="p-5 flex flex-col gap-4">
              <p className={`text-sm ${muted}`}>
                Delete <span className={text}>{deleteTarget.ServiceName}</span>?
                This won't affect existing job orders that used this service.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium ${dark ? "border-white/10 text-gray-400 hover:text-white" : "border-gray-200 text-gray-500 hover:text-gray-900"}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteTarget.Service_ID)}
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
        onClose={() => setDrawerTarget(null)}
        title="Service Details"
        dark={dark}
        card={card}
        text={text}
        border={border}
      >
        {drawerTarget !== null && (
          <ServiceDrawerContent
            service={drawerTarget}
            onEdit={() => {
              setEditTarget(drawerTarget);
              setDrawerTarget(null);
            }}
            onDelete={() => {
              setDeleteTarget(drawerTarget);
              setDrawerTarget(null);
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
