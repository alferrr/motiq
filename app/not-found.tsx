"use client";

import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";
import { FaTools, FaArrowLeft } from "react-icons/fa";
import PlasmaWave from "@/components/PlasmaWave";

export default function NotFound() {
  const { dark, primaryColor } = useTheme();

  const bg = dark ? "bg-[#0d0f13]" : "bg-[#f8f9fb]";
  const text = dark ? "text-white" : "text-gray-900";
  const muted = dark ? "text-gray-500" : "text-gray-400";

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center px-6 ${bg} ${text}`}
    >
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
        <FaTools size={24} color={primaryColor} />
      </div>

      <p
        className={`text-xs uppercase tracking-widest font-medium mb-2 ${muted}`}
      >
        404
      </p>
      <h1 className="text-2xl font-semibold mb-2">
        We're still working on this
      </h1>
      <p className={`text-sm text-center max-w-sm mb-8 ${muted}`}>
        This page hasn't been built yet. We're actively developing Motiq and
        this feature is on the way.
      </p>

      <Link
        href="/dashboard"
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: primaryColor }}
      >
        <FaArrowLeft size={11} />
        Back to Dashboard
      </Link>
    </div>
  );
}
