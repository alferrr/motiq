"use client";

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "@/context/ThemeContext";
import axios from "axios";
import PageHeader from "@/components/shared/PageHeader";
import { FaArrowUp } from "react-icons/fa";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type ReportData = {
  revenueOverTime: { label: string; revenue: number }[];
  repairsByStatus: { status: string; count: number }[];
  revenueByCategory: { category: string; revenue: number; count: number }[];
  topMechanics: { name: string; jobCount: number; totalHours: number }[];
  summary: {
    totalRevenue: number;
    totalJobs: number;
    avgJobValue: number;
    totalCustomers: number;
  };
};

type Range = "7d" | "30d" | "6m" | "1y";

const STATUS_COLORS: Record<string, string> = {
  Pending: "#f59e0b",
  "In Progress": "#3b82f6",
  Completed: "#10b981",
  Released: "#6b7280",
};

const CATEGORY_PALETTE = [
  "#3b82f6",
  "#f97316",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
];

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />;
}

function fmtCurrency(n: number) {
  return n >= 1_000_000
    ? `₱${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `₱${(n / 1_000).toFixed(1)}k`
      : `₱${Math.round(n)}`;
}

function StatCard({
  label,
  value,
  sub,
  dark,
  text,
  muted,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  dark: boolean;
  text: string;
  muted: string;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 py-1">
      <p className={`text-xs ${muted}`}>{label}</p>
      {loading ? (
        <Skeleton className="h-7 w-24" />
      ) : (
        <p className={`text-2xl font-semibold tracking-tight ${text}`}>
          {value}
        </p>
      )}
      {sub && <p className={`text-[11px] ${muted}`}>{sub}</p>}
    </div>
  );
}

function CustomTooltip({ active, payload, label, dark, currency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className={`rounded-xl border px-3 py-2 text-xs shadow-lg
      ${dark ? "bg-[#1a1d24] border-white/10 text-white" : "bg-white border-gray-100 text-gray-900"}`}
    >
      <p className="mb-0.5 font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}:{" "}
          {currency ? `₱${Number(p.value).toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  );
}

const RANGE_LABELS: Record<Range, string> = {
  "7d": "7 Days",
  "30d": "30 Days",
  "6m": "6 Months",
  "1y": "1 Year",
};

export default function ReportsPage() {
  const { dark, primaryColor } = useTheme();

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState<Range>("6m");

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
  const border = dark ? "border-white/5" : "border-gray-100";
  const axisColor = dark ? "#4b5563" : "#9ca3af";
  const gridColor = dark ? "#ffffff08" : "#f3f4f6";

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/v1/reports", { params: { range } });
      setData(res.data);
    } catch {
      setError("Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const revenueData = (data?.revenueOverTime ?? []).map((d) => ({
    label: d.label,
    Revenue: Number(d.revenue),
  }));
  const statusData = (data?.repairsByStatus ?? []).map((d) => ({
    name: d.status,
    value: d.count,
  }));
  const categoryData = (data?.revenueByCategory ?? []).map((d) => ({
    name: d.category,
    Revenue: Number(d.revenue),
  }));
  const mechanicData = (data?.topMechanics ?? []).map((m) => ({
    name: m.name.split(" ")[0],
    Jobs: m.jobCount,
  }));

  const RangeToggle = () => (
    <div
      className={`flex items-center gap-0.5 p-0.5 rounded-full border ${dark ? "border-white/5 bg-white/3" : "border-gray-200 bg-gray-100"}`}
    >
      {(["7d", "30d", "6m", "1y"] as Range[]).map((r) => (
        <button
          key={r}
          onClick={() => setRange(r)}
          className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
          style={
            range === r
              ? {
                  backgroundColor: dark ? "#fff" : "#111",
                  color: dark ? "#111" : "#fff",
                }
              : { color: dark ? "#6b7280" : "#9ca3af" }
          }
        >
          {RANGE_LABELS[r]}
        </button>
      ))}
    </div>
  );

  return (
    <div
      suppressHydrationWarning
      className={`flex-1 flex flex-col min-h-0 ${innerBg} ${text}`}
    >
      <PageHeader title="Reports" />

      <main className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto min-h-0 [&>*]:shrink-0">
        {error && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${dark ? "bg-red-900/20 border-red-800/50 text-red-400" : "bg-red-50 border-red-200 text-red-600"}`}
          >
            {error}
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className={`text-lg font-semibold ${text}`}>Reports</h1>
            <p className={`text-sm mt-0.5 ${muted}`}>
              Performance overview for {RANGE_LABELS[range].toLowerCase()}
            </p>
          </div>
          <RangeToggle />
        </div>

        <div
          className={`grid grid-cols-2 lg:grid-cols-4 gap-6 py-4 border-y ${border}`}
        >
          <StatCard
            label="Total Revenue"
            value={fmtCurrency(data?.summary.totalRevenue ?? 0)}
            dark={dark}
            text={text}
            muted={muted}
            loading={loading}
          />
          <StatCard
            label="Total Jobs"
            value={String(data?.summary.totalJobs ?? 0)}
            dark={dark}
            text={text}
            muted={muted}
            loading={loading}
          />
          <StatCard
            label="Avg. Job Value"
            value={fmtCurrency(data?.summary.avgJobValue ?? 0)}
            dark={dark}
            text={text}
            muted={muted}
            loading={loading}
          />
          <StatCard
            label="Total Customers"
            value={String(data?.summary.totalCustomers ?? 0)}
            dark={dark}
            text={text}
            muted={muted}
            loading={loading}
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className={`text-sm font-semibold ${text}`}>Revenue Over Time</p>
            <span
              className="text-xs flex items-center gap-1"
              style={{ color: primaryColor }}
            >
              <FaArrowUp size={9} />{" "}
              {fmtCurrency(data?.summary.totalRevenue ?? 0)} total
            </span>
          </div>
          {loading ? (
            <Skeleton className="h-56 w-full" />
          ) : !revenueData.length ? (
            <div className="h-56 flex items-center justify-center">
              <p className={`text-xs ${muted}`}>
                No revenue data for this period.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <AreaChart
                data={revenueData}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={primaryColor}
                      stopOpacity={0.15}
                    />
                    <stop
                      offset="100%"
                      stopColor={primaryColor}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={gridColor}
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: axisColor }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: axisColor }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
                  width={48}
                />
                <Tooltip content={<CustomTooltip dark={dark} currency />} />
                <Area
                  type="monotone"
                  dataKey="Revenue"
                  stroke={primaryColor}
                  strokeWidth={2}
                  fill="url(#revGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: primaryColor, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* repairs by status */}
          <div className="flex flex-col gap-4">
            <p className={`text-sm font-semibold ${text}`}>Repairs by Status</p>
            {loading ? (
              <Skeleton className="h-52 w-full" />
            ) : !statusData.length ? (
              <div className="h-52 flex items-center justify-center">
                <p className={`text-xs ${muted}`}>No repair jobs yet.</p>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {statusData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={STATUS_COLORS[entry.name] ?? primaryColor}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip dark={dark} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2 flex-1">
                  {statusData.map((s) => (
                    <div
                      key={s.name}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              STATUS_COLORS[s.name] ?? primaryColor,
                          }}
                        />
                        <span className={subtle}>{s.name}</span>
                      </div>
                      <span className={`font-medium ${text}`}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <p className={`text-sm font-semibold ${text}`}>
              Revenue by Category
            </p>
            {loading ? (
              <Skeleton className="h-52 w-full" />
            ) : !categoryData.length ? (
              <div className="h-52 flex items-center justify-center">
                <p className={`text-xs ${muted}`}>No service data yet.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={208}>
                <BarChart
                  data={categoryData}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                  barSize={16}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={gridColor}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: axisColor }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: axisColor }}
                    axisLine={false}
                    tickLine={false}
                    width={110}
                  />
                  <Tooltip
                    content={<CustomTooltip dark={dark} currency />}
                    cursor={{ fill: dark ? "#ffffff05" : "#f9fafb" }}
                  />
                  <Bar dataKey="Revenue" radius={[0, 6, 6, 0]}>
                    {categoryData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <p className={`text-sm font-semibold ${text}`}>Top Mechanics</p>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : !mechanicData.length ? (
            <div className="h-40 flex items-center justify-center">
              <p className={`text-xs ${muted}`}>No completed jobs yet.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={mechanicData}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                barSize={36}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={gridColor}
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: axisColor }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: axisColor }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<CustomTooltip dark={dark} />}
                  cursor={{ fill: dark ? "#ffffff05" : "#f9fafb" }}
                />
                <Bar dataKey="Jobs" radius={[6, 6, 0, 0]} fill={primaryColor} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {!loading && data && data.topMechanics.length > 0 && (
          <div
            className={`flex flex-col divide-y ${divide} border-t ${border}`}
          >
            {data.topMechanics.map((m, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {m.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <p className={`text-sm font-medium ${text}`}>{m.name}</p>
                </div>
                <div className="flex items-center gap-6 text-xs">
                  <p className={muted}>
                    {m.jobCount} job{m.jobCount !== 1 ? "s" : ""}
                  </p>
                  <p className={muted}>
                    {Number(m.totalHours ?? 0).toFixed(1)}h logged
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
