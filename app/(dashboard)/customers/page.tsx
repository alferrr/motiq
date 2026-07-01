"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useSearchParams } from "next/navigation";
import Drawer from "@/components/shared/Drawer";
import Modal from "@/components/shared/Modal";
import VehicleIcon from "@/components/shared/VehicleIcon";
import axios from "axios";
import {
  FaSearch,
  FaPlus,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import PageHeader from "@/components/shared/PageHeader";

type Customer = {
  Customer_ID: number;
  FullName: string;
  ContactNumber: string;
  Address: string;
  CreatedAt: string;
  vehicleCount: number;
};

type CustomerDetail = {
  customer: {
    Customer_ID: number;
    FullName: string;
    ContactNumber: string;
    Address: string;
    CreatedAt: string;
  };
  vehicles: {
    Vehicle_ID: number;
    PlateNumber: string;
    Make: string;
    Model: string;
    Year: number;
    Color: string;
    Mileage: number;
  }[];
  jobs: {
    Job_ID: number;
    Status: string;
    JobDate: string;
    ReportedIssue: string;
    Make: string;
    Model: string;
    PlateNumber: string;
    mechanic: string;
  }[];
};

type FormState = { fullName: string; contactNumber: string; address: string };
type FormErrors = Partial<Record<keyof FormState, string>>;

const STATUS_LIGHT: Record<string, { color: string; bg: string }> = {
  Pending: { color: "#f59e0b", bg: "#fef3c7" },
  "In Progress": { color: "#3b82f6", bg: "#dbeafe" },
  Completed: { color: "#10b981", bg: "#d1fae5" },
  Released: { color: "#6b7280", bg: "#f3f4f6" },
};
const STATUS_DARK: Record<string, { color: string; bg: string }> = {
  Pending: { color: "#fbbf24", bg: "#fbbf2420" },
  "In Progress": { color: "#60a5fa", bg: "#60a5fa20" },
  Completed: { color: "#34d399", bg: "#34d39920" },
  Released: { color: "#9ca3af", bg: "#9ca3af20" },
};

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />;
}

function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}


function CustomerForm({
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
  initial?: FormState;
  onSubmit: (data: FormState) => void;
  onCancel: () => void;
  loading: boolean;
  dark: boolean;
  text: string;
  muted: string;
  border: string;
  primary: string;
}) {
  const [form, setForm] = useState<FormState>(
    initial ?? { fullName: "", contactNumber: "", address: "" },
  );
  const [errors, setErrors] = useState<FormErrors>({});

  const inputCls = `w-full rounded-xl border px-4 py-2.5 text-sm bg-transparent outline-none transition-colors
    ${dark ? "border-white/10 text-white placeholder:text-gray-600" : "border-gray-200 text-gray-900 placeholder:text-gray-400"}`;

  const validate = () => {
    const e: FormErrors = {};
    if (!form.fullName.trim()) e.fullName = "Full name is required";
    if (!form.contactNumber.trim())
      e.contactNumber = "Contact number is required";
    setErrors(e);
    return !Object.keys(e).length;
  };

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <p className={`text-xs ${muted}`}>Full Name</p>
        <input
          className={inputCls}
          placeholder="Juan Dela Cruz"
          value={form.fullName}
          onChange={(e) => {
            setForm((p) => ({ ...p, fullName: e.target.value }));
            setErrors((p) => ({ ...p, fullName: undefined }));
          }}
        />
        {errors.fullName && (
          <p className="text-red-400 text-xs">{errors.fullName}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <p className={`text-xs ${muted}`}>Contact Number</p>
        <input
          className={inputCls}
          placeholder="09171234567"
          value={form.contactNumber}
          onChange={(e) => {
            setForm((p) => ({ ...p, contactNumber: e.target.value }));
            setErrors((p) => ({ ...p, contactNumber: undefined }));
          }}
        />
        {errors.contactNumber && (
          <p className="text-red-400 text-xs">{errors.contactNumber}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <p className={`text-xs ${muted}`}>
          Address <span className={muted}>(optional)</span>
        </p>
        <input
          className={inputCls}
          placeholder="123 Main St, Cebu City"
          value={form.address}
          onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
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

function CustomerDrawerContent({
  customerId,
  onEdit,
  onDelete,
  dark,
  text,
  muted,
  border,
  divide,
  primary,
}: {
  customerId: number;
  onEdit: (c: CustomerDetail["customer"]) => void;
  onDelete: (id: number) => void;
  dark: boolean;
  text: string;
  muted: string;
  border: string;
  divide: string;
  primary: string;
}) {
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const STATUS = dark ? STATUS_DARK : STATUS_LIGHT;

  useEffect(() => {
    setLoading(true);
    setDetail(null);
    axios
      .get(`/api/v1/customers/${customerId}`)
      .then((res) => setDetail(res.data))
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading)
    return (
      <div className="p-5 flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );

  if (!detail)
    return <p className={`p-5 text-xs ${muted}`}>Failed to load customer.</p>;

  return (
    <>
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={detail.customer.FullName} color={primary} />
          <div>
            <p className={`text-sm font-semibold ${text}`}>
              {detail.customer.FullName}
            </p>
            <p className={`text-xs ${muted}`}>
              {detail.customer.ContactNumber}
            </p>
          </div>
        </div>
        {detail.customer.Address && (
          <p className={`text-xs ${muted}`}>{detail.customer.Address}</p>
        )}
        <p className={`text-[10px] ${muted}`}>
          Customer since{" "}
          {new Date(detail.customer.CreatedAt).toLocaleDateString("en-PH", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(detail.customer)}
            className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-colors
              ${dark ? "border-white/10 text-gray-300 hover:text-white" : "border-gray-200 text-gray-600 hover:text-gray-900"}`}
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(detail.customer.Customer_ID)}
            className="flex-1 py-2 rounded-xl text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      <div className={`border-t ${border}`}>
        <p className={`px-5 py-3 text-xs font-semibold ${text}`}>
          Vehicles{" "}
          <span className={`font-normal ${muted}`}>
            ({detail.vehicles.length})
          </span>
        </p>
        <div className={`divide-y ${divide}`}>
          {!detail.vehicles.length ? (
            <p className={`px-5 py-4 text-xs ${muted}`}>
              No vehicles registered.
            </p>
          ) : (
            detail.vehicles.map((v) => (
              <div
                key={v.Vehicle_ID}
                className="px-5 py-3 flex items-center gap-3"
              >
                <VehicleIcon make={v.Make} primary={primary} size={32} />
                <div>
                  <p className={`text-xs font-medium ${text}`}>
                    {v.Make} {v.Model} {v.Year}
                  </p>
                  <p className={`text-[10px] ${muted}`}>
                    {v.PlateNumber}
                    {v.Color ? ` · ${v.Color}` : ""}
                    {v.Mileage ? ` · ${v.Mileage.toLocaleString()} km` : ""}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={`border-t ${border}`}>
        <p className={`px-5 py-3 text-xs font-semibold ${text}`}>
          Job History{" "}
          <span className={`font-normal ${muted}`}>({detail.jobs.length})</span>
        </p>
        <div className={`divide-y ${divide}`}>
          {!detail.jobs.length ? (
            <p className={`px-5 py-4 text-xs ${muted}`}>No repair history.</p>
          ) : (
            detail.jobs.map((j) => {
              const s = STATUS[j.Status] ?? STATUS["Pending"];
              return (
                <div key={j.Job_ID} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={`text-xs font-medium ${text}`}>
                      {j.Make} {j.Model}
                    </p>
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{ color: s.color, backgroundColor: s.bg }}
                    >
                      {j.Status}
                    </span>
                  </div>
                  <p className={`text-[10px] ${muted}`}>
                    {j.ReportedIssue || "No issue noted"} · {j.mechanic}
                  </p>
                  <p className={`text-[10px] ${muted}`}>
                    {new Date(j.JobDate).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

function CustomersPageInner() {
  const { dark, primaryColor } = useTheme();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<
    CustomerDetail["customer"] | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [drawerTarget, setDrawerTarget] = useState<number | null>(null);
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

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/v1/customers", {
        params: { search, page },
      });
      setCustomers(res.data.customers);
      setTotal(res.data.total);
    } catch {
      setError("Failed to load customers.");
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  const handleAdd = async (data: FormState) => {
    setFormLoading(true);
    setServerError("");
    try {
      await axios.post("/api/v1/customers", data);
      setShowAdd(false);
      fetchCustomers();
    } catch (err: any) {
      setServerError(err.response?.data?.error ?? "Failed to add customer.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (data: FormState) => {
    if (!editTarget) return;
    setFormLoading(true);
    setServerError("");
    try {
      await axios.put(`/api/v1/customers/${editTarget.Customer_ID}`, data);
      setEditTarget(null);
      fetchCustomers();
    } catch (err: any) {
      setServerError(err.response?.data?.error ?? "Failed to update customer.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/api/v1/customers/${id}`);
      setDeleteTarget(null);
      setDrawerTarget(null);
      fetchCustomers();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to delete customer.");
    }
  };

  // ── hooks (all top-level, run on every render) ───────────────────────────────

  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.get("search");
    if (q) {
      setSearchInput(q);
      setSearch(q);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

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
        <PageHeader title="Customers" />

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
              <h1 className={`text-lg font-semibold ${text}`}>Customers</h1>
              <p className={`text-sm mt-0.5 ${muted}`}>
                {total} customer{total !== 1 ? "s" : ""} total
              </p>
            </div>
            <button
              onClick={() => {
                setShowAdd(true);
                setServerError("");
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
            >
              <FaPlus size={11} />
              Add Customer
            </button>
          </div>

          <div className={`rounded-2xl border overflow-hidden ${card}`}>
            <div
              className={`flex items-center gap-3 px-5 py-3 border-b sm:hidden ${border}`}
            >
              <FaSearch size={11} className={muted} />
              <input
                className={`bg-transparent outline-none w-full text-xs ${dark ? "text-gray-300 placeholder:text-gray-600" : "text-gray-700 placeholder:text-gray-400"}`}
                placeholder="Search customers..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <table className="w-full text-xs">
              <thead>
                <tr className={thBg}>
                  <th className={`text-left px-5 py-3 font-medium ${muted}`}>
                    Name
                  </th>
                  <th
                    className={`text-left px-5 py-3 font-medium ${muted} hidden sm:table-cell`}
                  >
                    Contact
                  </th>
                  <th
                    className={`text-left px-5 py-3 font-medium ${muted} hidden lg:table-cell`}
                  >
                    Address
                  </th>
                  <th
                    className={`text-left px-5 py-3 font-medium ${muted} hidden md:table-cell`}
                  >
                    Vehicles
                  </th>
                  <th
                    className={`text-left px-5 py-3 font-medium ${muted} hidden lg:table-cell`}
                  >
                    Joined
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
                ) : !customers.length ? (
                  <tr>
                    <td
                      colSpan={5}
                      className={`px-5 py-12 text-center ${muted}`}
                    >
                      {search
                        ? `No customers matching "${search}"`
                        : "No customers yet. Add your first one."}
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr
                      key={c.Customer_ID}
                      onClick={() => setDrawerTarget(c.Customer_ID)}
                      className={`cursor-pointer transition-colors ${hoverRow}`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.FullName} color={primaryColor} />
                          <span className={`font-medium ${text}`}>
                            {c.FullName}
                          </span>
                        </div>
                      </td>
                      <td className={`px-5 py-3 ${muted} hidden sm:table-cell`}>
                        {c.ContactNumber}
                      </td>
                      <td
                        className={`px-5 py-3 ${muted} hidden lg:table-cell truncate max-w-[200px]`}
                      >
                        {c.Address || "—"}
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{
                            color: primaryColor,
                            backgroundColor: primaryColor + "20",
                          }}
                        >
                          {c.vehicleCount} vehicle
                          {c.vehicleCount !== 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className={`px-5 py-3 ${muted} hidden lg:table-cell`}>
                        {new Date(c.CreatedAt).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
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
            title="Add Customer"
            onClose={() => setShowAdd(false)}
            card={card}
            text={text}
            border={border}
          >
            {serverError && (
              <p className="px-5 pt-4 text-xs text-red-400">{serverError}</p>
            )}
            <CustomerForm
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
            title="Edit Customer"
            onClose={() => setEditTarget(null)}
            card={card}
            text={text}
            border={border}
          >
            {serverError && (
              <p className="px-5 pt-4 text-xs text-red-400">{serverError}</p>
            )}
            <CustomerForm
              initial={{
                fullName: editTarget.FullName,
                contactNumber: editTarget.ContactNumber,
                address: editTarget.Address,
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

        {deleteTarget !== null && (
          <Modal
            title="Delete Customer"
            onClose={() => setDeleteTarget(null)}
            card={card}
            text={text}
            border={border}
          >
            <div className="p-5 flex flex-col gap-4">
              <p className={`text-sm ${muted}`}>
                This will permanently delete the customer and cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium ${dark ? "border-white/10 text-gray-400 hover:text-white" : "border-gray-200 text-gray-500 hover:text-gray-900"}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteTarget)}
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
        title="Customer Profile"
        dark={dark}
        card={card}
        text={text}
        border={border}
      >
        {drawerTarget !== null && (
          <CustomerDrawerContent
            customerId={drawerTarget}
            onEdit={(c) => {
              setEditTarget(c);
              setDrawerTarget(null);
            }}
            onDelete={(id) => {
              setDeleteTarget(id);
              setDrawerTarget(null);
            }}
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

export default function CustomersPage() {
  return (
    <Suspense fallback={null}>
      <CustomersPageInner />
    </Suspense>
  );
}
