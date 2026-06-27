"use client";

import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { use, useState } from "react";
import LineWaves from "@/components/LineWaves";
import Button from "@/components/ui/Button";

import z from "zod";
import axios from "axios";
import {
  RegisterFormSchema,
  RegisterFormType,
  LoginFormType,
  LoginSchema,
} from "@/schemas/auth.schema";

import { useRouter } from "next/navigation";

export default function Page() {
  const [select, setSelected] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState<LoginFormType>({
    email: "",
    password: "",
  });

  const [form, setForm] = useState<RegisterFormType>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof RegisterFormType, string>>
  >({});
  const [loginErrors, setLoginErrors] = useState<
    Partial<Record<keyof LoginFormType, string>>
  >({});
  const [serverError, setServerError] = useState("");

  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleRegister = async () => {
    setServerError("");
    setFieldErrors({});

    const result = RegisterFormSchema.safeParse(form);
    if (!result.success) {
      const flattened = result.error.flatten().fieldErrors;
      const errors: Partial<Record<keyof RegisterFormType, string>> = {};

      (Object.keys(flattened) as Array<keyof RegisterFormType>).forEach(
        (field) => {
          const messages = flattened[field];
          if (messages?.[0]) errors[field] = messages[0];
        },
      );

      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const { confirmPassword, ...payload } = result.data;
      await axios.post("/api/v1/auth/register", payload);
      setSelected("login");
    } catch (err: any) {
      setServerError(err.response?.data?.error ?? "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
    setLoginErrors((prev: any) => ({ ...prev, [name]: undefined }));
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
      await axios.post("/api/v1/auth/login", result.data);
      // redirect after login
      router.push("/dashboard");
    } catch (err: any) {
      setServerError(err.response?.data?.error ?? "Login failed.");
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
          color3="#2563EB"
          mouseInfluence={2}
        />
      </div>

      <div className="w-screen h-screen md:w-[50%] relative rounded-br-4xl rounded-tr-4xl text-white p-8 px-6 lg:px-24 flex flex-col gap-6 justify-center bg-black z-10">
        <h1 className="font-heading font-light text-lg">Motiq</h1>

        <div className="flex flex-col gap-2 font-sans font-normal text-sm">
          <p className="text-5xl">
            {select === "login" ? "Welcome Back!" : "Get Started!"}
          </p>
          <p className="font-light">
            {select === "login"
              ? "We are happy to see you again."
              : "Fill up your details to continue."}
          </p>
        </div>

        <div className="flex gap-2 border rounded-4xl border-white/10 p-1">
          <button
            className={`w-[50%] rounded-full py-3 cursor-pointer ${select === "login" ? "bg-blue-700" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              setSelected("login");
            }}
          >
            Sign In
          </button>
          <button
            className={`w-[50%] rounded-full py-3 cursor-pointer ${select === "register" ? "bg-blue-700" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              setSelected("register");
            }}
          >
            Sign Up
          </button>
        </div>

        <form action="">
          {select === "login" ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <p className="font-sans font-light ml-4">Email</p>
                <input
                  type="email"
                  name="email"
                  placeholder="alfzmercado240@gmail.com"
                  onChange={handleLoginChange}
                  value={loginForm.email}
                  className="w-full rounded-full border border-white/10 text-lg text-white p-2 px-6 fo:border-blue-700 font-light bg-transparent"
                />
                {loginErrors.email && (
                  <p className="text-red-400 text-xs ml-4">
                    {loginErrors.email}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <p className="font-sans font-light ml-4">Password</p>
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  className="w-full rounded-full border border-white/10 text-lg text-white p-2 px-6 active:border-blue-700 font-light bg-transparent"
                />
                {loginErrors.password && (
                  <p className="text-red-400 text-xs ml-4">
                    {loginErrors.password}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between w-full">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox id="remember" />
                  <span className="text-sm text-white/80">Remember Me</span>
                </label>
                <Link href="/forgot" className="text-blue-700 text-sm">
                  Forgot Password?
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 w-full">
              <div className="flex gap-4 items-center w-full">
                <div className="flex flex-col gap-2 w-[50%]">
                  <p className="font-sans font-light ml-4">First Name</p>
                  <input
                    type="text"
                    placeholder="Alfer"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    className="w-full rounded-full border border-white/10 text-lg text-white p-2 px-6 active:border-blue-700 font-light bg-transparent"
                  />
                  {fieldErrors.firstName && (
                    <p className="text-red-400 text-xs ml-4">
                      {fieldErrors.firstName}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 w-[50%]">
                  <p className="font-sans font-light ml-4">Last Name</p>
                  <input
                    type="text"
                    placeholder="Mercado"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    className="w-full rounded-full border border-white/10 text-lg text-white p-2 px-6 active:border-blue-700 font-light bg-transparent"
                  />
                  {fieldErrors.lastName && (
                    <p className="text-red-400 text-xs ml-4">
                      {fieldErrors.lastName}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <p className="font-sans font-light ml-4">Email</p>
                <input
                  type="email"
                  placeholder="alfzmercado240@gmail.com"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full rounded-full border border-white/10 text-lg text-white p-2 px-6 active:border-blue-700 font-light bg-transparent"
                />
                {fieldErrors.email && (
                  <p className="text-red-400 text-xs ml-4">
                    {fieldErrors.email}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <p className="font-sans font-light ml-4">Password</p>
                <input
                  type="password"
                  placeholder="••••••••"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full rounded-full border border-white/10 text-lg text-white p-2 px-6 active:border-blue-700 font-light bg-transparent"
                />
                {fieldErrors.password && (
                  <p className="text-red-400 text-xs ml-4">
                    {fieldErrors.password}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <p className="font-sans font-light ml-4">Confirm Password</p>
                <input
                  type="password"
                  placeholder="••••••••"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="w-full rounded-full border border-white/10 text-lg text-white p-2 px-6 active:border-blue-700 font-light bg-transparent"
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-red-400 text-xs ml-4">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>
            </div>
          )}
        </form>

        {serverError && (
          <p className="text-red-400 text-sm text-center">{serverError}</p>
        )}
        <Button
          text={select === "login" ? "Continue" : "Sign Up"}
          onClick={select === "login" ? handleLogin : handleRegister}
        />
      </div>
    </div>
  );
}
