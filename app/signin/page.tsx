"use client";

import GlassCard from "@/components/ui/GlassCard";
import { useState } from "react";

export default function Page() {
  const [select, isSelected] = useState("login");

  return (
    <div
      className="bg-black h-screen"
      style={{
        backgroundImage: "url('/login.jpg')",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <div className="h-screen w-[50%] bg-black rounded-br-4xl rounded-tr-4xl text-white p-8 px-24 flex flex-col gap-6 justify-center">
        <h1 className="text-4xl font-heading font-light text-lg">Motiq</h1>

        <div className="flex flex-col gap-2 font-sans font-normal text-sm">
          <p className="text-5xl">Welcome Back!</p>
          <p>We are happy to see u again.</p>
        </div>

        <div className="flex gap-2 border rounded-4xl border-white/10 p-1 ">
          <button className="w-[50%] rounded-full py-3 bg-blue-700">
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
