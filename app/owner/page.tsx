"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import Button from "@/components/ui/Button";
import { LoginSchema, LoginFormType } from "@/schemas/auth.schema";

export default function OwnerLoginPage() {
  const [form, setForm] = useState<LoginFormType>({ email: "", password: "" });
  const [errors, setErrors] = useState<
    Partial<Record<keyof LoginFormType, string>>
  >({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const { setPrimaryColor, setCompanyName, setUserName, setUserRole, setIsOwner } =
    useTheme();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async () => {
    setServerError("");
    setErrors({});

    const result = LoginSchema.safeParse(form);
    if (!result.success) {
      const flattened = result.error.flatten().fieldErrors;
      const next: Partial<Record<keyof LoginFormType, string>> = {};
      (Object.keys(flattened) as (keyof LoginFormType)[]).forEach((field) => {
        if (flattened[field]?.[0]) next[field] = flattened[field]![0];
      });
      setErrors(next);
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post("/api/v1/auth/owner-login", result.data);
      if (res.data.user?.themeColor) setPrimaryColor(res.data.user.themeColor);
      if (res.data.user?.companyName) setCompanyName(res.data.user.companyName);
      if (res.data.user?.fullName) setUserName(res.data.user.fullName);
      if (res.data.user?.role) setUserRole(res.data.user.role);
      setIsOwner(!!res.data.user?.isOwner);
      router.push("/content");
    } catch (err: any) {
      setServerError(err.response?.data?.error ?? "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full rounded-full border border-white/10 text-lg text-white p-2 px-6 font-light bg-transparent focus:outline-none focus:border-blue-600 transition-colors";

  return (
    <div className="flex items-center justify-center h-screen bg-black">
      <div className="w-full max-w-sm p-8 flex flex-col gap-6 text-white">
        <h1 className="font-heading font-light text-lg">Motiq — Site Owner</h1>

        <div className="flex flex-col gap-2">
          <p className="font-sans font-light ml-4 text-sm">Email</p>
          <input
            type="email"
            name="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            className={inputCls}
          />
          {errors.email && (
            <p className="text-red-400 text-xs ml-4">{errors.email}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <p className="font-sans font-light ml-4 text-sm">Password</p>
          <input
            type="password"
            name="password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className={inputCls}
          />
          {errors.password && (
            <p className="text-red-400 text-xs ml-4">{errors.password}</p>
          )}
        </div>

        {serverError && (
          <p className="text-red-400 text-sm text-center">{serverError}</p>
        )}

        <Button
          text={loading ? "Signing in…" : "Sign In"}
          onClick={handleSubmit}
          className="w-full"
        />
      </div>
    </div>
  );
}
