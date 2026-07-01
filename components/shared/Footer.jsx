"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <div
      className="flex flex-col gap-4 items-center justify-center min-h-[60dvh] text-white p-6 sm:p-12 md:p-20"
      style={{
        backgroundImage: "url('/footer.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <h1 className="text-3xl sm:text-4xl md:text-5xl text-center font-heading">
        Smarter Garage Management Starts Here.
      </h1>
      <p className="w-full max-w-md sm:max-w-xl text-center text-sm sm:text-base font-light leading-7 mt-5">
        Bring customer records, repair tracking, and billing together in one
        integrated garage management system built to streamline daily
        operations, reduce manual work, and deliver faster, more efficient
        service.
      </p>
      <nav className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto px-6 sm:px-0 mt-4">
        <Link
          href="/register"
          className="w-full sm:w-auto text-center px-7 py-3 rounded-full border border-white/10 bg-[#0e61d5] font-light text-sm transition-colors hover:bg-[#0e61d5]/90"
        >
          Get Started Free
        </Link>
        <Link
          href="/signin"
          className="w-full sm:w-auto text-center px-7 py-3 rounded-full border border-white/10 bg-white text-black font-light text-sm transition-colors hover:bg-white/90"
        >
          Sign In
        </Link>
      </nav>
    </div>
  );
}
