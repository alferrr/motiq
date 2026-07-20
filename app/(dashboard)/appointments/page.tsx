"use client";

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "@/context/ThemeContext";
import Drawer from "@/components/shared/Drawer";
import Modal from "@/components/shared/Modal";
import SearchableSelect from "@/components/shared/SearchableSelect";
import axios from "axios";
import {
  FaPlus,
  FaChevronLeft,
  FaChevronRight,
  FaCalendarAlt,
  FaList,
} from "react-icons/fa";
import PageHeader from "@/components/shared/PageHeader";

type Appointment = {
  Appointment_ID: number;
  AppointmentDate: string;
  AppointmentTime: string;
  Reason: string;
  Status: "Scheduled" | "Completed" | "Cancelled";
  Customer_ID: number;
  customerName: string;
  ContactNumber: string;
  Vehicle_ID: number;
  Make: string;
  Model: string;
  PlateNumber: string;
};

type CustomerOption = { Customer_ID: number; FullName: string };
type VehicleOption = {
  Vehicle_ID: number;
  Make: string;
  Model: string;
  PlateNumber: string;
  ownerName: string;
};

type FormState = {
  customerId: string;
  vehicleId: string;
  appointmentDate: string;
  appointmentTime: string;
  reason: string;
};
type FormErrors = Partial<Record<keyof FormState, string>>;

const STATUS_STYLE = {
  Scheduled: { color: "#3b82f6", bg: "#3b82f620", dot: "#3b82f6" },
  Completed: { color: "#10b981", bg: "#10b98120", dot: "#10b981" },
  Cancelled: { color: "#ef4444", bg: "#ef444420", dot: "#ef4444" },
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${pad(m)} ${ampm}`;
}

function parseDate(dateStr: string) {
  const d = dateStr.split("T")[0];
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}


function AppointmentForm({
  initial,
  customers,
  vehicles,
  onSubmit,
  onCancel,
  loading,
  dark,
  muted,
  border,
  primary,
}: {
  initial?: Partial<FormState>;
  customers: CustomerOption[];
  vehicles: VehicleOption[];
  onSubmit: (data: FormState) => void;
  onCancel: () => void;
  loading: boolean;
  dark: boolean;
  muted: string;
  border: string;
  primary: string;
}) {
  const [form, setForm] = useState<FormState>({
    customerId: "",
    vehicleId: "",
    appointmentDate: "",
    appointmentTime: "",
    reason: "",
    ...initial,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const inputCls = `w-full rounded-xl border px-4 py-2.5 text-sm bg-transparent outline-none transition-colors
    ${dark ? "border-white/10 text-white placeholder:text-gray-600" : "border-gray-200 text-gray-900 placeholder:text-gray-400"}`;

  const filteredVehicles = form.customerId
    ? vehicles.filter(
        (v) =>
          v.ownerName ===
          customers.find((c) => String(c.Customer_ID) === form.customerId)
            ?.FullName,
      )
    : vehicles;

  const set =
    (key: keyof FormState) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      setForm((p) => ({ ...p, [key]: e.target.value }));
      setErrors((p) => ({ ...p, [key]: undefined }));
      if (key === "customerId")
        setForm((p) => ({ ...p, customerId: e.target.value, vehicleId: "" }));
    };

  const validate = () => {
    const e: FormErrors = {};
    if (!form.customerId) e.customerId = "Customer is required";
    if (!form.vehicleId) e.vehicleId = "Vehicle is required";
    if (!form.appointmentDate) e.appointmentDate = "Date is required";
    if (!form.appointmentTime) e.appointmentTime = "Time is required";
    setErrors(e);
    return !Object.keys(e).length;
  };

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <p className={`text-xs ${muted}`}>Customer</p>
        <SearchableSelect
          dark={dark}
          placeholder="Search customers…"
          emptyMessage="No customers found"
          value={form.customerId}
          onChange={(v) => {
            setForm((p) => ({ ...p, customerId: v, vehicleId: "" }));
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
          disabled={!form.customerId}
          options={filteredVehicles.map((v) => ({
            value: String(v.Vehicle_ID),
            label: `${v.Make} ${v.Model} (${v.PlateNumber})`,
          }))}
        />
        {errors.vehicleId && (
          <p className="text-red-400 text-xs">{errors.vehicleId}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <p className={`text-xs ${muted}`}>Date</p>
          <input
            className={inputCls}
            type="date"
            value={form.appointmentDate}
            onChange={set("appointmentDate")}
          />
          {errors.appointmentDate && (
            <p className="text-red-400 text-xs">{errors.appointmentDate}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <p className={`text-xs ${muted}`}>Time</p>
          <input
            className={inputCls}
            type="time"
            value={form.appointmentTime}
            onChange={set("appointmentTime")}
          />
          {errors.appointmentTime && (
            <p className="text-red-400 text-xs">{errors.appointmentTime}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className={`text-xs ${muted}`}>
          Reason <span className={muted}>(optional)</span>
        </p>
        <textarea
          className={`${inputCls} resize-none`}
          rows={2}
          placeholder="Oil change, brake check..."
          value={form.reason}
          onChange={set("reason")}
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
          {loading ? "Saving…" : "Book Appointment"}
        </button>
      </div>
    </div>
  );
}

function AppointmentDrawerContent({
  appt,
  onStatusChange,
  onDelete,
  canEdit,
  dark,
  text,
  muted,
}: {
  appt: Appointment;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
  canEdit: boolean;
  dark: boolean;
  text: string;
  muted: string;
}) {
  const s = STATUS_STYLE[appt.Status];

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-medium px-2 py-1 rounded-full"
          style={{ color: s.color, backgroundColor: s.bg }}
        >
          {appt.Status}
        </span>
        <p className={`text-xs ${muted}`}>#{appt.Appointment_ID}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className={`rounded-xl p-3 ${dark ? "bg-white/3" : "bg-gray-50"}`}>
          <p className={`text-[10px] ${muted}`}>Date</p>
          <p className={`text-xs font-semibold mt-0.5 ${text}`}>
            {parseDate(appt.AppointmentDate).toLocaleDateString("en-PH", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${dark ? "bg-white/3" : "bg-gray-50"}`}>
          <p className={`text-[10px] ${muted}`}>Time</p>
          <p className={`text-xs font-semibold mt-0.5 ${text}`}>
            {fmtTime(appt.AppointmentTime)}
          </p>
        </div>
      </div>

      <div className={`rounded-xl p-3 ${dark ? "bg-white/3" : "bg-gray-50"}`}>
        <p className={`text-[10px] ${muted} mb-1`}>Customer</p>
        <p className={`text-xs font-medium ${text}`}>{appt.customerName}</p>
        <p className={`text-[10px] ${muted}`}>{appt.ContactNumber}</p>
      </div>

      <div className={`rounded-xl p-3 ${dark ? "bg-white/3" : "bg-gray-50"}`}>
        <p className={`text-[10px] ${muted} mb-1`}>Vehicle</p>
        <p className={`text-xs font-medium ${text}`}>
          {appt.Make} {appt.Model}
        </p>
        <p className={`text-[10px] font-mono ${muted}`}>{appt.PlateNumber}</p>
      </div>

      {appt.Reason && (
        <div className={`rounded-xl p-3 ${dark ? "bg-white/3" : "bg-gray-50"}`}>
          <p className={`text-[10px] ${muted} mb-1`}>Reason</p>
          <p className={`text-xs ${text}`}>{appt.Reason}</p>
        </div>
      )}

      {canEdit && appt.Status === "Scheduled" && (
        <div className="flex gap-2">
          <button
            onClick={() => onStatusChange(appt.Appointment_ID, "Completed")}
            className="flex-1 py-2 rounded-xl text-xs font-medium text-white transition-colors"
            style={{ backgroundColor: "#10b981" }}
          >
            Mark Completed
          </button>
          <button
            onClick={() => onStatusChange(appt.Appointment_ID, "Cancelled")}
            className="flex-1 py-2 rounded-xl text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {canEdit && (
        <button
          onClick={() => onDelete(appt.Appointment_ID)}
          className={`w-full py-2 rounded-xl border text-xs font-medium transition-colors
            ${dark ? "border-white/10 text-gray-400 hover:text-red-400" : "border-gray-200 text-gray-500 hover:text-red-500"}`}
        >
          Delete Appointment
        </button>
      )}
    </div>
  );
}

export default function AppointmentsPage() {
  const { dark, primaryColor, userRole } = useTheme();
  const canAdd = userRole !== "Mechanic";

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addDate, setAddDate] = useState("");
  const [drawerAppt, setDrawerAppt] = useState<Appointment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"calendar" | "list">("calendar");

  const isDrawerOpen = drawerAppt !== null;

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

  const monthKey = `${year}-${pad(month + 1)}`;

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/v1/appointments", {
        params: { month: monthKey },
      });
      setAppointments(res.data.appointments);
      setCustomers(res.data.customers);
      setVehicles(res.data.vehicles);
    } catch {
      setError("Failed to load appointments.");
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    const handler = (e: Event) => {
      const value = (e as CustomEvent).detail as string;
      setSearch(value);
    };
    window.addEventListener("page-search", handler);
    return () => window.removeEventListener("page-search", handler);
  }, []);

  // parse just the date part regardless of what MySQL returns
  const parseDate = (dateStr: string) => {
    const d = dateStr.split("T")[0]; // "2026-07-04"
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day);
  };

  const q = search.trim().toLowerCase();
  const filteredAppointments = q
    ? appointments.filter((a) =>
        [a.customerName, a.PlateNumber, a.Make, a.Model, a.Reason]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : appointments;

  // group appointments by day
  const apptsByDay = filteredAppointments.reduce<Record<number, Appointment[]>>(
    (acc, a) => {
      const d = parseDate(a.AppointmentDate).getDate();
      if (!acc[d]) acc[d] = [];
      acc[d].push(a);
      return acc;
    },
    {},
  );

  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    const dateDiff =
      parseDate(a.AppointmentDate).getTime() -
      parseDate(b.AppointmentDate).getTime();
    return dateDiff !== 0
      ? dateDiff
      : a.AppointmentTime.localeCompare(b.AppointmentTime);
  });

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIdx = getFirstDayOfMonth(year, month);
  const totalCells = Math.ceil((firstDayIdx + daysInMonth) / 7) * 7;

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
    setSelectedDay(null);
  };

  const selectedAppts =
    selectedDay !== null ? (apptsByDay[selectedDay] ?? []) : [];

  const handleAdd = async (data: FormState) => {
    setFormLoading(true);
    setServerError("");
    try {
      await axios.post("/api/v1/appointments", {
        customerId: Number(data.customerId),
        vehicleId: Number(data.vehicleId),
        appointmentDate: data.appointmentDate,
        appointmentTime: data.appointmentTime,
        reason: data.reason || undefined,
      });
      setShowAdd(false);
      setAddDate("");
      fetchAppointments();
    } catch (err: any) {
      setServerError(
        err.response?.data?.error ?? "Failed to book appointment.",
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await axios.put(`/api/v1/appointments/${id}`, { status });
      setDrawerAppt(null);
      fetchAppointments();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to update appointment.");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/api/v1/appointments/${id}`);
      setDeleteTarget(null);
      setDrawerAppt(null);
      fetchAppointments();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Failed to delete appointment.");
    }
  };

  const today = now.getDate();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;

  return (
    <div suppressHydrationWarning className="flex-1 flex relative min-h-0">
      <div
        className={`flex-1 flex flex-col min-h-0 ${innerBg} ${text} transition-[filter] duration-300`}
        style={{ filter: isDrawerOpen ? "blur(3px)" : "none" }}
      >
        <PageHeader title="Appointments" />

        <main className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto min-h-0 *:shrink-0">
          {error && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${dark ? "bg-red-900/20 border-red-800/50 text-red-400" : "bg-red-50 border-red-200 text-red-600"}`}
            >
              {error}
            </div>
          )}

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className={`text-lg font-semibold ${text}`}>Appointments</h1>
              <p className={`text-sm mt-0.5 ${muted}`}>
                {
                  filteredAppointments.filter((a) => a.Status === "Scheduled")
                    .length
                }{" "}
                scheduled this month
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-0.5 p-0.5 rounded-full border ${dark ? "border-white/5 bg-white/3" : "border-gray-200 bg-gray-100"}`}
              >
                {(
                  [
                    { key: "calendar", label: "Calendar", Icon: FaCalendarAlt },
                    { key: "list", label: "List", Icon: FaList },
                  ] as const
                ).map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    onClick={() => setView(key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                    style={
                      view === key
                        ? {
                            backgroundColor: dark ? "#fff" : "#111",
                            color: dark ? "#111" : "#fff",
                          }
                        : { color: dark ? "#6b7280" : "#9ca3af" }
                    }
                  >
                    <Icon size={10} />
                    {label}
                  </button>
                ))}
              </div>
              {canAdd && (
                <button
                  onClick={() => {
                    setShowAdd(true);
                    setServerError("");
                    setAddDate("");
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
                >
                  <FaPlus size={11} />
                  Book Appointment
                </button>
              )}
            </div>
          </div>

          {view === "list" ? (
            <div className={`rounded-2xl border overflow-hidden ${card}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={thBg}>
                      <th
                        className={`text-left font-medium text-xs px-5 py-3 ${muted}`}
                      >
                        Date & Time
                      </th>
                      <th
                        className={`text-left font-medium text-xs px-5 py-3 ${muted}`}
                      >
                        Customer
                      </th>
                      <th
                        className={`text-left font-medium text-xs px-5 py-3 ${muted}`}
                      >
                        Vehicle
                      </th>
                      <th
                        className={`text-left font-medium text-xs px-5 py-3 ${muted}`}
                      >
                        Reason
                      </th>
                      <th
                        className={`text-left font-medium text-xs px-5 py-3 ${muted}`}
                      >
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${divide}`}>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-5 py-3.5" colSpan={5}>
                            <Skeleton className="h-4 w-full" />
                          </td>
                        </tr>
                      ))
                    ) : !sortedAppointments.length ? (
                      <tr>
                        <td
                          colSpan={5}
                          className={`px-5 py-10 text-center text-xs ${muted}`}
                        >
                          {q
                            ? `No appointments matching "${search}".`
                            : "No appointments this month."}
                        </td>
                      </tr>
                    ) : (
                      sortedAppointments.map((a) => {
                        const s = STATUS_STYLE[a.Status];
                        return (
                          <tr
                            key={a.Appointment_ID}
                            onClick={() => setDrawerAppt(a)}
                            className={`cursor-pointer transition-colors ${hoverRow}`}
                          >
                            <td className={`px-5 py-3.5 whitespace-nowrap ${text}`}>
                              {parseDate(a.AppointmentDate).toLocaleDateString(
                                "en-PH",
                                { month: "short", day: "numeric" },
                              )}{" "}
                              · {fmtTime(a.AppointmentTime)}
                            </td>
                            <td className={`px-5 py-3.5 font-medium ${text}`}>
                              {a.customerName}
                            </td>
                            <td className={`px-5 py-3.5 ${muted}`}>
                              {a.Make} {a.Model}{" "}
                              <span className="font-mono text-xs">
                                ({a.PlateNumber})
                              </span>
                            </td>
                            <td
                              className={`px-5 py-3.5 max-w-55 truncate ${muted}`}
                            >
                              {a.Reason || "—"}
                            </td>
                            <td className="px-5 py-3.5">
                              <span
                                className="text-[10px] font-medium px-2 py-1 rounded-full"
                                style={{
                                  color: s.color,
                                  backgroundColor: s.bg,
                                }}
                              >
                                {a.Status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div
              className={`lg:col-span-2 rounded-2xl border overflow-hidden ${card}`}
            >
              <div
                className={`flex items-center justify-between px-5 py-4 border-b ${border}`}
              >
                <button
                  onClick={prevMonth}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-colors ${dark ? "border-white/10 text-gray-400 hover:text-white" : "border-gray-200 text-gray-400 hover:text-gray-700"}`}
                >
                  <FaChevronLeft size={10} />
                </button>
                <p className={`text-sm font-semibold ${text}`}>
                  {MONTHS[month]} {year}
                </p>
                <button
                  onClick={nextMonth}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-colors ${dark ? "border-white/10 text-gray-400 hover:text-white" : "border-gray-200 text-gray-400 hover:text-gray-700"}`}
                >
                  <FaChevronRight size={10} />
                </button>
              </div>

              <div className="grid grid-cols-7">
                {DAYS.map((d) => (
                  <div
                    key={d}
                    className={`text-center py-2 text-[10px] font-medium ${muted}`}
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div className={`grid grid-cols-7 border-t ${border}`}>
                {Array.from({ length: totalCells }).map((_, i) => {
                  const dayNum = i - firstDayIdx + 1;
                  const isValid = dayNum >= 1 && dayNum <= daysInMonth;
                  const dayAppts = isValid ? (apptsByDay[dayNum] ?? []) : [];
                  const isToday = isValid && isCurrentMonth && dayNum === today;
                  const isSelected = isValid && selectedDay === dayNum;

                  return (
                    <div
                      key={i}
                      onClick={() =>
                        isValid && setSelectedDay(isSelected ? null : dayNum)
                      }
                      className={`relative min-h-18 p-2 border-b border-r transition-colors
                        ${border}
                        ${isValid ? "cursor-pointer" : ""}
                        ${isSelected ? "" : isValid ? (dark ? "hover:bg-white/3" : "hover:bg-gray-50") : ""}
                        ${!isValid ? (dark ? "bg-white/1" : "bg-gray-50/50") : ""}
                      `}
                      style={
                        isSelected
                          ? { backgroundColor: primaryColor + "15" }
                          : {}
                      }
                    >
                      {isValid && (
                        <>
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1 transition-colors`}
                            style={
                              isToday
                                ? {
                                    backgroundColor: primaryColor,
                                    color: "#fff",
                                  }
                                : {
                                    color: dark
                                      ? isSelected
                                        ? "#fff"
                                        : "#9ca3af"
                                      : isSelected
                                        ? "#111"
                                        : "#374151",
                                  }
                            }
                          >
                            {dayNum}
                          </div>

                          <div className="flex flex-col gap-0.5">
                            {loading
                              ? null
                              : dayAppts.slice(0, 3).map((a, idx) => {
                                  const s = STATUS_STYLE[a.Status];
                                  return (
                                    <div
                                      key={idx}
                                      className="rounded px-1 py-0.5 text-[9px] font-medium truncate leading-tight"
                                      style={{
                                        backgroundColor: s.bg,
                                        color: s.color,
                                      }}
                                    >
                                      {fmtTime(a.AppointmentTime)}{" "}
                                      {a.customerName.split(" ")[0]}
                                    </div>
                                  );
                                })}
                            {dayAppts.length > 3 && (
                              <p className={`text-[9px] ${muted}`}>
                                +{dayAppts.length - 3} more
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div
                className={`rounded-2xl border overflow-hidden flex-1 ${card}`}
              >
                <div className={`px-5 py-4 border-b ${border}`}>
                  <p className={`text-sm font-semibold ${text}`}>
                    {selectedDay
                      ? `${MONTHS[month]} ${selectedDay}`
                      : "Select a day"}
                  </p>
                  {selectedDay && (
                    <p className={`text-xs mt-0.5 ${muted}`}>
                      {selectedAppts.length} appointment
                      {selectedAppts.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>

                <div className={`divide-y ${divide}`}>
                  {!selectedDay ? (
                    <p className={`px-5 py-8 text-xs text-center ${muted}`}>
                      Click a day to see appointments.
                    </p>
                  ) : loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="px-5 py-3">
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ))
                  ) : !selectedAppts.length ? (
                    <div className="px-5 py-8 flex flex-col items-center gap-3">
                      <p className={`text-xs text-center ${muted}`}>
                        No appointments on this day.
                      </p>
                      {canAdd && (
                        <button
                          onClick={() => {
                            setAddDate(
                              `${year}-${pad(month + 1)}-${pad(selectedDay)}`,
                            );
                            setShowAdd(true);
                            setServerError("");
                          }}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium text-white"
                          style={{ backgroundColor: primaryColor }}
                        >
                          + Book here
                        </button>
                      )}
                    </div>
                  ) : (
                    selectedAppts.map((a) => {
                      const s = STATUS_STYLE[a.Status];
                      return (
                        <div
                          key={a.Appointment_ID}
                          onClick={() => setDrawerAppt(a)}
                          className={`px-5 py-3 cursor-pointer transition-colors ${dark ? "hover:bg-white/3" : "hover:bg-gray-50"}`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <p className={`text-xs font-medium ${text}`}>
                              {a.customerName}
                            </p>
                            <span
                              className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                              style={{ color: s.color, backgroundColor: s.bg }}
                            >
                              {a.Status}
                            </span>
                          </div>
                          <p className={`text-[11px] ${muted}`}>
                            {a.Make} {a.Model} · {fmtTime(a.AppointmentTime)}
                          </p>
                          {a.Reason && (
                            <p className={`text-[10px] ${muted} truncate`}>
                              {a.Reason}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className={`rounded-2xl border overflow-hidden ${card}`}>
                <div className={`px-5 py-4 border-b ${border}`}>
                  <p className={`text-sm font-semibold ${text}`}>Upcoming</p>
                </div>
                <div className={`divide-y ${divide}`}>
                  {loading
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="px-5 py-3">
                          <Skeleton className="h-8 w-full" />
                        </div>
                      ))
                    : filteredAppointments
                        .filter(
                          (a) =>
                            a.Status === "Scheduled" &&
                            parseDate(a.AppointmentDate) >=
                              new Date(new Date().toDateString()),
                        )
                        .slice(0, 5)
                        .map((a) => (
                          <div
                            key={a.Appointment_ID}
                            onClick={() => setDrawerAppt(a)}
                            className={`flex items-start gap-3 px-5 py-3 cursor-pointer transition-colors ${dark ? "hover:bg-white/3" : "hover:bg-gray-50"}`}
                          >
                            <div
                              className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                              style={{ backgroundColor: primaryColor }}
                            />
                            <div className="min-w-0">
                              <p
                                className={`text-xs font-medium truncate ${text}`}
                              >
                                {a.customerName}
                              </p>
                              <p className={`text-[10px] ${muted}`}>
                                {parseDate(
                                  a.AppointmentDate,
                                ).toLocaleDateString("en-PH", {
                                  month: "short",
                                  day: "numeric",
                                })}{" "}
                                · {fmtTime(a.AppointmentTime)}
                              </p>
                            </div>
                          </div>
                        ))}
                  {!loading &&
                    filteredAppointments.filter(
                      (a) => a.Status === "Scheduled",
                    ).length === 0 && (
                      <p className={`px-5 py-5 text-xs ${muted}`}>
                        No upcoming appointments.
                      </p>
                    )}
                </div>
              </div>
            </div>
          </div>
          )}
        </main>

        {showAdd && (
          <Modal
            title="Book Appointment"
            onClose={() => {
              setShowAdd(false);
              setAddDate("");
            }}
            card={card}
            text={text}
            border={border}
          >
            {serverError && (
              <p className="px-5 pt-4 text-xs text-red-400">{serverError}</p>
            )}
            <AppointmentForm
              initial={addDate ? { appointmentDate: addDate } : undefined}
              customers={customers}
              vehicles={vehicles}
              onSubmit={handleAdd}
              onCancel={() => {
                setShowAdd(false);
                setAddDate("");
              }}
              loading={formLoading}
              dark={dark}
              muted={muted}
              border={border}
              primary={primaryColor}
            />
          </Modal>
        )}

        {deleteTarget !== null && (
          <Modal
            title="Delete Appointment"
            onClose={() => setDeleteTarget(null)}
            card={card}
            text={text}
            border={border}
          >
            <div className="p-5 flex flex-col gap-4">
              <p className={`text-sm ${muted}`}>
                This will permanently delete the appointment.
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
        onClose={() => setDrawerAppt(null)}
        title="Appointment Details"
        dark={dark}
        card={card}
        text={text}
        border={border}
      >
        {drawerAppt !== null && (
          <AppointmentDrawerContent
            appt={drawerAppt}
            onStatusChange={handleStatusChange}
            onDelete={(id) => {
              setDeleteTarget(id);
              setDrawerAppt(null);
            }}
            canEdit={canAdd}
            dark={dark}
            text={text}
            muted={muted}
          />
        )}
      </Drawer>
    </div>
  );
}
