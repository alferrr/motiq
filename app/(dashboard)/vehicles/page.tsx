"use client";

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useSidebar } from "@/context/SidebarContext";
import Drawer from "@/components/shared/Drawer";
import Modal from "@/components/shared/Modal";
import SearchableSelect from "@/components/shared/SearchableSelect";
import VehicleIcon from "@/components/shared/VehicleIcon";
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
} from "react-icons/fa";
import { useSearchParams } from "next/navigation";

type Vehicle = {
  Vehicle_ID: number;
  PlateNumber: string;
  Make: string;
  Model: string;
  Year: number;
  Color: string;
  Mileage: number;
  CreatedAt: string;
  Customer_ID: number;
  ownerName: string;
  ownerContact: string;
  jobCount: number;
};

type VehicleDetail = {
  vehicle: Vehicle & { VIN: string };
  jobs: {
    Job_ID: number;
    Status: string;
    JobDate: string;
    ReportedIssue: string;
    Diagnosis: string;
    mechanic: string;
  }[];
};

type CustomerOption = { Customer_ID: number; FullName: string };

type FormState = {
  customerId: string;
  plateNumber: string;
  make: string;
  model: string;
  year: string;
  vin: string;
  color: string;
  mileage: string;
};
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


function VehicleForm({
  initial,
  customers,
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
  customers: CustomerOption[];
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
    customerId: "",
    plateNumber: "",
    make: "",
    model: "",
    year: "",
    vin: "",
    color: "",
    mileage: "",
    ...initial,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const inputCls = `w-full rounded-xl border px-4 py-2.5 text-sm bg-transparent outline-none transition-colors
    ${dark ? "border-white/10 text-white placeholder:text-gray-600" : "border-gray-200 text-gray-900 placeholder:text-gray-400"}`;

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((p) => ({ ...p, [key]: e.target.value }));
      setErrors((p) => ({ ...p, [key]: undefined }));
    };

  const validate = () => {
    const e: FormErrors = {};
    if (!form.customerId) e.customerId = "Owner is required";
    if (!form.plateNumber.trim()) e.plateNumber = "Plate number is required";
    if (!form.make.trim()) e.make = "Make is required";
    if (!form.model.trim()) e.model = "Model is required";
    setErrors(e);
    return !Object.keys(e).length;
  };

  return (
    <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
      <div className="flex flex-col gap-1.5">
        <p className={`text-xs ${muted}`}>Owner</p>
        <SearchableSelect
          dark={dark}
          placeholder="Search customers…"
          emptyMessage="No customers found"
          value={form.customerId}
          onChange={(v) => {
            setForm((p) => ({ ...p, customerId: v }));
            setErrors((p) => ({ ...p, customerId: undefined }));
          }}
          options={customers.map((c) => ({
            value: String(c.Customer_ID),
            label: c.FullName,
          }))}
        />
        {errors.customerId && (
          <p className="text-red-400 text-xs">{errors.customerId}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <p className={`text-xs ${muted}`}>Plate Number</p>
          <input
            className={inputCls}
            placeholder="ABC 1234"
            value={form.plateNumber}
            onChange={set("plateNumber")}
          />
          {errors.plateNumber && (
            <p className="text-red-400 text-xs">{errors.plateNumber}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <p className={`text-xs ${muted}`}>Year</p>
          <input
            className={inputCls}
            type="number"
            placeholder="2020"
            value={form.year}
            onChange={set("year")}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <p className={`text-xs ${muted}`}>Make</p>
          <input
            className={inputCls}
            placeholder="Toyota"
            value={form.make}
            onChange={set("make")}
          />
          {errors.make && <p className="text-red-400 text-xs">{errors.make}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <p className={`text-xs ${muted}`}>Model</p>
          <input
            className={inputCls}
            placeholder="Vios"
            value={form.model}
            onChange={set("model")}
          />
          {errors.model && (
            <p className="text-red-400 text-xs">{errors.model}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <p className={`text-xs ${muted}`}>
            Color <span className={muted}>(optional)</span>
          </p>
          <input
            className={inputCls}
            placeholder="White"
            value={form.color}
            onChange={set("color")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <p className={`text-xs ${muted}`}>
            Mileage <span className={muted}>(km)</span>
          </p>
          <input
            className={inputCls}
            type="number"
            placeholder="50000"
            value={form.mileage}
            onChange={set("mileage")}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className={`text-xs ${muted}`}>
          VIN <span className={muted}>(optional)</span>
        </p>
        <input
          className={inputCls}
          placeholder="1HGBH41JXMN109186"
          value={form.vin}
          onChange={set("vin")}
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

function VehicleDrawerContent({
  vehicleId,
  onEdit,
  onDelete,
  dark,
  text,
  muted,
  border,
  divide,
  primary,
}: {
  vehicleId: number;
  onEdit: (v: VehicleDetail["vehicle"]) => void;
  onDelete: (id: number) => void;
  dark: boolean;
  text: string;
  muted: string;
  border: string;
  divide: string;
  primary: string;
}) {
  const [detail, setDetail] = useState<VehicleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const STATUS = dark ? STATUS_DARK : STATUS_LIGHT;

  useEffect(() => {
    setLoading(true);
    setDetail(null);
    axios
      .get(`/api/v1/vehicles/${vehicleId}`)
      .then((res) => setDetail(res.data))
      .finally(() => setLoading(false));
  }, [vehicleId]);

  if (loading)
    return (
      <div className="p-5 flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );

  if (!detail)
    return <p className={`p-5 text-xs ${muted}`}>Failed to load vehicle.</p>;

  return (
    <>
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <VehicleIcon make={detail.vehicle.Make} primary={primary} />
          <div>
            <p className={`text-sm font-semibold ${text}`}>
              {detail.vehicle.Make} {detail.vehicle.Model}
              {detail.vehicle.Year ? ` ${detail.vehicle.Year}` : ""}
            </p>
            <p className={`text-xs ${muted}`}>{detail.vehicle.PlateNumber}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Color", value: detail.vehicle.Color || "—" },
            {
              label: "Mileage",
              value: detail.vehicle.Mileage
                ? `${detail.vehicle.Mileage.toLocaleString()} km`
                : "—",
            },
            { label: "VIN", value: detail.vehicle.VIN || "—" },
            { label: "Jobs", value: String(detail.jobs.length) },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-xl p-3 ${dark ? "bg-white/3" : "bg-gray-50"}`}
            >
              <p className={`text-[10px] ${muted}`}>{item.label}</p>
              <p className={`text-xs font-medium mt-0.5 ${text}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className={`rounded-xl p-3 ${dark ? "bg-white/3" : "bg-gray-50"}`}>
          <p className={`text-[10px] ${muted} mb-1`}>Owner</p>
          <p className={`text-xs font-medium ${text}`}>
            {detail.vehicle.ownerName}
          </p>
          <p className={`text-[10px] ${muted}`}>
            {detail.vehicle.ownerContact}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onEdit(detail.vehicle)}
            className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-colors
              ${dark ? "border-white/10 text-gray-300 hover:text-white" : "border-gray-200 text-gray-600 hover:text-gray-900"}`}
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(detail.vehicle.Vehicle_ID)}
            className="flex-1 py-2 rounded-xl text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      <div className={`border-t ${border}`}>
        <p className={`px-5 py-3 text-xs font-semibold ${text}`}>
          Repair History{" "}
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
                    <p className={`text-xs font-medium ${text}`}>#{j.Job_ID}</p>
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md border"
                      style={{ color: s.color, borderColor: s.color + "40" }}
                    >
                      {j.Status}
                    </span>
                  </div>
                  <p className={`text-[11px] ${muted}`}>
                    {j.ReportedIssue || "No issue noted"}
                  </p>
                  {j.Diagnosis && (
                    <p className={`text-[11px] ${muted}`}>
                      Diagnosis: {j.Diagnosis}
                    </p>
                  )}
                  <p className={`text-[10px] ${muted} mt-0.5`}>
                    {j.mechanic} ·{" "}
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

export default function VehiclesPage() {
  const { dark, toggleTheme, primaryColor } = useTheme();
  const { setOpen } = useSidebar();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<VehicleDetail["vehicle"] | null>(
    null,
  );
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

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/v1/vehicles", {
        params: { search, page },
      });
      setVehicles(res.data.vehicles);
      setTotal(res.data.total);
      setCustomers(res.data.customers);
    } catch {
      setError("Failed to load vehicles.");
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

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
      await axios.post("/api/v1/vehicles", {
        customerId: Number(data.customerId),
        plateNumber: data.plateNumber,
        make: data.make,
        model: data.model,
        year: data.year ? Number(data.year) : undefined,
        vin: data.vin || undefined,
        color: data.color || undefined,
        mileage: data.mileage ? Number(data.mileage) : undefined,
      });
      setShowAdd(false);
      fetchVehicles();
    } catch (err: any) {
      setServerError(err.response?.data?.error ?? "Failed to add vehicle.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (data: FormState) => {
    if (!editTarget) return;
    setFormLoading(true);
    setServerError("");
    try {
      await axios.put(`/api/v1/vehicles/${editTarget.Vehicle_ID}`, {
        plateNumber: data.plateNumber || undefined,
        make: data.make || undefined,
        model: data.model || undefined,
        year: data.year ? Number(data.year) : undefined,
        vin: data.vin || undefined,
        color: data.color || undefined,
        mileage: data.mileage ? Number(data.mileage) : undefined,
      });
      setEditTarget(null);
      setDrawerTarget(null);
      fetchVehicles();
    } catch (err: any) {
      setServerError(err.response?.data?.error ?? "Failed to update vehicle.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/api/v1/vehicles/${id}`);
      setDeleteTarget(null);
      setDrawerTarget(null);
      fetchVehicles();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to delete vehicle.");
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
  return (
    <div suppressHydrationWarning className="flex-1 flex relative min-h-0">
      <div
        className={`flex-1 flex flex-col min-h-0 ${innerBg} ${text} transition-[filter] duration-300`}
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
            <p className={`text-sm font-semibold ${text}`}>Vehicles</p>
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
              <h1 className={`text-lg font-semibold ${text}`}>Vehicles</h1>
              <p className={`text-sm mt-0.5 ${muted}`}>
                {total} vehicle{total !== 1 ? "s" : ""} registered
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
              <button
                onClick={() => {
                  setShowAdd(true);
                  setServerError("");
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                <FaPlus size={11} />
                Add Vehicle
              </button>
            </div>
          </div>

          <div className={`rounded-2xl border overflow-hidden ${card}`}>
            <div
              className={`flex items-center gap-3 px-5 py-3 border-b sm:hidden ${border}`}
            >
              <FaSearch size={11} className={muted} />
              <input
                className={`bg-transparent outline-none w-full text-xs ${dark ? "text-gray-300 placeholder:text-gray-600" : "text-gray-700 placeholder:text-gray-400"}`}
                placeholder="Search vehicles..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <table className="w-full text-xs">
              <thead>
                <tr className={thBg}>
                  <th className={`text-left px-5 py-3 font-medium ${muted}`}>
                    Vehicle
                  </th>
                  <th
                    className={`text-left px-5 py-3 font-medium ${muted} hidden sm:table-cell`}
                  >
                    Plate
                  </th>
                  <th
                    className={`text-left px-5 py-3 font-medium ${muted} hidden md:table-cell`}
                  >
                    Owner
                  </th>
                  <th
                    className={`text-left px-5 py-3 font-medium ${muted} hidden lg:table-cell`}
                  >
                    Color / Mileage
                  </th>
                  <th
                    className={`text-left px-5 py-3 font-medium ${muted} hidden md:table-cell`}
                  >
                    Jobs
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
                ) : !vehicles.length ? (
                  <tr>
                    <td
                      colSpan={5}
                      className={`px-5 py-12 text-center ${muted}`}
                    >
                      {search
                        ? `No vehicles matching "${search}"`
                        : "No vehicles yet. Add the first one."}
                    </td>
                  </tr>
                ) : (
                  vehicles.map((v) => (
                    <tr
                      key={v.Vehicle_ID}
                      onClick={() => setDrawerTarget(v.Vehicle_ID)}
                      className={`cursor-pointer transition-colors ${hoverRow}`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <VehicleIcon make={v.Make} primary={primaryColor} />
                          <div>
                            <p className={`font-medium ${text}`}>
                              {v.Make} {v.Model}
                            </p>
                            <p className={`text-[10px] ${muted}`}>
                              {v.Year || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td
                        className={`px-5 py-3 font-mono ${text} hidden sm:table-cell`}
                      >
                        {v.PlateNumber}
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <p className={text}>{v.ownerName}</p>
                        <p className={`text-[10px] ${muted}`}>
                          {v.ownerContact}
                        </p>
                      </td>
                      <td className={`px-5 py-3 ${muted} hidden lg:table-cell`}>
                        {v.Color || "—"}{" "}
                        {v.Mileage ? `· ${v.Mileage.toLocaleString()} km` : ""}
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-md border ${dark ? "border-white/10 text-gray-300" : "border-gray-200 text-gray-600"}`}
                        >
                          {v.jobCount} job{v.jobCount !== 1 ? "s" : ""}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>

        {showAdd && (
          <Modal
            title="Add Vehicle"
            size="lg"
            onClose={() => setShowAdd(false)}
            card={card}
            text={text}
            border={border}
          >
            {serverError && (
              <p className="px-5 pt-4 text-xs text-red-400">{serverError}</p>
            )}
            <VehicleForm
              customers={customers}
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
            title="Edit Vehicle"
            size="lg"
            onClose={() => setEditTarget(null)}
            card={card}
            text={text}
            border={border}
          >
            {serverError && (
              <p className="px-5 pt-4 text-xs text-red-400">{serverError}</p>
            )}
            <VehicleForm
              initial={{
                customerId: String(editTarget.Customer_ID),
                plateNumber: editTarget.PlateNumber,
                make: editTarget.Make,
                model: editTarget.Model,
                year: editTarget.Year ? String(editTarget.Year) : "",
                vin: editTarget.VIN ?? "",
                color: editTarget.Color ?? "",
                mileage: editTarget.Mileage ? String(editTarget.Mileage) : "",
              }}
              customers={customers}
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
            title="Delete Vehicle"
            size="lg"
            onClose={() => setDeleteTarget(null)}
            card={card}
            text={text}
            border={border}
          >
            <div className="p-5 flex flex-col gap-4">
              <p className={`text-sm ${muted}`}>
                This will permanently delete the vehicle. Its repair job history
                will remain.
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
        title="Vehicle Details"
        dark={dark}
        card={card}
        text={text}
        border={border}
      >
        {drawerTarget !== null && (
          <VehicleDrawerContent
            vehicleId={drawerTarget}
            onEdit={(v) => {
              setEditTarget(v);
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
