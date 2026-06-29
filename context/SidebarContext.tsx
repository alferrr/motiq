"use client";

import { createContext, useContext, useState } from "react";

type SidebarContextType = {
  open: boolean;
  setOpen: (v: boolean) => void;
};

const SidebarContext = createContext<SidebarContextType>({
  open: false,
  setOpen: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => useContext(SidebarContext);
