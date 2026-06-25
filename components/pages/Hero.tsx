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
    title: "	Manage Repair Process",
    desc: "Assign repair jobs, update service progress, and maintain detailed repair records.",
  },
  {
    step: 3,
    title: "Generate Billing & Reports",
    desc: "Automatically compute labor and parts costs, print invoices, and maintain accurate financial records.",
  },
];
const Hero = () => {
  return (
    <>
      <Header />

      <div
        className="hero flex flex-col justify-center items-center gap-6 relative text-white"
        style={{
          backgroundImage: "url('/bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="flex flex-col items-center justify-center py-40 pb-30 gap-5">
          {" "}
          <h1 className="text-5xl text-center font-heading leading-normal z-5">
            Everything your garage needs. <br /> One platform.
          </h1>
          <p className="text-center font-sans font-light z-5 leading-normal">
            The all-in-one management platform designed for independent garages
            <br />
            and growing auto repair businesses.
          </p>
          <nav className="flex gap-3 items-center z-5">
            <Button text="Get Started Free" />
            <Button text="Request a Demo" className="bg-white text-black" />
          </nav>
        </div>
        <GlassCard className="h-[70vh] w-[70%] mt-10"></GlassCard>
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
        className="flex flex-col gap-4 items-center justify-center p-20 bg-black text-white"
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
        <h1 className="text-5xl text-center font-heading leading-normal z-5 mt-20">
          Built for modern garages
        </h1>
        <p className="w-150 text-center font-light">
          Motiq replaces paperwork with an intuitive digital workspace that
          keeps your operations connected and your business running efficiently.
        </p>

        <div className="flex flex-col gap-6 w-full">
          <div className="flex flex-1 w-full mt-20 gap-6 justify-center">
            <GlassCard className="w-[50%] h-100">
              <h2 className="text-2xl font-normal font-sans">
                Customer & Vehicle Record Managment
              </h2>
              <p className="font-sans font-light">
                Store and organize customer information, vehicle details,
                service history, and repair reords for quick and accurate
                retrieval
              </p>
            </GlassCard>
            <GlassCard className="w-[30%] h-100">
              <h2 className="text-2xl font-normal font-sans">
                Repair Job Tracking{" "}
              </h2>
              <p className="font-sans font-light">
                Monitor ongoing repairs, assign tasks, track job status, and
                maintain detailed service documentation.
              </p>
            </GlassCard>
          </div>
          <div className="flex flex-row-reverse flex-1 w-full gap-6 justify-center">
            <GlassCard className="w-[50%] h-100">
              <h2 className="text-2xl font-normal font-sans">
                Reports & Analytics
              </h2>
              <p className="font-sans font-light">
                Access service reports, revenue summaries, repair histories, and
                performance metrics to support informed decision-making.
              </p>
            </GlassCard>
            <GlassCard className="w-[30%] h-100">
              <h2 className="text-2xl font-normal font-sans">
                Automated Billing & Invoicing
              </h2>
              <p className="font-sans font-light">
                Generate accurate invoices automatically based on labor costs
                and parts used, reducing calculation errors and improving
                transparency.
              </p>
            </GlassCard>{" "}
          </div>
        </div>
      </div>

      <div
        className="flex flex-col gap-4 items-center justify-center p-20 bg-black text-white"
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
        <h1 className="text-5xl text-center font-heading leading-normal z-5 mt-20">
          One Platform That Connects <br />
          Your Entire Garage{" "}
        </h1>
        <p className="w-150 text-center font-light">
          Manage customers, mechanics, repair jobs, inventory, and billing
          through one centralized dashboard designed specifically for
          auto-repair businesses.
        </p>
        <GlassCard className="w-full mt-20 h-150 mb-20  "></GlassCard>

        <div className="flex justify-between items-center w-full">
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
            <div className="text-5xl flex items-center">
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
              x Faster
            </div>

            <p className="mt-5">Repair History Retrieval</p>
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
        className="flex flex-col gap-4 items-center justify-center p-20 bg-black text-white"
        style={{
          backgroundImage: "url('/bg2.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <h2 className="gradient-title">HOW IT WORKS</h2>

        <h1 className="text-5xl text-center font-heading leading-normal z-5 mt-20">
          Manage Your Garage in
          <br />
          Three Simple Steps
        </h1>
        <p className="w-150 text-center font-light">
          MOTIQ streamlines every stage of your workflow—from customer
          registration to repair completion and billing.
        </p>
        <div className="flex justify-between w-full mt-20">
          {steps.map((step) => {
            return (
              <GlassCard
                key={step.step}
                className="w-100 min-h-100"
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
