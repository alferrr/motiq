"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import {
  FaSignOutAlt,
  FaFileInvoice,
  FaCalendar,
  FaChartPie,
  FaUser,
  FaBriefcase,
} from "react-icons/fa";
import { MdDashboard, MdGroup, MdInventory, MdPayments } from "react-icons/md";
import { IoMdCar } from "react-icons/io";
import { FaGear } from "react-icons/fa6";
import axios from "axios";
import { useSidebar } from "@/context/SidebarContext";

const ICON_SIZE = 16;

const NAV_MAIN = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <MdDashboard size={ICON_SIZE} />,
  },
  {
    label: "Customers",
    href: "/customers",
    icon: <MdGroup size={ICON_SIZE} />,
  },
  { label: "Vehicles", href: "/vehicles", icon: <IoMdCar size={ICON_SIZE} /> },
  { label: "Services", href: "/services", icon: <FaGear size={ICON_SIZE} /> },
  {
    label: "Job Orders",
    href: "/jobs",
    icon: <FaBriefcase size={ICON_SIZE} />,
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: <MdInventory size={ICON_SIZE} />,
  },
  {
    label: "Invoices",
    href: "/invoices",
    icon: <FaFileInvoice size={ICON_SIZE} />,
  },
  {
    label: "Payments",
    href: "/payments",
    icon: <MdPayments size={ICON_SIZE} />,
  },
  {
    label: "Appointments",
    href: "/appointments",
    icon: <FaCalendar size={ICON_SIZE} />,
  },
  { label: "Reports", href: "/reports", icon: <FaChartPie size={ICON_SIZE} /> },
  { label: "Users", href: "/users", icon: <FaUser size={ICON_SIZE} /> },
];

const NAV_BOTTOM = [
  { label: "Settings", href: "/settings" },
  { label: "Help & Support", href: "/help" },
];

// mirrors the access rules enforced in proxy.ts — kept in sync manually
const ROLE_NAV: Record<string, string[]> = {
  Admin: [
    "/dashboard",
    "/customers",
    "/vehicles",
    "/services",
    "/jobs",
    "/inventory",
    "/invoices",
    "/payments",
    "/appointments",
    "/reports",
    "/users",
  ],
  "Front Desk": [
    "/dashboard",
    "/customers",
    "/vehicles",
    "/services",
    "/jobs",
    "/inventory",
    "/invoices",
    "/payments",
    "/appointments",
  ],
  Mechanic: [
    "/dashboard",
    "/vehicles",
    "/services",
    "/jobs",
    "/inventory",
    "/appointments",
  ],
};

const ROLE_NAV_BOTTOM: Record<string, string[]> = {
  Admin: ["/settings", "/help"],
  "Front Desk": ["/help"],
  Mechanic: ["/help"],
};

export default function Sidebar() {
  const pathname = usePathname();
  const { open, setOpen } = useSidebar();
  const router = useRouter();
  const { dark, primaryColor, companyName, userName, userRole } = useTheme();

  const bg = dark ? "bg-[#111318]" : "bg-white";
  const border = dark ? "border-white/5" : "border-gray-100";
  const text = dark ? "text-white" : "text-gray-900";
  const muted = dark ? "text-gray-500" : "text-gray-400";
  const hover = dark
    ? "hover:bg-white/5 hover:text-white"
    : "hover:bg-gray-50 hover:text-gray-900";

  const handleLogout = async () => {
    try {
      await axios.post("/api/v1/auth/logout");
    } finally {
      router.push("/");
    }
  };

  const NavLink = ({
    label,
    href,
    icon,
  }: {
    label: string;
    href: string;
    icon?: any;
  }) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        href={href}
        onClick={() => setOpen(false)}
        className={`flex gap-3 items-center px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
          active ? "font-medium" : `font-normal ${muted} ${hover}`
        }`}
        style={
          active
            ? { color: primaryColor, backgroundColor: primaryColor + "15" }
            : {}
        }
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span>{label}</span>
      </Link>
    );
  };

  // while userRole hasn't hydrated from localStorage yet, `visibleMain` /
  // `visibleBottom` are null so we render skeleton bars instead of either an
  // empty nav or briefly flashing the full unfiltered list
  const visibleMain = userRole
    ? NAV_MAIN.filter((item) => ROLE_NAV[userRole]?.includes(item.href))
    : null;
  const visibleBottom = userRole
    ? NAV_BOTTOM.filter((item) =>
        ROLE_NAV_BOTTOM[userRole]?.includes(item.href),
      )
    : null;

  // avatar initials from user name
  const initials = userName
    ? userName
        .split(" ")
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-20 lg:hidden bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
      />

      <aside
        suppressHydrationWarning
        className={`fixed top-0 left-0 h-full w-56 z-30 flex flex-col
          transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${bg} ${border}`}
      >
        <div
          suppressHydrationWarning
          className={`flex flex-col justify-center px-5 py-4 border-b ${border}
            transition-opacity duration-500`}
        >
          {companyName ? (
            <span
              className={`text-sm font-semibold font-heading ${text} transition-all duration-300`}
            >
              {companyName}
            </span>
          ) : (
            <div className="h-4 w-28 rounded animate-pulse bg-white/10" />
          )}
          <span className={`text-[10px] ${muted} mt-0.5`}>
            powered by Motiq
          </span>
        </div>

        {/* main nav */}
        <nav
          suppressHydrationWarning
          className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-0.5"
        >
          {visibleMain === null
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-8 mx-3 my-0.5 rounded-lg animate-pulse bg-white/5"
                />
              ))
            : visibleMain.map((item, i) => (
                <div
                  key={item.href}
                  className="transition-all duration-200"
                  style={{ transitionDelay: `${i * 20}ms` }}
                >
                  <NavLink {...item} />
                </div>
              ))}
        </nav>

        {/* bottom */}
        <div
          suppressHydrationWarning
          className={`px-3 py-4 border-t ${border} flex flex-col gap-0.5`}
        >
          {visibleBottom?.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-500/10 transition-colors duration-200 w-full text-left mt-0.5"
          >
            <FaSignOutAlt size={13} />
            <span>Logout</span>
          </button>

          {/* workspace pill */}
          <div
            suppressHydrationWarning
            className={`flex items-center gap-2.5 mt-3 px-3 py-2.5 rounded-xl border
              ${border} ${dark ? "bg-white/3" : "bg-gray-50"}
              transition-all duration-300`}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0 transition-colors duration-300"
              style={{ backgroundColor: primaryColor }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p
                suppressHydrationWarning
                className={`text-xs font-medium truncate ${text} transition-colors duration-300`}
              >
                {userName || "—"}
              </p>
              <p
                suppressHydrationWarning
                className={`text-[10px] truncate ${muted} transition-colors duration-300`}
              >
                {userRole || "—"}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
