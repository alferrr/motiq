"use client";

import Link from "next/link";
import { Fragment } from "react";

export default function Footer({ content }) {
  const { headline, paragraph, ctaPrimaryLabel, ctaSecondaryLabel } = content;

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
        {headline.split("\n").map((line, i, arr) => (
          <Fragment key={i}>
            {line}
            {i < arr.length - 1 && <br />}
          </Fragment>
        ))}
      </h1>
      <p className="w-full max-w-md sm:max-w-xl text-center text-sm sm:text-base font-light leading-7 mt-5">
        {paragraph}
      </p>
      <nav className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto px-6 sm:px-0 mt-4">
        <Link
          href="/register"
          className="w-full sm:w-auto text-center px-7 py-3 rounded-full border border-white/10 bg-[#0e61d5] font-light text-sm transition-colors hover:bg-[#0e61d5]/90"
        >
          {ctaPrimaryLabel}
        </Link>
        <Link
          href="/signin"
          className="w-full sm:w-auto text-center px-7 py-3 rounded-full border border-white/10 bg-white text-black font-light text-sm transition-colors hover:bg-white/90"
        >
          {ctaSecondaryLabel}
        </Link>
      </nav>
    </div>
  );
}
