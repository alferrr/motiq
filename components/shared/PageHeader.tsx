"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useSidebar } from "@/context/SidebarContext";
import { useRouter, usePathname } from "next/navigation";
import axios from "axios";
import {
  FaBars,
  FaBell,
  FaMoon,
  FaSun,
  FaSearch,
  FaExclamationTriangle,
  FaCheckCircle,
  FaBoxOpen,
  FaCalendarCheck,
  FaUsers,
  FaCar,
  FaTools,
  FaClipboardList,
  FaBoxes,
  FaFileInvoice,
} from "react-icons/fa";
import { MdPayments } from "react-icons/md";

type Notification = {
  id: string;
  type: "low_stock" | "completed" | "ready" | "appointment";
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

const NOTIF_ICON: Record<string, React.ElementType> = {
  low_stock: FaExclamationTriangle,
  completed: FaCheckCircle,
  ready: FaBoxOpen,
  appointment: FaCalendarCheck,
};

const NOTIF_COLOR: Record<string, string> = {
  low_stock: "#ef4444",
  completed: "#10b981",
  ready: "#3b82f6",
  appointment: "#f59e0b",
};

const SEARCH_PAGES = [
  { label: "Customers", href: "/customers", icon: FaUsers },
  { label: "Vehicles", href: "/vehicles", icon: FaCar },
  { label: "Services", href: "/services", icon: FaTools },
  { label: "Job Orders", href: "/jobs", icon: FaClipboardList },
  { label: "Inventory", href: "/inventory", icon: FaBoxes },
  { label: "Invoices", href: "/invoices", icon: FaFileInvoice },
  { label: "Payments", href: "/payments", icon: MdPayments },
];

function NotificationPanel({
  dark,
  text,
  muted,
  divide,
  primary,
}: {
  dark: boolean;
  text: string;
  muted: string;
  divide: string;
  primary: string;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("motiq-read-notifs") ?? "[]",
      );
      setReadIds(new Set(stored));
    } catch {}

    axios
      .get("/api/v1/notifications")
      .then((res) => setNotifications(res.data.notifications))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markAllRead = () => {
    const all = new Set(notifications.map((n) => n.id));
    setReadIds(all);
    localStorage.setItem("motiq-read-notifs", JSON.stringify([...all]));
  };

  const markRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem("motiq-read-notifs", JSON.stringify([...next]));
      return next;
    });
  };

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  return (
    <div className="absolute right-0 top-10 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden bg-black border-white/10 border">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-semibold ${text}`}>Notifications</p>
          {unreadCount > 0 && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white"
              style={{ backgroundColor: primary }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-[10px] transition-colors"
            style={{ color: primary }}
          >
            Mark all read
          </button>
        )}
      </div>

      <div className={`max-h-80 overflow-y-auto divide-y ${divide}`}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-white/5 animate-pulse shrink-0" />
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="h-3 bg-white/5 rounded animate-pulse w-3/4" />
                <div className="h-2.5 bg-white/5 rounded animate-pulse w-full" />
              </div>
            </div>
          ))
        ) : !notifications.length ? (
          <p className={`px-4 py-8 text-xs text-center ${muted}`}>
            You're all caught up!
          </p>
        ) : (
          notifications.map((n) => {
            const Icon = NOTIF_ICON[n.type] ?? FaBell;
            const color = NOTIF_COLOR[n.type] ?? primary;
            const isRead = readIds.has(n.id);
            return (
              <div
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors
                  ${dark ? "hover:bg-white/3" : "hover:bg-gray-50"}
                  ${isRead ? "opacity-50" : ""}`}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: color + "20" }}
                >
                  <Icon size={11} style={{ color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-xs font-medium ${text} leading-tight`}>
                      {n.title}
                    </p>
                    {!isRead && (
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0 mt-1"
                        style={{ backgroundColor: primary }}
                      />
                    )}
                  </div>
                  <p className={`text-[11px] mt-0.5 ${muted} leading-snug`}>
                    {n.body}
                  </p>
                  <p className={`text-[10px] mt-1 ${muted}`}>{n.createdAt}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── search ────────────────────────────────────────────────────────────────────

function SearchBar({
  dark,
  muted,
  primary,
  isDashboard,
}: {
  dark: boolean;
  muted: string;
  primary: string;
  isDashboard: boolean;
}) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setValue("");
  }, [isDashboard]);

  const showDropdown = isDashboard && focused && value.trim().length > 0;

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const handleSuggestion = (href: string) => {
    const query = value.trim();
    router.push(`${href}?search=${encodeURIComponent(query)}`);
    setValue("");
    setFocused(false);
  };

  // on non-dashboard pages, broadcast the search value so the page can filter its own data
  useEffect(() => {
    if (!isDashboard) {
      window.dispatchEvent(new CustomEvent("page-search", { detail: value }));
    }
  }, [value, isDashboard]);

  return (
    <div
      ref={wrapperRef}
      className="hidden sm:block relative flex-1 max-w-xs mx-4"
    >
      <div
        className={`flex items-center gap-2 border rounded-full px-3 py-1.5
          ${dark ? "border-white/5 bg-white/5" : "border-gray-200 bg-white"}`}
        style={focused ? { borderColor: primary } : {}}
      >
        <FaSearch size={10} className={muted} />
        <input
          ref={inputRef}
          className={`bg-transparent outline-none w-full text-xs
            ${dark ? "text-gray-300 placeholder:text-gray-600" : "text-gray-700 placeholder:text-gray-400"}`}
          placeholder={isDashboard ? "Search anything..." : "Search..."}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setFocused(false);
              inputRef.current?.blur();
            }
            if (e.key === "Enter" && isDashboard && value.trim()) {
              handleSuggestion(SEARCH_PAGES[0].href);
            }
          }}
        />
        <span className={`text-[10px] ${muted} shrink-0`}>⌘ F</span>
      </div>

      {showDropdown && (
        <div
          className={`absolute top-10 left-0 right-0 rounded-xl border shadow-xl overflow-hidden z-50
          ${dark ? "bg-[#111318] border-white/10" : "bg-white border-gray-100"}`}
        >
          <p
            className={`px-3 py-2 text-[10px] uppercase tracking-widest font-medium ${muted}`}
          >
            Search in
          </p>
          {SEARCH_PAGES.map((page) => {
            const Icon = page.icon;
            return (
              <button
                key={page.href}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSuggestion(page.href);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs transition-colors text-left
                  ${dark ? "hover:bg-white/5" : "hover:bg-gray-50"}`}
              >
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: primary + "20", color: primary }}
                >
                  <Icon size={10} />
                </div>
                <span className={dark ? "text-gray-300" : "text-gray-700"}>
                  Search <span className="font-medium">{value}</span> in{" "}
                  <span style={{ color: primary }}>{page.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── page header ───────────────────────────────────────────────────────────────

type PageHeaderProps = { title: string };

export default function PageHeader({ title }: PageHeaderProps) {
  const { dark, toggleTheme, primaryColor, userName } = useTheme();
  const { setOpen } = useSidebar();
  const pathname = usePathname();

  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  const isDashboard = pathname === "/dashboard";

  const text = dark ? "text-white" : "text-gray-900";
  const muted = dark ? "text-gray-500" : "text-gray-400";
  const divide = dark ? "divide-white/5" : "divide-gray-100";

  const initials = userName
    ? userName
        .split(" ")
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "A";

  useEffect(() => {
    const computeUnread = async () => {
      try {
        const res = await axios.get("/api/v1/notifications");
        const notifs: Notification[] = res.data.notifications;
        const readIds: string[] = JSON.parse(
          localStorage.getItem("motiq-read-notifs") ?? "[]",
        );
        const readSet = new Set(readIds);
        setUnreadCount(notifs.filter((n) => !readSet.has(n.id)).length);
      } catch {}
    };
    computeUnread();
  }, []);

  useEffect(() => {
    if (!showNotifs) return;
    const handle = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showNotifs]);

  return (
    <header
      suppressHydrationWarning
      className="h-14 flex items-center justify-between px-6 shrink-0"
    >
      <div className="flex items-center gap-3 flex-1">
        <button onClick={() => setOpen(true)} className={`lg:hidden ${muted}`}>
          <FaBars size={15} />
        </button>
        <p className={`text-sm font-semibold ${text}`}>{title}</p>
      </div>

      <SearchBar
        dark={dark}
        muted={muted}
        primary={primaryColor}
        isDashboard={isDashboard}
      />

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors
            ${dark ? "border-white/5 text-gray-500 hover:text-white" : "border-gray-200 text-gray-400 hover:text-gray-700"}`}
        >
          {dark ? <FaSun size={12} /> : <FaMoon size={12} />}
        </button>

        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifs((p) => !p)}
            className={`relative w-8 h-8 rounded-full flex items-center justify-center border transition-colors
              ${dark ? "border-white/5 text-gray-500 hover:text-white" : "border-gray-200 text-gray-400 hover:text-gray-700"}
              ${showNotifs ? (dark ? "bg-white/5 text-white" : "bg-gray-100 text-gray-700") : ""}`}
          >
            <FaBell size={12} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
            )}
          </button>

          {showNotifs && (
            <NotificationPanel
              dark={dark}
              text={text}
              muted={muted}
              divide={divide}
              primary={primaryColor}
            />
          )}
        </div>

        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
          style={{ backgroundColor: primaryColor }}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
