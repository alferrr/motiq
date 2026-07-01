"use client";
import Header from "@/components/ui/Header";
import Button from "../ui/Button";
import LogoLoop from "../LogoLoop";
import Footer from "@/components/shared/Footer";

import {
  SiToyota,
  SiHonda,
  SiFord,
  SiNissan,
  SiHyundai,
  SiKia,
  SiBmw,
  SiAudi,
  SiVolkswagen,
  SiTesla,
  SiChevrolet,
  SiSuzuki,
  SiSubaru,
  SiMazda,
  SiVolvo,
  SiPorsche,
  SiFerrari,
  SiLamborghini,
  SiMitsubishi,
} from "react-icons/si";
import SpotlightCard from "../SpotlightCard";
import GlassCard from "../ui/GlassCard";
import CountUp from "../CountUp";

import Image from "next/image";

export const carBrands = [
  { node: <SiToyota />, title: "Toyota" },
  { node: <SiHonda />, title: "Honda" },
  { node: <SiFord />, title: "Ford" },
  { node: <SiNissan />, title: "Nissan" },
  { node: <SiHyundai />, title: "Hyundai" },
  { node: <SiKia />, title: "Kia" },
  { node: <SiBmw />, title: "BMW" },
  { node: <SiAudi />, title: "Audi" },
  { node: <SiVolkswagen />, title: "Volkswagen" },
  { node: <SiTesla />, title: "Tesla" },
  { node: <SiChevrolet />, title: "Chevrolet" },
  { node: <SiSuzuki />, title: "Suzuki" },
  { node: <SiSubaru />, title: "Subaru" },
  { node: <SiMazda />, title: "Mazda" },
  { node: <SiVolvo />, title: "Volvo" },
  { node: <SiPorsche />, title: "Porsche" },
  { node: <SiFerrari />, title: "Ferrari" },
  { node: <SiLamborghini />, title: "Lamborghini" },
  { node: <SiMitsubishi />, title: "Mitsubishi" },
];

export const steps = [
  {
    step: 1,
    title: "Register Customer & Vehicle",
    desc: "Record customer information, vehicle details, and reported issues into the system.",
  },
  {
    step: 2,
    title: "Manage Repair Process",
    desc: "Assign repair jobs, update service progress, and maintain detailed repair records.",
  },
  {
    step: 3,
    title: "Generate Billing & Reports",
    desc: "Automatically compute labor and parts costs, print invoices, and maintain accurate financial records.",
  },
];

const platformFeatures = [
  {
    title: "Customer & Vehicle Record Managment",
    desc: "Store and organize customer information, vehicle details, service history, and repair reords for quick and accurate retrieval",
    image: "/profile.png",
    span: "wide",
  },
  {
    title: "Repair Job Tracking",
    desc: "Monitor ongoing repairs, assign tasks, track job status, and maintain detailed service documentation.",
    image: "/orders.png",
    span: "narrow",
  },
  {
    title: "Reports & Analytics",
    desc: "Access service reports, revenue summaries, repair histories, and performance metrics to support informed decision-making.",
    image: "/reports.png",
    span: "wide",
  },
  {
    title: "Automated Billing & Invoicing",
    desc: "Generate accurate invoices automatically based on labor costs and parts used, reducing calculation errors and improving transparency.",
    image: "/invoice.png",
    span: "narrow",
  },
];

function FeatureCard({
  title,
  desc,
  image,
  className,
}: {
  title: string;
  desc: string;
  image: string;
  className?: string;
}) {
  return (
    <GlassCard
      className={`h-80 sm:h-96 ${className ?? ""}`}
      contentClassName="h-full min-h-0"
    >
      <h2 className="text-xl sm:text-2xl font-normal font-sans">{title}</h2>
      <p className="font-sans font-light text-sm sm:text-base">{desc}</p>
      <div className="relative flex-1 w-[95%] mx-auto -mb-6 mt-2 min-h-0 rounded-t-xl overflow-hidden">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover object-top"
        />
      </div>
    </GlassCard>
  );
}

const Hero = () => {
  return (
    <>
      <Header />

      <div
        className="hero flex flex-col justify-center items-center gap-6 relative text-white px-4"
        style={{
          backgroundImage: "url('/bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="flex flex-col items-center justify-center pt-32 pb-16 sm:py-40 sm:pb-30 gap-5">
          {" "}
          <h1 className="text-3xl sm:text-4xl md:text-5xl text-center font-heading leading-normal z-5">
            Everything your garage needs. <br /> One platform.
          </h1>
          <p className="text-center text-sm sm:text-base font-sans font-light z-5 leading-normal max-w-md sm:max-w-none">
            The all-in-one management platform designed for independent garages
            <br className="hidden sm:block" />
            and growing auto repair businesses.
          </p>
          <nav className="flex flex-col sm:flex-row gap-3 items-center z-5 w-full sm:w-auto px-6 sm:px-0">
            <Button text="Get Started Free" className="w-full sm:w-auto" />
            <Button
              text="Request a Demo"
              className="bg-white text-black w-full sm:w-auto"
            />
          </nav>
        </div>
        <Image
          src="/hero.png"
          alt="Motiq dashboard preview"
          width={2940}
          height={1672}
          className="w-full sm:w-[80%] h-auto mt-10 rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
          priority
        />
      </div>

      <div className="bg-black w-full p-5 text-white flex flex-col gap-10 items-center font-heading font-semibold">
        <p>Trusted by</p>
        <LogoLoop
          logos={carBrands}
          speed={40}
          direction="left"
          gap={200}
          logoHeight={50}
        />
      </div>

      <div
        className="flex flex-col gap-4 items-center justify-center p-6 py-16 sm:p-20 bg-black text-white"
        style={{
          backgroundImage: "url('/bflare.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <h2 className="gradient-title text-white text-xl font-heading">
          THE PLATFORM
        </h2>
        <h1 className="text-3xl sm:text-4xl md:text-5xl text-center font-heading leading-normal z-5 mt-10 sm:mt-20">
          Built for modern garages
        </h1>
        <p className="w-full max-w-150 text-center text-sm sm:text-base font-light">
          Motiq replaces paperwork with an intuitive digital workspace that
          keeps your operations connected and your business running efficiently.
        </p>

        <div className="flex flex-col gap-6 w-full max-w-6xl">
          <div className="flex flex-col md:flex-row w-full mt-10 sm:mt-20 gap-6 justify-center">
            <FeatureCard
              {...platformFeatures[0]}
              className="w-full md:w-[60%]"
            />
            <FeatureCard
              {...platformFeatures[1]}
              className="w-full md:w-[40%]"
            />
          </div>
          <div className="flex flex-col md:flex-row-reverse w-full gap-6 justify-center">
            <FeatureCard
              {...platformFeatures[2]}
              className="w-full md:w-[60%]"
            />
            <FeatureCard
              {...platformFeatures[3]}
              className="w-full md:w-[40%]"
            />
          </div>
        </div>
      </div>

      <div
        className="flex flex-col gap-4 items-center justify-center p-6 py-16 sm:p-20 bg-black text-white"
        style={{
          backgroundImage: "url('/meet.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <h2 className="gradient-title text-white text-xl font-heading">
          MEET MOTIQ
        </h2>
        <h1 className="text-3xl sm:text-4xl md:text-5xl text-center font-heading leading-normal z-5 mt-10 sm:mt-20">
          One Platform That Connects <br className="hidden sm:block" />
          Your Entire Garage{" "}
        </h1>
        <p className="w-full max-w-150 text-center text-sm sm:text-base font-light">
          Manage customers, mechanics, repair jobs, inventory, and billing
          through one centralized dashboard designed specifically for
          auto-repair businesses.
        </p>
        <GlassCard className="w-full mt-10 sm:mt-20 h-64 sm:h-100 md:h-150 mb-10 sm:mb-20"></GlassCard>

        <div className="flex flex-wrap gap-8 items-center justify-center sm:justify-between w-full">
          <div className="stat-container">
            <div className="number">
              {" "}
              <CountUp
                from={0}
                to={100}
                separator=","
                direction="up"
                duration={0.5}
                className=""
                delay={0}
              />
              +
            </div>

            <p>Garages Ready for Digital Management</p>
          </div>
          <div className="stat-container">
            <div className="number">
              {" "}
              <CountUp
                from={0}
                to={1}
                separator=","
                direction="up"
                duration={0.5}
                className=""
                delay={0}
              />
              K+
            </div>

            <p>Customer & Vehicle Records Managed</p>
          </div>
          <div className="stat-container">
            <div className="text-4xl sm:text-5xl flex items-center">
              {" "}
              <CountUp
                from={0}
                to={5}
                separator=","
                direction="up"
                duration={0.5}
                className=""
                delay={0}
              />
              x
            </div>

            <p className="mt-5">Faster Repair History Retrieval</p>
          </div>
          <div className="stat-container">
            <div className="number">
              {" "}
              <CountUp
                from={0}
                to={100}
                separator=","
                direction="up"
                duration={0.5}
                className=""
                delay={0}
              />
              %
            </div>

            <p>Accurate Automated Billing</p>
          </div>
        </div>
      </div>

      <div
        className="flex flex-col gap-4 items-center justify-center p-6 py-16 sm:p-20 bg-black text-white"
        style={{
          backgroundImage: "url('/bg2.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <h2 className="gradient-title">HOW IT WORKS</h2>

        <h1 className="text-3xl sm:text-4xl md:text-5xl text-center font-heading leading-normal z-5 mt-10 sm:mt-20">
          Manage Your Garage in
          <br />
          Three Simple Steps
        </h1>
        <p className="w-full max-w-150 text-center text-sm sm:text-base font-light">
          MOTIQ streamlines every stage of your workflow—from customer
          registration to repair completion and billing.
        </p>
        <div className="flex flex-col md:flex-row justify-between w-full max-w-6xl mt-10 sm:mt-20 gap-6">
          {steps.map((step) => {
            return (
              <GlassCard
                key={step.step}
                className="w-full md:w-100 min-h-100"
                contentClassName=""
              >
                <div className="photo h-50 border border-white/10 rounded-xl w-full"></div>

                <div className="flex flex-col gap-2 mt-5">
                  <h2 className="font-sans text-xl">{step.title}</h2>
                  <p className="font-light">{step.desc}</p>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>

      <Footer />
    </>
  );
};

export default Hero;
