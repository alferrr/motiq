"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 z-99 flex w-full items-center justify-between px-4 sm:px-8 md:px-20 py-4 md:py-6 text-white transition-all duration-300 ${
        scrolled
          ? "bg-black/30 backdrop-blur-2xl border-b border-white/10 shadow-lg"
          : "bg-transparent"
      }`}
    >
      <h1 className="shrink-0 md:w-1/3 text-xl sm:text-2xl md:text-3xl font-semibold font-heading">
        {/* Mot<span className="text-blue-600">iq</span> */}
        MOTIQ
      </h1>

      <nav className="hidden md:flex w-1/3 justify-center gap-6 lg:gap-12 xl:gap-20 text-sm">
        <Link href="/about">About</Link>
        <Link href="/services">Services</Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/company">Company</Link>
      </nav>

      <nav className="flex shrink-0 md:w-1/3 justify-end items-center gap-2 text-xs sm:text-sm">
        <Link
          href="/signin"
          className="rounded-full border border-white/10 px-4 py-2 sm:px-7 sm:py-3"
        >
          Sign In
        </Link>

        <Link
          href="/register"
          className="rounded-full bg-[#0e61d5] px-4 py-2 sm:px-7 sm:py-3"
        >
          Register
        </Link>
      </nav>
    </header>
  );
}
