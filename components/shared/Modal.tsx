"use client";

import { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";

type ModalProps = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  card: string;
  text: string;
  border: string;
  size?: "md" | "lg";
};

export default function Modal({
  title,
  onClose,
  children,
  card,
  text,
  border,
  size = "md",
}: ModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // tell any open Drawer to close immediately so it doesn't overlap this modal
    window.dispatchEvent(new CustomEvent("modal-open"));
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 transition-opacity duration-200"
      style={{
        opacity: visible ? 1 : 0,
        backdropFilter: visible ? "blur(4px)" : "none",
      }}
    >
      <div
        className={`w-full ${size === "lg" ? "max-w-lg" : "max-w-md"} rounded-2xl border shadow-2xl transition-all duration-200 ${card}`}
        style={{
          transform: visible ? "scale(1)" : "scale(0.95)",
          opacity: visible ? 1 : 0,
        }}
      >
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${border}`}
        >
          <p className={`text-sm font-semibold ${text}`}>{title}</p>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FaTimes size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
