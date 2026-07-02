"use client";

import Link from "next/link";
import { useState } from "react";
import LineWaves from "@/components/LineWaves";
import Button from "@/components/ui/Button";
import axios from "axios";
import { z } from "zod";

const EmailSchema = z.object({ email: z.string().email("Invalid email address") });

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"company" | "email" | "done">("company");
  const [loading, setLoading] = useState(false);

  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyColor, setCompanyColor] = useState("#2563eb");
  const [companyError, setCompanyError] = useState("");

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [serverError, setServerError] = useState("");

  const inputCls =
    "w-full rounded-full border border-white/10 text-lg text-white p-2 px-6 font-light bg-transparent focus:outline-none focus:border-blue-600 transition-colors";

  const handleCompanySubmit = async () => {
    setCompanyError("");
    if (!companyId.trim()) {
      setCompanyError("Company ID is required");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("/api/v1/auth/verify-company", { companyId });
      setCompanyName(res.data.name ?? "");
      setCompanyColor(res.data.themeColor ?? "#2563eb");
      setStep("email");
    } catch (err: any) {
      setCompanyError(
        err.response?.data?.error ?? "Company not found. Check your ID.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async () => {
    setEmailError("");
    setServerError("");

    const result = EmailSchema.safeParse({ email });
    if (!result.success) {
      setEmailError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      await axios.post("/api/v1/auth/forgot-password", { companyId, email });
      setStep("done");
    } catch (err: any) {
      setServerError(
        err.response?.data?.error ?? "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex flex-row-reverse h-screen overflow-hidden bg-black">
      {/* decorative side */}
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
          color3={companyColor}
          mouseInfluence={2}
        />
      </div>

      {/* form side */}
      <div className="w-screen h-screen md:w-[50%] relative rounded-br-4xl rounded-tr-4xl text-white p-8 px-6 lg:px-24 flex flex-col gap-6 justify-center bg-black z-10">
        <h1 className="font-heading font-light text-lg">Motiq</h1>

        {/* heading */}
        <div className="flex flex-col gap-2">
          <p className="text-4xl font-light leading-tight">
            {step === "company" && "Reset your password"}
            {step === "email" && (
              <>
                Reset for{" "}
                <span style={{ color: companyColor }}>
                  {companyName || "team"}
                </span>
              </>
            )}
            {step === "done" && "Check your email"}
          </p>
          <p className="font-light text-white/50 text-sm">
            {step === "company" && "Enter your garage's Company ID to continue."}
            {step === "email" &&
              "Enter your account email and we'll send you a reset link."}
            {step === "done" &&
              "If an account exists for that email, we've sent a password reset link. It expires in 30 minutes."}
          </p>
        </div>

        {/* step 1: company */}
        {step === "company" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="font-sans font-light ml-4 text-sm">Company ID</p>
              <input
                type="text"
                placeholder="e.g. MERCADOAUTO-A3F7K2PQ"
                value={companyId}
                onChange={(e) => {
                  setCompanyId(e.target.value);
                  setCompanyError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleCompanySubmit()}
                className={inputCls}
              />
              {companyError && (
                <p className="text-red-400 text-xs ml-4">{companyError}</p>
              )}
            </div>
            <Button
              text={loading ? "Verifying…" : "Continue"}
              onClick={handleCompanySubmit}
              style={{ backgroundColor: companyColor }}
            />
          </div>
        )}

        {/* step 2: email */}
        {step === "email" && (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => {
                setStep("company");
                setServerError("");
                setEmailError("");
                setEmail("");
              }}
              className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm transition-colors w-fit -mt-2"
            >
              <svg
                viewBox="0 0 12 12"
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="8,2 4,6 8,10" />
              </svg>
              Change company
            </button>

            <div className="flex flex-col gap-2">
              <p className="font-sans font-light ml-4 text-sm">Email</p>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                className={inputCls}
              />
              {emailError && (
                <p className="text-red-400 text-xs ml-4">{emailError}</p>
              )}
            </div>

            {serverError && (
              <p className="text-red-400 text-sm text-center">{serverError}</p>
            )}

            <Button
              text={loading ? "Sending…" : "Send Reset Link"}
              onClick={handleEmailSubmit}
              style={{ backgroundColor: companyColor }}
            />
          </div>
        )}

        {/* step 3: done */}
        {step === "done" && (
          <div
            className="rounded-2xl border border-white/10 p-5 flex items-center gap-3"
            style={{ backgroundColor: companyColor + "14" }}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6 shrink-0"
              fill="none"
              stroke={companyColor}
              strokeWidth="2"
            >
              <path d="M4 4h16v16H4z" opacity="0" />
              <path d="M3 8l9 6 9-6" />
              <path d="M21 8v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1z" />
            </svg>
            <p className="text-sm text-white/70">
              Didn&apos;t get it? Check spam, or{" "}
              <button
                onClick={() => setStep("email")}
                className="underline"
                style={{ color: companyColor }}
              >
                try again
              </button>
              .
            </p>
          </div>
        )}

        <Link
          href="/signin"
          className="text-sm text-white/40 hover:text-white/70 transition-colors w-fit"
        >
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}
