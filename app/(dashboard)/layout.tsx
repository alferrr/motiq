"use client";

import Sidebar from "@/components/shared/Sidebar";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
import { useTheme } from "@/context/ThemeContext";

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { open, setOpen } = useSidebar();
  const { dark } = useTheme();

  const rootBg = dark ? "bg-[#111318]" : "bg-white";
  const innerBg = dark ? "bg-[#0d0f13]" : "bg-[#f8f9fb]";

  return (
    <div suppressHydrationWarning className={`min-h-screen ${rootBg}`}>
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div
        suppressHydrationWarning
        className={`lg:ml-56 min-h-screen flex flex-col ${innerBg} lg:rounded-l-3xl overflow-hidden`}
      >
        {children}
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <LayoutInner>{children}</LayoutInner>
    </SidebarProvider>
  );
}
