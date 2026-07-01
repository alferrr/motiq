"use client";

import { useEffect, useRef, useState } from "react";
import { FaChevronDown, FaTimes } from "react-icons/fa";

export type SearchableSelectOption = {
  value: string;
  label: string;
};

type SearchableSelectProps = {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  dark: boolean;
  clearable?: boolean;
};

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Search...",
  emptyMessage = "No results",
  disabled,
  dark,
  clearable,
}: SearchableSelectProps) {
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  const inputCls = `w-full rounded-xl border pl-4 pr-9 py-2.5 text-sm bg-transparent outline-none transition-colors
    ${dark ? "border-white/10 text-white placeholder:text-gray-600" : "border-gray-200 text-gray-900 placeholder:text-gray-400"}
    ${disabled ? "opacity-50 cursor-not-allowed" : ""}`;

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        className={inputCls}
        disabled={disabled}
        placeholder={placeholder}
        value={focused ? query : (selected?.label ?? "")}
        onFocus={() => {
          setFocused(true);
          setQuery("");
        }}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="absolute right-3 top-0 h-full flex items-center gap-2">
        {clearable && value && !focused && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => onChange("")}
            className={dark ? "text-gray-500 hover:text-white" : "text-gray-400 hover:text-gray-700"}
          >
            <FaTimes size={10} />
          </button>
        )}
        <FaChevronDown size={9} className={dark ? "text-gray-600" : "text-gray-400"} />
      </div>

      {focused && !disabled && (
        <div
          className={`absolute left-0 right-0 top-[calc(100%+4px)] rounded-xl border shadow-xl overflow-hidden z-10 max-h-56 overflow-y-auto
            ${dark ? "bg-[#111318] border-white/10" : "bg-white border-gray-200"}`}
        >
          {!filtered.length ? (
            <p className={`px-3 py-2.5 text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>
              {emptyMessage}
            </p>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(o.value);
                  setFocused(false);
                  setQuery("");
                }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors
                  ${o.value === value ? "font-medium" : ""}
                  ${dark ? "text-gray-200 hover:bg-white/5" : "text-gray-700 hover:bg-gray-50"}`}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
