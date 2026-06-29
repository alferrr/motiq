"use client";

import { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  dark: boolean;
  card: string;
  text: string;
  border: string;
};

export default function Drawer({
  open,
  onClose,
  title,
  children,
  dark,
  card,
  text,
  border,
}: DrawerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  if (!open && !visible) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={handleClose} />

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm z-50 flex flex-col border-l overflow-y-auto transition-all duration-300 ease-in-out ${card} ${border}`}
        style={{
          transform: visible ? "translateX(0)" : "translateX(100%)",
          opacity: visible ? 1 : 0,
        }}
      >
        <div
          className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${border}`}
        >
          <p className={`text-sm font-semibold ${text}`}>{title}</p>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FaTimes size={14} />
          </button>
        </div>

        {/* content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
}
