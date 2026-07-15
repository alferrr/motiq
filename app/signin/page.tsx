"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LineWaves from "@/components/LineWaves";
import Button from "@/components/ui/Button";

import axios from "axios";
import { LoginSchema, LoginFormType } from "@/schemas/auth.schema";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import z from "zod";

type CompanyFormType = { companyId: string };
type Step = "welcome" | "company" | "staff";

const LAST_COMPANY_ID_KEY = "motiq-last-company-id";
const LAST_COMPANY_NAME_KEY = "motiq-last-company-name";
const LAST_COMPANY_COLOR_KEY = "motiq-last-company-color";
const LAST_COMPANY_LOGO_KEY = "motiq-last-company-logo";

export default function Page() {
  const [step, setStep] = useState<Step>("company");
  const [loading, setLoading] = useState(false);

  const [companyForm, setCompanyForm] = useState<CompanyFormType>({
    companyId: "",
  });
  const [companyName, setLocalCompanyName] = useState("");
  const [companyColor, setCompanyColor] = useState("#2563eb");
  const [companyLogoSlug, setCompanyLogoSlug] = useState<string | null>(null);
  const [companyError, setCompanyError] = useState("");

  const [loginForm, setLoginForm] = useState<LoginFormType>({
    email: "",
    password: "",
  });
  const [loginErrors, setLoginErrors] = useState<
    Partial<Record<keyof LoginFormType, string>>
  >({});
  const [serverError, setServerError] = useState("");

  const {
    setPrimaryColor,
    setCompanyName,
    setUserName,
    setUserRole,
    setIsOwner,
  } = useTheme();
  const router = useRouter();

  // remember the last company signed into on this device, if any
  useEffect(() => {
    try {
      const lastId = localStorage.getItem(LAST_COMPANY_ID_KEY);
      if (!lastId) return;

      const lastName = localStorage.getItem(LAST_COMPANY_NAME_KEY);
      const lastColor = localStorage.getItem(LAST_COMPANY_COLOR_KEY);
      const lastLogo = localStorage.getItem(LAST_COMPANY_LOGO_KEY);

      setCompanyForm({ companyId: lastId });
      setLocalCompanyName(lastName ?? "");
      setCompanyColor(lastColor ?? "#2563eb");
      setCompanyLogoSlug(lastLogo ?? null);
      setStep("welcome");
    } catch {
      // localStorage unavailable (private browsing, disabled storage, etc.)
      // — fall back to the normal company-id step.
    }
  }, []);

  // ── Forget remembered company (used by welcome step + step 2 back button) ──
  const handleForgetCompany = () => {
    try {
      localStorage.removeItem(LAST_COMPANY_ID_KEY);
      localStorage.removeItem(LAST_COMPANY_NAME_KEY);
      localStorage.removeItem(LAST_COMPANY_COLOR_KEY);
      localStorage.removeItem(LAST_COMPANY_LOGO_KEY);
    } catch {
      // ignore — worst case the stale keys get overwritten on next login
    }
    setCompanyForm({ companyId: "" });
    setLocalCompanyName("");
    setCompanyColor("#2563eb");
    setCompanyLogoSlug(null);
    setCompanyError("");
    setServerError("");
    setLoginErrors({});
    setLoginForm({ email: "", password: "" });
    setStep("company");
  };

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
      setLocalCompanyName(res.data.name ?? "");
      setCompanyColor(res.data.themeColor ?? "#2563eb");
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
      const res = await axios.post("/api/v1/auth/login", {
        ...result.data,
        companyId: companyForm.companyId,
      });
      if (res.data.user?.themeColor) setPrimaryColor(res.data.user.themeColor);
      if (res.data.user?.companyName) setCompanyName(res.data.user.companyName);
      if (res.data.user?.fullName) setUserName(res.data.user.fullName);
      if (res.data.user?.role) setUserRole(res.data.user.role);
      setIsOwner(!!res.data.user?.isOwner);
      setCompanyLogoSlug(res.data.user?.logoSlug ?? null);

      try {
        localStorage.setItem(LAST_COMPANY_ID_KEY, companyForm.companyId);
        if (res.data.user?.companyName) {
          localStorage.setItem(
            LAST_COMPANY_NAME_KEY,
            res.data.user.companyName,
          );
        }
        if (res.data.user?.themeColor) {
          localStorage.setItem(
            LAST_COMPANY_COLOR_KEY,
            res.data.user.themeColor,
          );
        }
        if (res.data.user?.logoSlug) {
          localStorage.setItem(LAST_COMPANY_LOGO_KEY, res.data.user.logoSlug);
        } else {
          localStorage.removeItem(LAST_COMPANY_LOGO_KEY);
        }
      } catch {
        // non-critical convenience persistence — ignore failures
      }

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

        {/* step indicator */}
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors"
            style={
              step !== "staff"
                ? { backgroundColor: companyColor, color: "#fff" }
                : { backgroundColor: companyColor + "4d", color: companyColor }
            }
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
            className="h-px flex-1 transition-colors"
            style={{
              backgroundColor:
                step === "staff" ? companyColor + "99" : "#ffffff1a",
            }}
          />
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors"
            style={
              step === "staff"
                ? { backgroundColor: companyColor, color: "#fff" }
                : { backgroundColor: "#ffffff0d", color: "#ffffff30" }
            }
          >
            2
          </div>
        </div>

        {/* heading */}
        <div className="flex flex-col gap-2">
          <p className="text-4xl font-light leading-tight">
            {step === "welcome" ? (
              <>
                Continue as{" "}
                <span style={{ color: companyColor }}>
                  {companyName || "your company"}
                </span>
              </>
            ) : step === "company" ? (
              "Enter your Company ID"
            ) : (
              <>
                Welcome,{" "}
                <span style={{ color: companyColor }}>
                  {companyName || "team"}
                </span>
              </>
            )}
          </p>
          <p className="font-light text-white/50 text-sm">
            {step === "welcome"
              ? "We remembered your last company on this device."
              : step === "company"
                ? "Your garage admin provides this ID."
                : "Sign in with your staff credentials."}
          </p>
        </div>

        {/* step 0: remembered company */}
        {step === "welcome" && (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => setStep("staff")}
              style={{ "--hover-border": companyColor } as React.CSSProperties}
              className="rounded-md border border-white/30 transition-all duration-100 ease-linear hover:border-(--hover-border) bg-black text-left flex items-center gap-3 px-4 py-3 cursor-pointer"
            >
              {companyLogoSlug ? (
                <img
                  src={`https://www.carlogos.org/car-logos/${companyLogoSlug}-logo.png`}
                  alt={companyName || "Company"}
                  className="w-10 h-10 rounded-full object-contain bg-white/5 shrink-0 p-1"
                  onError={(e) => {
                    const target = e.currentTarget;
                    const parent = target.parentElement;
                    if (parent) {
                      target.remove();
                      const fallback = document.createElement("div");
                      fallback.className =
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-[10px] font-semibold text-white text-center leading-tight px-1 truncate";
                      fallback.style.backgroundColor = companyColor;
                      fallback.textContent = (companyName || "?").split(" ")[0];
                      parent.insertBefore(fallback, parent.firstChild);
                    }
                  }}
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-[10px] font-semibold text-white text-center leading-tight px-1 truncate"
                  style={{ backgroundColor: companyColor }}
                >
                  {(companyName || "?").split(" ")[0]}
                </div>
              )}
              <span className="flex-1 truncate">
                Continue as {companyName || "your company"}
              </span>
            </button>
            <button
              onClick={handleForgetCompany}
              className="text-white/40 hover:text-white/70 text-sm transition-colors w-fit mx-auto"
            >
              Not {companyName || "this company"}? Sign in to a different
              company
            </button>
          </div>
        )}

        {/* step 1 */}
        {step === "company" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="font-sans font-light ml-4 text-sm">Company ID</p>
              <input
                type="text"
                placeholder="e.g. MERCADOAUTO-A3F7K2PQ"
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
              style={{ backgroundColor: companyColor }}
            />
          </div>
        )}

        {/* step 2 */}
        {step === "staff" && (
          <div className="flex flex-col gap-4">
            <button
              onClick={handleForgetCompany}
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
              <Link
                href="/forgot"
                className="text-sm transition-colors"
                style={{ color: companyColor }}
              >
                Forgot Password?
              </Link>
            </div>

            {serverError && (
              <p className="text-red-400 text-sm text-center">{serverError}</p>
            )}

            <Button
              text={loading ? "Signing in…" : "Sign In"}
              onClick={handleLogin}
              style={{ backgroundColor: companyColor }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
