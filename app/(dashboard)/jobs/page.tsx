"use client";

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useSidebar } from "@/context/SidebarContext";
import { useSearchParams } from "next/navigation";
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
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import PageHeader from "@/components/shared/PageHeader";

type Job = {
  Job_ID: number;
  Status: string;
  JobDate: string;
  ReportedIssue: string;
  Diagnosis: string;
  LaborHours: number;
  customerName: string;
  Make: string;
  Model: string;
  Year: number;
  PlateNumber: string;
  mechanicName: string;
};

type JobDetail = {
  job: Job & {
    customerContact: string;
    Color: string;
    CreatedAt: string;
    Mechanic_ID: number;
    User_ID: number;
  };
  services: {
    Service_ID: number;
    ServiceName: string;
    Category: string;
    LaborRate: number;
  }[];
  parts: {
    Part_ID: number;
    PartName: string;
    SKU: string;
    UnitPrice: number;
    QuantityUsed: number;
  }[];
  totalLabor: number;
  totalParts: number;
};

type VehicleOption = {
  Vehicle_ID: number;
  Make: string;
  Model: string;
  PlateNumber: string;
  ownerName: string;
};
type MechanicOption = {
  Mechanic_ID: number;
  FullName: string;
  Specialization: string;
};

type FormState = {
  vehicleId: string;
  mechanicId: string;
  jobDate: string;
  reportedIssue: string;
};
type FormErrors = Partial<Record<keyof FormState, string>>;

const STATUSES = ["Pending", "In Progress", "Completed", "Released"] as const;

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

function StatusBadge({ status, dark }: { status: string; dark: boolean }) {
  const s =
    (dark ? STATUS_DARK : STATUS_LIGHT)[status] ??
    (dark ? STATUS_DARK : STATUS_LIGHT)["Pending"];
  return (
    <span
      className="text-[10px] font-medium px-2 py-1 rounded-full"
      style={{ color: s.color, backgroundColor: s.bg }}
    >
      {status}
    </span>
  );
}


function JobForm({
  initial,
  vehicles,
  mechanics,
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
  vehicles: VehicleOption[];
  mechanics: MechanicOption[];
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
    vehicleId: "",
    mechanicId: "",
    jobDate: new Date().toISOString().split("T")[0],
    reportedIssue: "",
    ...initial,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const inputCls = `w-full rounded-xl border px-4 py-2.5 text-sm bg-transparent outline-none transition-colors
    ${dark ? "border-white/10 text-white placeholder:text-gray-600" : "border-gray-200 text-gray-900 placeholder:text-gray-400"}`;

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

  const validate = () => {
    const e: FormErrors = {};
    if (!form.vehicleId) e.vehicleId = "Vehicle is required";
    if (!form.mechanicId) e.mechanicId = "Mechanic is required";
    if (!form.jobDate) e.jobDate = "Job date is required";
    setErrors(e);
    return !Object.keys(e).length;
  };

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <p className={`text-xs ${muted}`}>Vehicle</p>
        <SearchableSelect
          dark={dark}
          placeholder="Search vehicles…"
          emptyMessage="No vehicles found"
          value={form.vehicleId}
          onChange={(v) => {
            setForm((p) => ({ ...p, vehicleId: v }));
            setErrors((p) => ({ ...p, vehicleId: undefined }));
          }}
          options={vehicles.map((v) => ({
            value: String(v.Vehicle_ID),
            label: `${v.ownerName} — ${v.Make} ${v.Model} (${v.PlateNumber})`,
          }))}
        />
        {errors.vehicleId && (
          <p className="text-red-400 text-xs">{errors.vehicleId}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <p className={`text-xs ${muted}`}>Assign Mechanic</p>
        <SearchableSelect
          dark={dark}
          placeholder="Search mechanics…"
          emptyMessage="No mechanics found"
          value={form.mechanicId}
          onChange={(v) => {
            setForm((p) => ({ ...p, mechanicId: v }));
            setErrors((p) => ({ ...p, mechanicId: undefined }));
          }}
          options={mechanics.map((m) => ({
            value: String(m.Mechanic_ID),
            label: m.Specialization
              ? `${m.FullName} — ${m.Specialization}`
              : m.FullName,
          }))}
        />
        {errors.mechanicId && (
          <p className="text-red-400 text-xs">{errors.mechanicId}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <p className={`text-xs ${muted}`}>Job Date</p>
        <input
          className={inputCls}
          type="date"
          value={form.jobDate}
          onChange={set("jobDate")}
        />
        {errors.jobDate && (
          <p className="text-red-400 text-xs">{errors.jobDate}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <p className={`text-xs ${muted}`}>
          Reported Issue <span className={muted}>(optional)</span>
        </p>
        <textarea
          className={`${inputCls} resize-none`}
          placeholder="Describe the problem the customer reported..."
          rows={3}
          value={form.reportedIssue}
          onChange={set("reportedIssue")}
        />
      </div>

      <div
        className={`sticky bottom-0 -mx-5 -mb-5 px-5 py-4 flex gap-3 border-t ${border} ${dark ? "bg-[#111318]" : "bg-white"}`}
      >
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
          {loading ? "Creating…" : "Create Job Order"}
        </button>
      </div>
    </div>
  );
}

type ServiceOption = {
  Service_ID: number;
  ServiceName: string;
  Category: string | null;
  LaborRate: number;
};
type PartOption = {
  Part_ID: number;
  PartName: string;
  SKU: string | null;
  UnitPrice: number;
  StockQuantity: number;
};
type PartRow = { partId: number; quantity: number };

function StatusModal({
  job,
  onClose,
  onSave,
  dark,
  text,
  muted,
  border,
  primary,
}: {
  job: Job;
  onClose: () => void;
  onSave: (
    status: string,
    diagnosis: string,
    laborHours: string,
    serviceIds: number[],
    parts: PartRow[],
  ) => void;
  dark: boolean;
  card: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
}) {
  const [status, setStatus] = useState(job.Status);
  const [diagnosis, setDiagnosis] = useState(job.Diagnosis ?? "");
  const [laborHours, setLaborHours] = useState(
    job.LaborHours ? String(job.LaborHours) : "",
  );
  const [loading, setLoading] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  const [allServices, setAllServices] = useState<ServiceOption[]>([]);
  const [allParts, setAllParts] = useState<PartOption[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [partRows, setPartRows] = useState<PartRow[]>([]);
  const [addPartId, setAddPartId] = useState("");
  const [addPartQty, setAddPartQty] = useState("1");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [detailRes, servicesRes, partsRes] = await Promise.all([
        axios.get(`/api/v1/jobs/${job.Job_ID}`),
        axios.get("/api/v1/services", { params: { limit: 500 } }),
        axios.get("/api/v1/inventory", { params: { limit: 500 } }),
      ]);
      if (cancelled) return;
      setSelectedServiceIds(
        detailRes.data.services.map((s: { Service_ID: number }) => s.Service_ID),
      );
      setPartRows(
        detailRes.data.parts.map((p: { Part_ID: number; QuantityUsed: number }) => ({
          partId: p.Part_ID,
          quantity: p.QuantityUsed,
        })),
      );
      setAllServices(servicesRes.data.services);
      setAllParts(partsRes.data.parts);
      setLoadingCatalog(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [job.Job_ID]);

  const inputCls = `w-full rounded-xl border px-4 py-2.5 text-sm bg-transparent outline-none transition-colors
    ${dark ? "border-white/10 text-white placeholder:text-gray-600" : "border-gray-200 text-gray-900 placeholder:text-gray-400"}`;
  const selectCls = `w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors
    ${dark ? "border-white/10 text-white bg-[#111318]" : "border-gray-200 text-gray-900 bg-white"}`;

  const toggleService = (id: number) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const addPart = () => {
    const partId = Number(addPartId);
    const quantity = Number(addPartQty);
    if (!partId || quantity <= 0) return;
    setPartRows((prev) => {
      const existing = prev.find((p) => p.partId === partId);
      if (existing)
        return prev.map((p) =>
          p.partId === partId ? { ...p, quantity: p.quantity + quantity } : p,
        );
      return [...prev, { partId, quantity }];
    });
    setAddPartId("");
    setAddPartQty("1");
  };

  const removePart = (partId: number) => {
    setPartRows((prev) => prev.filter((p) => p.partId !== partId));
  };

  const servicesTotal = selectedServiceIds.reduce((sum, id) => {
    const s = allServices.find((s) => s.Service_ID === id);
    return sum + (s ? Number(s.LaborRate) : 0);
  }, 0);
  const partsTotal = partRows.reduce((sum, row) => {
    const p = allParts.find((p) => p.Part_ID === row.partId);
    return sum + (p ? Number(p.UnitPrice) * row.quantity : 0);
  }, 0);

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <p className={`text-xs ${muted}`}>Status</p>
        <select
          className={selectCls}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className={`text-xs ${muted}`}>
          Diagnosis <span className={muted}>(optional)</span>
        </p>
        <textarea
          className={`${inputCls} resize-none`}
          rows={3}
          placeholder="Mechanic findings..."
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className={`text-xs ${muted}`}>
          Labor Hours <span className={muted}>(optional)</span>
        </p>
        <input
          className={inputCls}
          type="number"
          min="0"
          step="0.5"
          placeholder="2.5"
          value={laborHours}
          onChange={(e) => setLaborHours(e.target.value)}
        />
      </div>

      <div className={`border-t pt-4 ${border}`}>
        <p className={`text-xs font-semibold mb-2 ${text}`}>Services</p>
        {loadingCatalog ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-8 w-full rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : !allServices.length ? (
          <p className={`text-xs ${muted}`}>No services in your catalog yet.</p>
        ) : (
          <div className={`rounded-xl border max-h-40 overflow-y-auto divide-y ${dark ? "border-white/10 divide-white/5" : "border-gray-200 divide-gray-100"}`}>
            {allServices.map((s) => (
              <label
                key={s.Service_ID}
                className="flex items-center justify-between gap-3 px-3 py-2 text-xs cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedServiceIds.includes(s.Service_ID)}
                    onChange={() => toggleService(s.Service_ID)}
                  />
                  <span className={text}>{s.ServiceName}</span>
                </span>
                <span className={muted}>₱{Number(s.LaborRate).toLocaleString()}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className={`border-t pt-4 ${border}`}>
        <p className={`text-xs font-semibold mb-2 ${text}`}>Parts Used</p>
        {!loadingCatalog && !partRows.length && (
          <p className={`text-xs mb-2 ${muted}`}>No parts added yet.</p>
        )}
        {!loadingCatalog && partRows.length > 0 && (
          <div className={`rounded-xl border mb-2 divide-y ${dark ? "border-white/10 divide-white/5" : "border-gray-200 divide-gray-100"}`}>
            {partRows.map((row) => {
              const p = allParts.find((p) => p.Part_ID === row.partId);
              return (
                <div
                  key={row.partId}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                >
                  <span className={text}>
                    {p?.PartName ?? `#${row.partId}`} × {row.quantity}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={muted}>
                      ₱{p ? (Number(p.UnitPrice) * row.quantity).toLocaleString() : "—"}
                    </span>
                    <button
                      onClick={() => removePart(row.partId)}
                      className="text-red-400"
                    >
                      <FaTimes size={10} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!loadingCatalog && (
          <div className="flex gap-2">
            <div className="flex-1">
              <SearchableSelect
                dark={dark}
                placeholder="Search parts…"
                emptyMessage="No parts found"
                value={addPartId}
                onChange={setAddPartId}
                options={allParts.map((p) => ({
                  value: String(p.Part_ID),
                  label: `${p.PartName} (${p.StockQuantity} in stock)`,
                }))}
              />
            </div>
            <input
              className={`${inputCls} w-16`}
              type="number"
              min="1"
              value={addPartQty}
              onChange={(e) => setAddPartQty(e.target.value)}
            />
            <button
              onClick={addPart}
              className={`px-3 rounded-xl border text-xs font-medium ${dark ? "border-white/10 text-gray-300 hover:text-white" : "border-gray-200 text-gray-600 hover:text-gray-900"}`}
            >
              Add
            </button>
          </div>
        )}
      </div>

      {!loadingCatalog && (
        <div
          className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold ${dark ? "bg-white/3" : "bg-gray-50"}`}
        >
          <span className={text}>Estimated Total</span>
          <span style={{ color: primary }}>
            ₱{(servicesTotal + partsTotal).toLocaleString()}
          </span>
        </div>
      )}

      <div
        className={`sticky bottom-0 -mx-5 -mb-5 px-5 py-4 flex gap-3 border-t ${border} ${dark ? "bg-[#111318]" : "bg-white"}`}
      >
        <button
          onClick={onClose}
          className={`flex-1 py-2.5 rounded-xl border text-sm font-medium ${dark ? "border-white/10 text-gray-400 hover:text-white" : "border-gray-200 text-gray-500 hover:text-gray-900"}`}
        >
          Cancel
        </button>
        <button
          onClick={() => {
            setLoading(true);
            onSave(status, diagnosis, laborHours, selectedServiceIds, partRows);
          }}
          disabled={loading || loadingCatalog}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
          style={{ backgroundColor: primary }}
        >
          {loading ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function JobDrawerContent({
  jobId,
  onStatusUpdate,
  onDelete,
  dark,
  text,
  muted,
  border,
  divide,
  primary,
}: {
  jobId: number;
  onStatusUpdate: (job: Job) => void;
  onDelete: (id: number) => void;
  dark: boolean;
  text: string;
  muted: string;
  border: string;
  divide: string;
  primary: string;
}) {
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    axios
      .get(`/api/v1/jobs/${jobId}`)
      .then((res) => setDetail(res.data))
      .finally(() => setLoading(false));
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading)
    return (
      <div className="p-5 flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  if (!detail)
    return <p className={`p-5 text-xs ${muted}`}>Failed to load job.</p>;

  const { job, services, parts, totalLabor, totalParts } = detail;
  const STATUS = dark ? STATUS_DARK : STATUS_LIGHT;
  const s = STATUS[job.Status] ?? STATUS["Pending"];

  return (
    <>
      <div className="p-5 flex flex-col gap-4">
        {/* vehicle + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <VehicleIcon make={job.Make} primary={primary} size={40} />
            <div>
              <p className={`text-sm font-semibold ${text}`}>
                {job.Make} {job.Model} {job.Year}
              </p>
              <p className={`text-xs font-mono ${muted}`}>{job.PlateNumber}</p>
            </div>
          </div>
          <span
            className="text-[10px] font-medium px-2 py-1 rounded-full shrink-0"
            style={{ color: s.color, backgroundColor: s.bg }}
          >
            {job.Status}
          </span>
        </div>

        {/* info grid */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Customer", value: job.customerName },
            { label: "Mechanic", value: job.mechanicName },
            {
              label: "Job Date",
              value: new Date(job.JobDate).toLocaleDateString("en-PH", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
            },
            { label: "Job #", value: `#${job.Job_ID}` },
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

        {/* reported issue */}
        {job.ReportedIssue && (
          <div
            className={`rounded-xl p-3 ${dark ? "bg-white/3" : "bg-gray-50"}`}
          >
            <p className={`text-[10px] ${muted} mb-1`}>Reported Issue</p>
            <p className={`text-xs ${text} leading-relaxed`}>
              {job.ReportedIssue}
            </p>
          </div>
        )}

        {/* diagnosis */}
        {job.Diagnosis && (
          <div
            className={`rounded-xl p-3 ${dark ? "bg-white/3" : "bg-gray-50"}`}
          >
            <p className={`text-[10px] ${muted} mb-1`}>Diagnosis</p>
            <p className={`text-xs ${text} leading-relaxed`}>{job.Diagnosis}</p>
          </div>
        )}

        {job.LaborHours && (
          <p className={`text-xs ${muted}`}>
            Labor Hours: <span className={text}>{job.LaborHours}h</span>
          </p>
        )}

        {/* actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onStatusUpdate(job)}
            className="flex-1 py-2 rounded-xl text-xs font-medium text-white transition-colors"
            style={{ backgroundColor: primary }}
          >
            Update Status
          </button>
          <button
            onClick={() => onDelete(job.Job_ID)}
            className="flex-1 py-2 rounded-xl text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* services */}
      <div className={`border-t ${border}`}>
        <p className={`px-5 py-3 text-xs font-semibold ${text}`}>
          Services{" "}
          <span className={`font-normal ${muted}`}>({services.length})</span>
        </p>
        <div className={`divide-y ${divide}`}>
          {!services.length ? (
            <p className={`px-5 py-3 text-xs ${muted}`}>
              No services added yet.
            </p>
          ) : (
            services.map((s) => (
              <div
                key={s.Service_ID}
                className="flex items-center justify-between px-5 py-3"
              >
                <div>
                  <p className={`text-xs font-medium ${text}`}>
                    {s.ServiceName}
                  </p>
                  {s.Category && (
                    <p className={`text-[10px] ${muted}`}>{s.Category}</p>
                  )}
                </div>
                <p className="text-xs font-semibold" style={{ color: primary }}>
                  ₱{Number(s.LaborRate).toLocaleString()}
                </p>
              </div>
            ))
          )}
          {services.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3">
              <p className={`text-xs font-semibold ${text}`}>Total Labor</p>
              <p className="text-xs font-bold" style={{ color: primary }}>
                ₱{totalLabor.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* parts */}
      <div className={`border-t ${border}`}>
        <p className={`px-5 py-3 text-xs font-semibold ${text}`}>
          Parts Used{" "}
          <span className={`font-normal ${muted}`}>({parts.length})</span>
        </p>
        <div className={`divide-y ${divide}`}>
          {!parts.length ? (
            <p className={`px-5 py-3 text-xs ${muted}`}>No parts added yet.</p>
          ) : (
            parts.map((p) => (
              <div
                key={p.Part_ID}
                className="flex items-center justify-between px-5 py-3"
              >
                <div>
                  <p className={`text-xs font-medium ${text}`}>{p.PartName}</p>
                  <p className={`text-[10px] font-mono ${muted}`}>
                    {p.SKU} × {p.QuantityUsed}
                  </p>
                </div>
                <p className="text-xs font-semibold" style={{ color: primary }}>
                  ₱{(Number(p.UnitPrice) * p.QuantityUsed).toLocaleString()}
                </p>
              </div>
            ))
          )}
          {parts.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3">
              <p className={`text-xs font-semibold ${text}`}>Total Parts</p>
              <p className="text-xs font-bold" style={{ color: primary }}>
                ₱{totalParts.toLocaleString()}
              </p>
            </div>
          )}
          {(services.length > 0 || parts.length > 0) && (
            <div
              className={`flex items-center justify-between px-5 py-3 ${dark ? "bg-white/3" : "bg-gray-50"}`}
            >
              <p className={`text-sm font-bold ${text}`}>Grand Total</p>
              <p className="text-sm font-bold" style={{ color: primary }}>
                ₱{(totalLabor + totalParts).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function JobOrdersPage() {
  const { dark, toggleTheme, primaryColor, userRole } = useTheme();
  const { setOpen } = useSidebar();
  const canAdd = userRole !== "Mechanic";

  const [jobs, setJobs] = useState<Job[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [mechanics, setMechanics] = useState<MechanicOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [drawerJobId, setDrawerJobId] = useState<number | null>(null);
  const [statusTarget, setStatusTarget] = useState<Job | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const limit = 10;
  const totalPages = Math.ceil(total / limit);
  const isDrawerOpen = drawerJobId !== null;

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

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/v1/jobs", {
        params: { search, page, status: statusFilter },
      });
      setJobs(res.data.jobs);
      setTotal(res.data.total);
      setVehicles(res.data.vehicles);
      setMechanics(res.data.mechanics);
    } catch {
      setError("Failed to load job orders.");
    } finally {
      setLoading(false);
    }
  }, [search, page, statusFilter]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

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

  const handleAdd = async (data: FormState) => {
    setFormLoading(true);
    setServerError("");
    try {
      await axios.post("/api/v1/jobs", {
        vehicleId: Number(data.vehicleId),
        mechanicId: Number(data.mechanicId),
        jobDate: data.jobDate,
        reportedIssue: data.reportedIssue || undefined,
      });
      setShowAdd(false);
      fetchJobs();
    } catch (err: any) {
      setServerError(
        err.response?.data?.error ?? "Failed to create job order.",
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusSave = async (
    status: string,
    diagnosis: string,
    laborHours: string,
    serviceIds: number[],
    parts: PartRow[],
  ) => {
    if (!statusTarget) return;
    try {
      await axios.put(`/api/v1/jobs/${statusTarget.Job_ID}`, {
        status,
        diagnosis: diagnosis || undefined,
        laborHours: laborHours ? Number(laborHours) : undefined,
        serviceIds,
        parts: parts.map((p) => ({ partId: p.partId, quantity: p.quantity })),
      });
      setStatusTarget(null);
      fetchJobs();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to update status.");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/api/v1/jobs/${id}`);
      setDeleteTarget(null);
      setDrawerJobId(null);
      fetchJobs();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to delete job.");
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
        <PageHeader title="Job Orders" />

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
              <h1 className={`text-lg font-semibold ${text}`}>Job Orders</h1>
              <p className={`text-sm mt-0.5 ${muted}`}>
                {total} job order{total !== 1 ? "s" : ""}
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
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {canAdd && (
                <button
                  onClick={() => {
                    setShowAdd(true);
                    setServerError("");
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  <FaPlus size={11} />
                  New Job Order
                </button>
              )}
            </div>
          </div>

          <div className={`rounded-2xl border overflow-hidden ${card}`}>
            <table className="w-full text-xs">
              <thead>
                <tr className={thBg}>
                  <th className={`text-left px-5 py-3 font-medium ${muted}`}>
                    Job
                  </th>
                  <th
                    className={`text-left px-5 py-3 font-medium ${muted} hidden sm:table-cell`}
                  >
                    Customer
                  </th>
                  <th
                    className={`text-left px-5 py-3 font-medium ${muted} hidden md:table-cell`}
                  >
                    Mechanic
                  </th>
                  <th className={`text-left px-5 py-3 font-medium ${muted}`}>
                    Status
                  </th>
                  <th
                    className={`text-left px-5 py-3 font-medium ${muted} hidden lg:table-cell`}
                  >
                    Date
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
                ) : !jobs.length ? (
                  <tr>
                    <td
                      colSpan={5}
                      className={`px-5 py-12 text-center ${muted}`}
                    >
                      {search
                        ? `No jobs matching "${search}"`
                        : "No job orders yet."}
                    </td>
                  </tr>
                ) : (
                  jobs.map((j) => (
                    <tr
                      key={j.Job_ID}
                      onClick={() => setDrawerJobId(j.Job_ID)}
                      className={`cursor-pointer transition-colors ${hoverRow}`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <VehicleIcon make={j.Make} primary={primaryColor} />
                          <div>
                            <p className={`font-medium ${text}`}>
                              {j.Make} {j.Model}
                            </p>
                            <p className={`text-[10px] font-mono ${muted}`}>
                              {j.PlateNumber} · #{j.Job_ID}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className={`px-5 py-3 ${text} hidden sm:table-cell`}>
                        {j.customerName}
                      </td>
                      <td className={`px-5 py-3 ${muted} hidden md:table-cell`}>
                        {j.mechanicName}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={j.Status} dark={dark} />
                      </td>
                      <td className={`px-5 py-3 ${muted} hidden lg:table-cell`}>
                        {new Date(j.JobDate).toLocaleDateString("en-PH", {
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
          </div>
        </main>

        {showAdd && (
          <Modal
            title="New Job Order"
            size="lg"
            onClose={() => setShowAdd(false)}
            card={card}
            text={text}
            border={border}
          >
            {serverError && (
              <p className="px-5 pt-4 text-xs text-red-400">{serverError}</p>
            )}
            <JobForm
              vehicles={vehicles}
              mechanics={mechanics}
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

        {statusTarget && (
          <Modal
            title="Update Job Status"
            size="lg"
            onClose={() => setStatusTarget(null)}
            card={card}
            text={text}
            border={border}
          >
            <StatusModal
              job={statusTarget}
              onClose={() => setStatusTarget(null)}
              onSave={handleStatusSave}
              dark={dark}
              card={card}
              text={text}
              muted={muted}
              border={border}
              primary={primaryColor}
            />
          </Modal>
        )}

        {deleteTarget !== null && (
          <Modal
            title="Delete Job Order"
            size="lg"
            onClose={() => setDeleteTarget(null)}
            card={card}
            text={text}
            border={border}
          >
            <div className="p-5 flex flex-col gap-4">
              <p className={`text-sm ${muted}`}>
                This will permanently delete the job order and all associated
                service and parts records.
              </p>
              <div
                className={`sticky bottom-0 -mx-5 -mb-5 px-5 py-4 flex gap-3 border-t ${border} ${card}`}
              >
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
        onClose={() => setDrawerJobId(null)}
        title="Job Order Details"
        dark={dark}
        card={card}
        text={text}
        border={border}
      >
        {drawerJobId !== null && (
          <JobDrawerContent
            jobId={drawerJobId}
            onStatusUpdate={(job) => {
              setStatusTarget(job);
            }}
            onDelete={(id) => {
              setDeleteTarget(id);
              setDrawerJobId(null);
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
