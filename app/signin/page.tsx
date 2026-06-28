"use client";

import Link from "next/link";
import { useState } from "react";
import LineWaves from "@/components/LineWaves";
import Button from "@/components/ui/Button";

import axios from "axios";
import { LoginSchema, LoginFormType } from "@/schemas/auth.schema";
import { useRouter } from "next/navigation";
import z from "zod";

type CompanyFormType = { companyId: string };

export default function Page() {
  const [step, setStep] = useState<"company" | "staff">("company");
  const [loading, setLoading] = useState(false);

  const [companyForm, setCompanyForm] = useState<CompanyFormType>({
    companyId: "",
  });
  const [companyName, setCompanyName] = useState("");
  const [companyError, setCompanyError] = useState("");

  const [loginForm, setLoginForm] = useState<LoginFormType>({
    email: "",
    password: "",
  });
  const [loginErrors, setLoginErrors] = useState<
    Partial<Record<keyof LoginFormType, string>>
  >({});
  const [serverError, setServerError] = useState("");

  const router = useRouter();

  // verify company
  const handleCompanySubmit = async () => {
    setCompanyError("");

    if (!companyForm.companyId.trim()) {
      setCompanyError("Company ID is required");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post("/api/v1/auth/verify-company", {
        companyId: companyForm.companyId,
      });
      setCompanyName(res.data.name ?? "");
      setStep("staff");
    } catch (err: any) {
      setCompanyError(
        err.response?.data?.error ?? "Company not found. Check your ID.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
    setLoginErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleLogin = async () => {
    setServerError("");
    setLoginErrors({});

    const result = LoginSchema.safeParse(loginForm);
    if (!result.success) {
      const flattened = result.error.flatten().fieldErrors;
      const errors: Partial<Record<keyof LoginFormType, string>> = {};
      (Object.keys(flattened) as Array<keyof LoginFormType>).forEach(
        (field) => {
          if (flattened[field]?.[0]) errors[field] = flattened[field]![0];
        },
      );
      setLoginErrors(errors);
      return;
    }

    setLoading(true);
    try {
      await axios.post("/api/v1/auth/login", {
        ...result.data,
        companyId: companyForm.companyId,
      });
      router.push("/dashboard");
    } catch (err: any) {
      setServerError(err.response?.data?.error ?? "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full rounded-full border border-white/10 text-lg text-white p-2 px-6 font-light bg-transparent focus:outline-none focus:border-blue-600 transition-colors";

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

      <div className="w-screen h-screen md:w-[50%] relative rounded-br-4xl rounded-tr-4xl text-white p-8 px-6 lg:px-24 flex flex-col gap-6 justify-center bg-black z-10">
        <h1 className="font-heading font-light text-lg">Motiq</h1>

        <div className="flex items-center gap-3">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
              step === "company"
                ? "bg-blue-700 text-white"
                : "bg-blue-700/30 text-blue-400"
            }`}
          >
            {step === "staff" ? (
              <svg
                viewBox="0 0 12 12"
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="2,6 5,9 10,3" />
              </svg>
            ) : (
              "1"
            )}
          </div>
          <div
            className={`h-px flex-1 transition-colors ${step === "staff" ? "bg-blue-700/60" : "bg-white/10"}`}
          />
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
              step === "staff"
                ? "bg-blue-700 text-white"
                : "bg-white/10 text-white/30"
            }`}
          >
            2
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-4xl font-light leading-tight">
            {step === "company" ? (
              "Enter your Company ID"
            ) : (
              <>
                Welcome,{" "}
                <span className="text-blue-500">{companyName || "team"}</span>
              </>
            )}
          </p>
          <p className="font-light text-white/50 text-sm">
            {step === "company"
              ? "Your garage admin provides this ID."
              : "Sign in with your staff credentials."}
          </p>
        </div>

        {/* step 1 */}
        {step === "company" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="font-sans font-light ml-4 text-sm">Company ID</p>
              <input
                type="text"
                placeholder="e.g. 10042"
                value={companyForm.companyId}
                onChange={(e) => {
                  setCompanyForm({ companyId: e.target.value });
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
            />
          </div>
        )}

        {/* step 2 */}
        {step === "staff" && (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => {
                setStep("company");
                setServerError("");
                setLoginErrors({});
                setLoginForm({ email: "", password: "" });
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
                name="email"
                placeholder="you@example.com"
                onChange={handleLoginChange}
                value={loginForm.email}
                className={inputCls}
              />
              {loginErrors.email && (
                <p className="text-red-400 text-xs ml-4">{loginErrors.email}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <p className="font-sans font-light ml-4 text-sm">Password</p>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={loginForm.password}
                onChange={handleLoginChange}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className={inputCls}
              />
              {loginErrors.password && (
                <p className="text-red-400 text-xs ml-4">
                  {loginErrors.password}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end w-full">
              <Link href="/forgot" className="text-blue-700 text-sm">
                Forgot Password?
              </Link>
            </div>

            {serverError && (
              <p className="text-red-400 text-sm text-center">{serverError}</p>
            )}

            <Button
              text={loading ? "Signing in…" : "Sign In"}
              onClick={handleLogin}
            />
          </div>
        )}
      </div>
    </div>
  );
}
