"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import LineWaves from "@/components/LineWaves";

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = searchParams.get("companyId");
    if (!id) {
      router.replace("/register");
      return;
    }
    setCompanyId(id);
  }, [searchParams, router]);

  const handleCopy = () => {
    if (!companyId) return;
    navigator.clipboard.writeText(companyId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!companyId) return null;

  return (
    <div className="relative flex flex-row-reverse h-screen overflow-hidden bg-black">
      <div className="hidden md:w-[50%] md:block">
        <LineWaves
          speed={0.3}
          innerLineCount={32}
          outerLineCount={36}
          warpIntensity={1}
          rotation={-45}
          edgeFadeWidth={0}
          colorCycleSpeed={1}
          brightness={0.2}
          color1="#0F172A"
          color2="#1E3A8A"
          color3="#2563EB"
          mouseInfluence={2}
        />
      </div>

      <div className="w-screen h-screen md:w-[50%] relative rounded-br-4xl rounded-tr-4xl text-white px-6 lg:px-24 flex flex-col gap-8 justify-center bg-black z-10">
        <h1 className="font-heading font-light text-lg">Motiq</h1>

        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-700/20 border border-blue-700/40">
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6 text-blue-500"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        {/* heading */}
        <div className="flex flex-col gap-2">
          <p className="text-4xl font-light leading-tight">You're all set!</p>
          <p className="text-sm font-light text-white/40 leading-relaxed">
            Your garage has been registered and approved. Save your Company ID —
            you and your staff will need it every time you sign in.
          </p>
        </div>

        {/* company id card */}
        <div className="flex flex-col gap-2">
          <p className="text-xs text-white/40 uppercase tracking-widest ml-1">
            Your Company ID
          </p>
          <div className="flex items-center justify-between gap-4 border border-white/10 rounded-2xl px-5 py-4">
            <span className="text-4xl font-light tracking-widest text-white">
              {companyId}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors shrink-0"
            >
              {copied ? (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-blue-500">Copied</span>
                </>
              ) : (
                <>
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-white/25 ml-1">
            Share this with your staff so they can log in.
          </p>
        </div>

        <div className="border-t border-white/5" />

        <div className="flex flex-col gap-3">
          <p className="text-xs text-white/40 uppercase tracking-widest">
            Next steps
          </p>
          <div className="flex flex-col gap-2">
            {[
              "Sign in using your Company ID and admin credentials",
              "Add your staff under User Management",
              "Set up your service catalog and parts inventory",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs text-white/30 shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm font-light text-white/50 leading-relaxed">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>

        <Link
          href="/"
          className="w-full py-3 rounded-full bg-blue-700 hover:bg-blue-600 transition-colors text-white text-sm font-light text-center"
        >
          Go to Sign In
        </Link>
      </div>
    </div>
  );
}
