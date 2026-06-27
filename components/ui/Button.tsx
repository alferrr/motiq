"use client";

import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  text: string;
};

export default function Button({
  text,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`px-7 py-3 rounded-full border border-white/10 bg-[#0e61d5] font-light text-sm cursor-pointer ${className}`}
      {...props}
    >
      {text}
    </button>
  );
}
