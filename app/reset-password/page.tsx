"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import LineWaves from "@/components/LineWaves";
import Button from "@/components/ui/Button";
import axios from "axios";
import { z } from "zod";

const PasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const inputCls =
    "w-full rounded-full border border-white/10 text-lg text-white p-2 px-6 font-light bg-transparent focus:outline-none focus:border-blue-600 transition-colors";

  const handleSubmit = async () => {
    setServerError("");
    setErrors({});

    const result = PasswordSchema.safeParse(form);
    if (!result.success) {
      const flattened = result.error.flatten().fieldErrors;
      const next: Partial<Record<string, string>> = {};
      Object.keys(flattened).forEach((k) => {
        const msg = (flattened as any)[k]?.[0];
        if (msg) next[k] = msg;
      });
      setErrors(next);
      return;
    }

    setLoading(true);
    try {
      await axios.post("/api/v1/auth/reset-password", {
        token,
        newPassword: form.newPassword,
      });
      setDone(true);
      setTimeout(() => router.push("/signin"), 2500);
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
          color3="#2563eb"
          mouseInfluence={2}
        />
      </div>

      <div className="w-screen h-screen md:w-[50%] relative rounded-br-4xl rounded-tr-4xl text-white p-8 px-6 lg:px-24 flex flex-col gap-6 justify-center bg-black z-10">
        <h1 className="font-heading font-light text-lg">Motiq</h1>

        {!token ? (
          <div className="flex flex-col gap-4">
            <p className="text-4xl font-light leading-tight">
              Invalid reset link
            </p>
            <p className="font-light text-white/50 text-sm">
              This link is missing its token. Request a new one below.
            </p>
            <Link href="/forgot" className="w-fit">
              <Button text="Back to Forgot Password" style={{ backgroundColor: "#2563eb" }} />
            </Link>
          </div>
        ) : done ? (
          <div className="flex flex-col gap-2">
            <p className="text-4xl font-light leading-tight">Password updated</p>
            <p className="font-light text-white/50 text-sm">
              Redirecting you to sign in…
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-4xl font-light leading-tight">
                Choose a new password
              </p>
              <p className="font-light text-white/50 text-sm">
                Must be at least 8 characters.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <p className="font-sans font-light ml-4 text-sm">New Password</p>
              <input
                type="password"
                placeholder="••••••••"
                value={form.newPassword}
                onChange={(e) => {
                  setForm((p) => ({ ...p, newPassword: e.target.value }));
                  setErrors((p) => ({ ...p, newPassword: undefined }));
                }}
                className={inputCls}
              />
              {errors.newPassword && (
                <p className="text-red-400 text-xs ml-4">{errors.newPassword}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <p className="font-sans font-light ml-4 text-sm">
                Confirm Password
              </p>
              <input
                type="password"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={(e) => {
                  setForm((p) => ({ ...p, confirmPassword: e.target.value }));
                  setErrors((p) => ({ ...p, confirmPassword: undefined }));
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className={inputCls}
              />
              {errors.confirmPassword && (
                <p className="text-red-400 text-xs ml-4">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {serverError && (
              <p className="text-red-400 text-sm text-center">{serverError}</p>
            )}

            <Button
              text={loading ? "Updating…" : "Update Password"}
              onClick={handleSubmit}
              style={{ backgroundColor: "#2563eb" }}
            />
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
