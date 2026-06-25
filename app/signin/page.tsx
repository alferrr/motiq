"use client";

import GlassCard from "@/components/ui/GlassCard";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { useState } from "react";
import PlasmaWave from "@/components/PlasmaWave";
import LineWaves from "@/components/LineWaves";
import Button from "@/components/ui/Button";

export default function Page() {
  const [select, setSelected] = useState<"login" | "register">("login");

  return (
    <div className="relative flex flex-row-reverse h-screen overflow-hidden bg-black">
      {/* Background — full bleed, behind everything */}
      <div className="w-[50%]">
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

      {/* Left panel — semi-transparent so plasma bleeds through */}
      <div className="h-screen w-[50%] relative rounded-br-4xl rounded-tr-4xl text-white p-8 px-24 flex flex-col gap-6 justify-center bg-black z-10">
        <h1 className="text-4xl font-heading font-light text-lg">Motiq</h1>

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
                  placeholder="alfzmercado240@gmail.com"
                  className="w-full rounded-full border border-white/10 text-lg text-white p-2 px-6 fo:border-blue-700 font-light bg-transparent"
                />
              </div>
              <div className="flex flex-col gap-2">
                <p className="font-sans font-light ml-4">Password</p>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full rounded-full border border-white/10 text-lg text-white p-2 px-6 active:border-blue-700 font-light bg-transparent"
                />
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
                    className="w-full rounded-full border border-white/10 text-lg text-white p-2 px-6 active:border-blue-700 font-light bg-transparent"
                  />
                </div>
                <div className="flex flex-col gap-2 w-[50%]">
                  <p className="font-sans font-light ml-4">Last Name</p>
                  <input
                    type="text"
                    placeholder="Mercado"
                    className="w-full rounded-full border border-white/10 text-lg text-white p-2 px-6 active:border-blue-700 font-light bg-transparent"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <p className="font-sans font-light ml-4">Email</p>
                <input
                  type="email"
                  placeholder="alfzmercado240@gmail.com"
                  className="w-full rounded-full border border-white/10 text-lg text-white p-2 px-6 active:border-blue-700 font-light bg-transparent"
                />
              </div>
              <div className="flex flex-col gap-2">
                <p className="font-sans font-light ml-4">Password</p>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full rounded-full border border-white/10 text-lg text-white p-2 px-6 active:border-blue-700 font-light bg-transparent"
                />
              </div>
              <div className="flex flex-col gap-2">
                <p className="font-sans font-light ml-4">Confirm Password</p>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full rounded-full border border-white/10 text-lg text-white p-2 px-6 active:border-blue-700 font-light bg-transparent"
                />
              </div>
            </div>
          )}
        </form>

        <Button text={select === "login" ? "Continue" : "Sign Up"} />
      </div>
    </div>
  );
}
