"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useSidebar } from "@/context/SidebarContext";
import axios from "axios";
import {
  FaBars,
  FaBell,
  FaSearch,
  FaMoon,
  FaSun,
  FaArrowUp,
  FaArrowDown,
} from "react-icons/fa";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import PageHeader from "@/components/shared/PageHeader";

type SalesPoint = { month: string; Revenue: number };

// admin
type AdminData = {
  stats: {
    totalCustomers: number;
    totalVehicles: number;
    activeRepairs: number;
    todayAppointments: number;
    monthlyRevenue: number;
    lowStockCount: number;
  };
  recentJobs: {
    Job_ID: number;
    Status: string;
    JobDate: string;
    CustomerName: string;
    Make: string;
    Model: string;
    MechanicName: string;
  }[];
  salesChart: SalesPoint[];
  appointments: {
    time: string;
    customer: string;
    Make: string;
    Model: string;
    reason: string;
  }[];
  lowStock: { PartName: string; SKU: string; qty: number; min: number }[];
};

// front desk
type FrontDeskData = {
  counts: {
    todayApptCount: number;
    pendingCount: number;
    readyCount: number;
    todayRevenue: number;
  };
  appointments: {
    Appointment_ID: number;
    time: string;
    customer: string;
    Make: string;
    Model: string;
    PlateNumber: string;
    reason: string;
  }[];
  pendingJobs: {
    Job_ID: number;
    customer: string;
    Make: string;
    Model: string;
    PlateNumber: string;
    mechanic: string;
    JobDate: string;
  }[];
  readyVehicles: {
    Job_ID: number;
    customer: string;
    Make: string;
    Model: string;
    PlateNumber: string;
    JobDate: string;
  }[];
  recentCustomers: {
    Customer_ID: number;
    FullName: string;
    ContactNumber: string;
    CreatedAt: string;
  }[];
  todayPayments: {
    Payment_ID: number;
    customer: string;
    AmountPaid: number;
    PaymentMethod: string;
  }[];
};

// mechanic
type MechanicData = {
  counts: {
    pendingCount: number;
    inProgressCount: number;
    completedCount: number;
    totalCount: number;
  };
  assignedJobs: {
    Job_ID: number;
    Status: string;
    JobDate: string;
    customer: string;
    Make: string;
    Model: string;
    Year: number;
    PlateNumber: string;
    ReportedIssue: string;
  }[];
  completedJobs: {
    Job_ID: number;
    Status: string;
    JobDate: string;
    customer: string;
    Make: string;
    Model: string;
    PlateNumber: string;
  }[];
};

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

function StatCard({
  label,
  value,
  sub,
  up,
  loading,
  dark,
  primary,
  card,
  text,
  muted,
}: {
  label: string;
  value: string;
  sub?: string;
  up?: boolean;
  loading: boolean;
  dark: boolean;
  primary: string;
  card: string;
  text: string;
  muted: string;
}) {
  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-3 ${card}`}>
      <p className={`text-xs ${muted}`}>{label}</p>
      {loading ? (
        <Skeleton className="h-8 w-28" />
      ) : (
        <p className={`text-2xl font-semibold tracking-tight ${text}`}>
          {value}
        </p>
      )}
      {sub && (
        <div className="flex items-center gap-1">
          {up !== undefined &&
            (up ? (
              <FaArrowUp size={9} color={primary} />
            ) : (
              <FaArrowDown size={9} className="text-red-500" />
            ))}
          <p
            className={`text-xs ${up ? "" : "text-red-500"}`}
            style={up ? { color: primary } : {}}
          >
            {sub}
          </p>
        </div>
      )}
    </div>
  );
}

function SectionCard({
  title,
  children,
  action,
  dark,
  card,
  text,
  muted,
  border,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  dark: boolean;
  card: string;
  text: string;
  muted: string;
  border: string;
}) {
  return (
    <div className={`rounded-2xl border overflow-hidden ${card}`}>
      <div
        className={`flex items-center justify-between px-5 py-4 border-b ${border}`}
      >
        <p className={`text-sm font-semibold ${text}`}>{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label, dark }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className={`rounded-xl border px-3 py-2 text-xs shadow-lg ${dark ? "bg-[#1a1d24] border-white/10 text-white" : "bg-white border-gray-100 text-gray-900"}`}
    >
      <p className="mb-0.5 font-medium">{label}</p>
      <p>₱{Number(payload[0].value).toLocaleString()}</p>
    </div>
  );
}

function StatusBadge({ status, dark }: { status: string; dark: boolean }) {
  const s =
    (dark ? STATUS_DARK : STATUS_LIGHT)[status] ??
    (dark ? STATUS_DARK : STATUS_LIGHT)["Pending"];
  return (
    <span
      className="px-2 py-1 rounded-full text-[10px] font-medium"
      style={{ color: s.color, backgroundColor: s.bg }}
    >
      {status}
    </span>
  );
}

function Topbar({
  title,
  dark,
  toggleTheme,
  primaryColor,
  muted,
  text,
}: {
  title: string;
  dark: boolean;
  toggleTheme: () => void;
  primaryColor: string;
  muted: string;
  text: string;
}) {
  const { setOpen } = useSidebar();
  return <PageHeader title="Dashboard" />;
}

function AdminDashboard({
  dark,
  card,
  text,
  muted,
  subtle,
  divide,
  thBg,
  border,
  primary,
  fmt,
}: any) {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState<"Days" | "Week" | "Month">("Month");

  useEffect(() => {
    axios
      .get("/api/v1/dashboard")
      .then((res) => setData(res.data))
      .catch(() => setError("Failed to load data."))
      .finally(() => setLoading(false));
  }, []);

  const chartData = (data?.salesChart ?? []).map((d) => ({
    month: d.month,
    Revenue: Number(d.Revenue),
  }));

  const RangeToggle = ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: any) => void;
  }) => (
    <div
      className={`flex items-center gap-0.5 p-0.5 rounded-full border ${dark ? "border-white/5 bg-white/3" : "border-gray-200 bg-gray-100"}`}
    >
      {(["Days", "Week", "Month"] as const).map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
          style={
            value === r
              ? {
                  backgroundColor: dark ? "#fff" : "#111",
                  color: dark ? "#111" : "#fff",
                }
              : { color: dark ? "#6b7280" : "#9ca3af" }
          }
        >
          {r}
        </button>
      ))}
    </div>
  );

  return (
    <main className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
      {error && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${dark ? "bg-red-900/20 border-red-800/50 text-red-400" : "bg-red-50 border-red-200 text-red-600"}`}
        >
          {error}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className={`text-lg font-semibold ${text}`}>Overview</h1>
          <p className={`text-sm mt-0.5 ${muted}`}>
            {data?.stats.activeRepairs
              ? `${data.stats.activeRepairs} active repair${data.stats.activeRepairs > 1 ? "s" : ""} in progress.`
              : "Everything looks good today."}
          </p>
        </div>
        <RangeToggle value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Customers"
          value={String(data?.stats.totalCustomers ?? 0)}
          sub="+12% vs last month"
          up
          loading={loading}
          dark={dark}
          primary={primary}
          card={card}
          text={text}
          muted={muted}
        />
        <StatCard
          label="Monthly Revenue"
          value={fmt(data?.stats.monthlyRevenue ?? 0)}
          sub="+21.8% vs last month"
          up
          loading={loading}
          dark={dark}
          primary={primary}
          card={card}
          text={text}
          muted={muted}
        />
        <StatCard
          label="Active Repairs"
          value={String(data?.stats.activeRepairs ?? 0)}
          sub="+16.8% vs last month"
          up
          loading={loading}
          dark={dark}
          primary={primary}
          card={card}
          text={text}
          muted={muted}
        />
        <StatCard
          label="Low Stock Items"
          value={String(data?.stats.lowStockCount ?? 0)}
          sub="-12.8% vs last month"
          up={false}
          loading={loading}
          dark={dark}
          primary={primary}
          card={card}
          text={text}
          muted={muted}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className={`lg:col-span-3 rounded-2xl border p-5 ${card}`}>
          <div className="flex items-center justify-between mb-5">
            <p className={`text-sm font-semibold ${text}`}>Revenue Growth</p>
            <RangeToggle value={range} onChange={setRange} />
          </div>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : !chartData.length ? (
            <div className="h-48 flex items-center justify-center">
              <p className={`text-xs ${muted}`}>No revenue data yet.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={192}>
              <AreaChart
                data={chartData}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={primary} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={dark ? "#ffffff08" : "#f3f4f6"}
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: dark ? "#4b5563" : "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: dark ? "#4b5563" : "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
                  width={44}
                />
                <Tooltip content={<CustomTooltip dark={dark} />} />
                <Area
                  type="monotone"
                  dataKey="Revenue"
                  stroke={primary}
                  strokeWidth={2}
                  fill="url(#grad)"
                  dot={false}
                  activeDot={{ r: 4, fill: primary, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className={`lg:col-span-2 rounded-2xl border p-5 ${card}`}>
          <p className={`text-sm font-semibold ${text} mb-5`}>
            Today's Appointments
          </p>
          <div className={`flex flex-col divide-y ${divide}`}>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="py-3">
                  <Skeleton className="h-8 w-full" />
                </div>
              ))
            ) : !data?.appointments.length ? (
              <p className={`py-6 text-xs ${muted}`}>No appointments today.</p>
            ) : (
              data.appointments.map((a, i) => (
                <div key={i} className="flex items-start gap-3 py-3">
                  <span
                    className="text-[10px] font-mono mt-0.5 shrink-0 w-10"
                    style={{ color: primary }}
                  >
                    {a.time}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-xs font-medium truncate ${text}`}>
                      {a.customer}
                    </p>
                    <p className={`text-[11px] truncate ${muted}`}>
                      {a.Make} {a.Model} · {a.reason}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <SectionCard
            title="Recent Job Orders"
            action={<span className={`text-xs ${muted}`}>Latest 5</span>}
            dark={dark}
            card={card}
            text={text}
            muted={muted}
            border={border}
          >
            <table className="w-full text-xs">
              <thead>
                <tr className={thBg}>
                  <th className={`text-left px-5 py-3 font-medium ${muted}`}>
                    Customer
                  </th>
                  <th
                    className={`text-left px-5 py-3 font-medium ${muted} hidden md:table-cell`}
                  >
                    Vehicle
                  </th>
                  <th className={`text-left px-5 py-3 font-medium ${muted}`}>
                    Status
                  </th>
                  <th
                    className={`text-left px-5 py-3 font-medium ${muted} hidden sm:table-cell`}
                  >
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${divide}`}>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 4 }).map((_, j) => (
                        <td key={j} className="px-5 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : !data?.recentJobs.length ? (
                  <tr>
                    <td
                      colSpan={4}
                      className={`px-5 py-8 text-center ${muted}`}
                    >
                      No job orders yet.
                    </td>
                  </tr>
                ) : (
                  data.recentJobs.map((j) => (
                    <tr
                      key={j.Job_ID}
                      className={`transition-colors ${dark ? "hover:bg-white/3" : "hover:bg-gray-50"}`}
                    >
                      <td className={`px-5 py-3 font-medium ${text}`}>
                        {j.CustomerName}
                      </td>
                      <td className={`px-5 py-3 ${muted} hidden md:table-cell`}>
                        {j.Make} {j.Model}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={j.Status} dark={dark} />
                      </td>
                      <td className={`px-5 py-3 ${muted} hidden sm:table-cell`}>
                        {new Date(j.JobDate).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </SectionCard>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
          <SectionCard
            title="Low Stock"
            action={
              data?.stats.lowStockCount ? (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">
                  {data.stats.lowStockCount} items
                </span>
              ) : undefined
            }
            dark={dark}
            card={card}
            text={text}
            muted={muted}
            border={border}
          >
            <div className={`divide-y ${divide}`}>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="px-5 py-3">
                    <Skeleton className="h-8 w-full" />
                  </div>
                ))
              ) : !data?.lowStock.length ? (
                <p className={`px-5 py-5 text-xs ${muted}`}>
                  All parts stocked up.
                </p>
              ) : (
                data.lowStock.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-5 py-3 gap-4"
                  >
                    <div className="min-w-0">
                      <p className={`text-xs font-medium truncate ${text}`}>
                        {p.PartName}
                      </p>
                      <p className={`text-[10px] font-mono ${muted}`}>
                        {p.SKU}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-red-500">
                        {p.qty} left
                      </p>
                      <p className={`text-[10px] ${muted}`}>min {p.min}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}

function FrontDeskDashboard({
  dark,
  card,
  text,
  muted,
  divide,
  border,
  primary,
  fmt,
}: any) {
  const [data, setData] = useState<FrontDeskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get("/api/v1/dashboard/frontdesk")
      .then((res) => setData(res.data))
      .catch(() => setError("Failed to load data."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
      {error && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${dark ? "bg-red-900/20 border-red-800/50 text-red-400" : "bg-red-50 border-red-200 text-red-600"}`}
        >
          {error}
        </div>
      )}

      <div>
        <h1 className={`text-lg font-semibold ${text}`}>Front Desk</h1>
        <p className={`text-sm mt-0.5 ${muted}`}>
          Here's what's happening today.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Appointments"
          value={String(data?.counts.todayApptCount ?? 0)}
          loading={loading}
          dark={dark}
          primary={primary}
          card={card}
          text={text}
          muted={muted}
        />
        <StatCard
          label="Pending Job Orders"
          value={String(data?.counts.pendingCount ?? 0)}
          loading={loading}
          dark={dark}
          primary={primary}
          card={card}
          text={text}
          muted={muted}
        />
        <StatCard
          label="Ready for Pickup"
          value={String(data?.counts.readyCount ?? 0)}
          loading={loading}
          dark={dark}
          primary={primary}
          card={card}
          text={text}
          muted={muted}
        />
        <StatCard
          label="Today's Revenue"
          value={fmt(data?.counts.todayRevenue ?? 0)}
          loading={loading}
          dark={dark}
          primary={primary}
          card={card}
          text={text}
          muted={muted}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard
          title="Today's Appointments"
          action={
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ color: primary, backgroundColor: primary + "20" }}
            >
              {data?.appointments.length ?? 0}
            </span>
          }
          dark={dark}
          card={card}
          text={text}
          muted={muted}
          border={border}
        >
          <div className={`divide-y ${divide}`}>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-3">
                  <Skeleton className="h-10 w-full" />
                </div>
              ))
            ) : !data?.appointments.length ? (
              <p className={`px-5 py-5 text-xs ${muted}`}>
                No appointments today.
              </p>
            ) : (
              data.appointments.map((a, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-3">
                  <span
                    className="text-[10px] font-mono mt-0.5 shrink-0 w-10"
                    style={{ color: primary }}
                  >
                    {a.time}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-xs font-medium truncate ${text}`}>
                      {a.customer}
                    </p>
                    <p className={`text-[11px] truncate ${muted}`}>
                      {a.Make} {a.Model} · {a.PlateNumber}
                    </p>
                    <p className={`text-[10px] truncate ${muted}`}>
                      {a.reason}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Pending Job Orders"
          dark={dark}
          card={card}
          text={text}
          muted={muted}
          border={border}
        >
          <div className={`divide-y ${divide}`}>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-3">
                  <Skeleton className="h-10 w-full" />
                </div>
              ))
            ) : !data?.pendingJobs.length ? (
              <p className={`px-5 py-5 text-xs ${muted}`}>No pending jobs.</p>
            ) : (
              data.pendingJobs.map((j, i) => (
                <div key={i} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-medium ${text}`}>
                      {j.customer}
                    </p>
                    <span
                      className="text-[10px] font-mono"
                      style={{ color: primary }}
                    >
                      #{j.Job_ID}
                    </span>
                  </div>
                  <p className={`text-[11px] ${muted}`}>
                    {j.Make} {j.Model} · {j.PlateNumber}
                  </p>
                  <p className={`text-[10px] ${muted}`}>
                    Assigned to {j.mechanic}
                  </p>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Ready for Pickup"
          dark={dark}
          card={card}
          text={text}
          muted={muted}
          border={border}
        >
          <div className={`divide-y ${divide}`}>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-3">
                  <Skeleton className="h-10 w-full" />
                </div>
              ))
            ) : !data?.readyVehicles.length ? (
              <p className={`px-5 py-5 text-xs ${muted}`}>
                No vehicles ready yet.
              </p>
            ) : (
              data.readyVehicles.map((v, i) => (
                <div key={i} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-medium ${text}`}>
                      {v.customer}
                    </p>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ color: "#10b981", backgroundColor: "#10b98120" }}
                    >
                      Ready
                    </span>
                  </div>
                  <p className={`text-[11px] ${muted}`}>
                    {v.Make} {v.Model} · {v.PlateNumber}
                  </p>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard
          title="Recent Customers"
          dark={dark}
          card={card}
          text={text}
          muted={muted}
          border={border}
        >
          <div className={`divide-y ${divide}`}>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-3">
                  <Skeleton className="h-8 w-full" />
                </div>
              ))
            ) : !data?.recentCustomers.length ? (
              <p className={`px-5 py-5 text-xs ${muted}`}>No customers yet.</p>
            ) : (
              data.recentCustomers.map((c) => (
                <div
                  key={c.Customer_ID}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div>
                    <p className={`text-xs font-medium ${text}`}>
                      {c.FullName}
                    </p>
                    <p className={`text-[10px] ${muted}`}>{c.ContactNumber}</p>
                  </div>
                  <p className={`text-[10px] ${muted}`}>
                    {new Date(c.CreatedAt).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Today's Payments"
          dark={dark}
          card={card}
          text={text}
          muted={muted}
          border={border}
        >
          <div className={`divide-y ${divide}`}>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-3">
                  <Skeleton className="h-8 w-full" />
                </div>
              ))
            ) : !data?.todayPayments.length ? (
              <p className={`px-5 py-5 text-xs ${muted}`}>No payments today.</p>
            ) : (
              data.todayPayments.map((p) => (
                <div
                  key={p.Payment_ID}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div>
                    <p className={`text-xs font-medium ${text}`}>
                      {p.customer}
                    </p>
                    <p className={`text-[10px] ${muted}`}>{p.PaymentMethod}</p>
                  </div>
                  <p
                    className="text-xs font-semibold"
                    style={{ color: primary }}
                  >
                    ₱{Number(p.AmountPaid).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </main>
  );
}

function MechanicDashboard({
  dark,
  card,
  text,
  muted,
  divide,
  border,
  primary,
}: any) {
  const [data, setData] = useState<MechanicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get("/api/v1/dashboard/mechanic")
      .then((res) => setData(res.data))
      .catch(() => setError("Failed to load data."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
      {error && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${dark ? "bg-red-900/20 border-red-800/50 text-red-400" : "bg-red-50 border-red-200 text-red-600"}`}
        >
          {error}
        </div>
      )}

      <div>
        <h1 className={`text-lg font-semibold ${text}`}>My Jobs</h1>
        <p className={`text-sm mt-0.5 ${muted}`}>
          Here's your current workload.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Assigned"
          value={String(data?.counts.totalCount ?? 0)}
          loading={loading}
          dark={dark}
          primary={primary}
          card={card}
          text={text}
          muted={muted}
        />
        <StatCard
          label="Pending"
          value={String(data?.counts.pendingCount ?? 0)}
          loading={loading}
          dark={dark}
          primary={primary}
          card={card}
          text={text}
          muted={muted}
        />
        <StatCard
          label="In Progress"
          value={String(data?.counts.inProgressCount ?? 0)}
          loading={loading}
          dark={dark}
          primary={primary}
          card={card}
          text={text}
          muted={muted}
        />
        <StatCard
          label="Completed"
          value={String(data?.counts.completedCount ?? 0)}
          loading={loading}
          dark={dark}
          primary={primary}
          card={card}
          text={text}
          muted={muted}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SectionCard
            title="Active Jobs"
            action={
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ color: primary, backgroundColor: primary + "20" }}
              >
                {data?.assignedJobs.length ?? 0}
              </span>
            }
            dark={dark}
            card={card}
            text={text}
            muted={muted}
            border={border}
          >
            <div className={`divide-y ${divide}`}>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-5 py-4">
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))
              ) : !data?.assignedJobs.length ? (
                <p className={`px-5 py-8 text-xs text-center ${muted}`}>
                  No active jobs assigned.
                </p>
              ) : (
                data.assignedJobs.map((j) => (
                  <div key={j.Job_ID} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <div className="min-w-0">
                        <p className={`text-xs font-medium ${text}`}>
                          {j.customer}
                        </p>
                        <p className={`text-[11px] ${muted}`}>
                          {j.Make} {j.Model} {j.Year} · {j.PlateNumber}
                        </p>
                      </div>
                      <StatusBadge status={j.Status} dark={dark} />
                    </div>
                    {j.ReportedIssue && (
                      <p className={`text-[11px] mt-1.5 ${muted} line-clamp-2`}>
                        {j.ReportedIssue}
                      </p>
                    )}
                    <p className={`text-[10px] mt-1 ${muted}`}>
                      {new Date(j.JobDate).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="Recently Completed"
          dark={dark}
          card={card}
          text={text}
          muted={muted}
          border={border}
        >
          <div className={`divide-y ${divide}`}>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-3">
                  <Skeleton className="h-10 w-full" />
                </div>
              ))
            ) : !data?.completedJobs.length ? (
              <p className={`px-5 py-5 text-xs ${muted}`}>
                No completed jobs yet.
              </p>
            ) : (
              data.completedJobs.map((j) => (
                <div key={j.Job_ID} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={`text-xs font-medium ${text}`}>
                      {j.customer}
                    </p>
                    <StatusBadge status={j.Status} dark={dark} />
                  </div>
                  <p className={`text-[11px] ${muted}`}>
                    {j.Make} {j.Model} · {j.PlateNumber}
                  </p>
                  <p className={`text-[10px] ${muted}`}>
                    {new Date(j.JobDate).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  const { dark, toggleTheme, primaryColor, userRole } = useTheme();

  const innerBg = dark ? "bg-[#0d0f13]" : "bg-[#f8f9fb]";
  const card = dark
    ? "bg-[#111318] border-white/5"
    : "bg-white border-gray-100";
  const text = dark ? "text-white" : "text-gray-900";
  const muted = dark ? "text-gray-500" : "text-gray-400";
  const subtle = dark ? "text-gray-400" : "text-gray-600";
  const divide = dark
    ? "divide-white/5 border-white/5"
    : "divide-gray-100 border-gray-100";
  const thBg = dark ? "bg-white/3" : "bg-gray-50";
  const border = dark ? "border-white/5" : "border-gray-100";

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `₱${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
        ? `₱${(n / 1_000).toFixed(1)}k`
        : `₱${Math.round(n)}`;

  const shared = {
    dark,
    card,
    text,
    muted,
    subtle,
    divide,
    thBg,
    border,
    primary: primaryColor,
    fmt,
  };

  const titleMap: Record<string, string> = {
    Admin: "Dashboard",
    "Front Desk": "Front Desk",
    Mechanic: "My Jobs",
  };

  return (
    <div
      suppressHydrationWarning
      className={`flex-1 flex flex-col ${innerBg} ${text}`}
    >
      <Topbar
        title={titleMap[userRole] ?? "Dashboard"}
        dark={dark}
        toggleTheme={toggleTheme}
        primaryColor={primaryColor}
        muted={muted}
        text={text}
      />
      {userRole === "Mechanic" ? (
        <MechanicDashboard {...shared} />
      ) : userRole === "Front Desk" ? (
        <FrontDeskDashboard {...shared} />
      ) : (
        <AdminDashboard {...shared} />
      )}
    </div>
  );
}
