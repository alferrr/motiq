"use client";
import { Fragment } from "react";
import Header from "@/components/ui/Header";
import Footer from "@/components/shared/Footer";
import LogoLoop from "../LogoLoop";

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
import GlassCard from "../ui/GlassCard";
import CountUp from "../CountUp";

import Image from "next/image";
import Link from "next/link";
import { resolveHref, type SiteContent } from "@/lib/content";

// Car-brand logos are React icon components, not plain data, so they're
// excluded from the CMS and stay hardcoded — see lib/content.ts.
const carBrands = [
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

// renders a string with `\n`-delimited line breaks (the CMS's multi-line
// copy convention — see lib/content.ts)
function MultilineText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i, arr) => (
        <Fragment key={i}>
          {line}
          {i < arr.length - 1 && <br />}
        </Fragment>
      ))}
    </>
  );
}

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

const Hero = ({ content }: { content: SiteContent }) => {
  const { hero, platform, meet, howItWorks } = content;

  return (
    <>
      <Header />

      <div
        id="hero"
        className="hero flex flex-col justify-center items-center gap-6 relative text-white px-4 scroll-mt-24"
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
            <MultilineText text={hero.headline} />
          </h1>
          <p className="text-center text-sm sm:text-base font-sans font-light z-5 leading-normal max-w-md sm:max-w-none">
            <MultilineText text={hero.subhead} />
          </p>
          <nav className="flex flex-col sm:flex-row gap-3 items-center z-5 w-full sm:w-auto px-6 sm:px-0">
            <Link
              href={resolveHref(hero.ctaPrimaryHref)}
              className="w-full sm:w-auto text-center px-7 py-3 rounded-full border border-white/10 bg-[#0e61d5] font-light text-sm transition-colors hover:bg-[#0e61d5]/90"
            >
              {hero.ctaPrimaryLabel}
            </Link>
            <Link
              href={resolveHref(hero.ctaSecondaryHref)}
              className="w-full sm:w-auto text-center px-7 py-3 rounded-full border border-white/10 bg-white text-black font-light text-sm transition-colors hover:bg-white/90"
            >
              {hero.ctaSecondaryLabel}
            </Link>
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
        id="platform"
        className="flex flex-col gap-4 items-center justify-center p-6 py-16 sm:p-20 bg-black text-white scroll-mt-24"
        style={{
          backgroundImage: "url('/bflare.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <h2 className="gradient-title text-white text-xl font-heading">
          {platform.eyebrow}
        </h2>
        <h1 className="text-3xl sm:text-4xl md:text-5xl text-center font-heading leading-normal z-5 mt-10 sm:mt-20">
          <MultilineText text={platform.heading} />
        </h1>
        <p className="w-full max-w-150 text-center text-sm sm:text-base font-light">
          {platform.paragraph}
        </p>

        <div className="flex flex-col gap-6 w-full max-w-6xl">
          <div className="flex flex-col md:flex-row w-full mt-10 sm:mt-20 gap-6 justify-center">
            <FeatureCard
              {...platform.features[0]}
              className="w-full md:w-[60%]"
            />
            <FeatureCard
              {...platform.features[1]}
              className="w-full md:w-[40%]"
            />
          </div>
          <div className="flex flex-col md:flex-row-reverse w-full gap-6 justify-center">
            <FeatureCard
              {...platform.features[2]}
              className="w-full md:w-[60%]"
            />
            <FeatureCard
              {...platform.features[3]}
              className="w-full md:w-[40%]"
            />
          </div>
        </div>
      </div>

      <div
        id="meet"
        className="flex flex-col gap-4 items-center justify-center p-6 py-16 sm:p-20 bg-black text-white scroll-mt-24"
        style={{
          backgroundImage: "url('/meet.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <h2 className="gradient-title text-white text-xl font-heading">
          {meet.eyebrow}
        </h2>
        <h1 className="text-3xl sm:text-4xl md:text-5xl text-center font-heading leading-normal z-5 mt-10 sm:mt-20">
          <MultilineText text={meet.heading} />
        </h1>
        <p className="w-full max-w-150 text-center text-sm sm:text-base font-light">
          {meet.paragraph}
        </p>
        <Image
          src="/hero.png"
          alt="Motiq dashboard preview"
          width={2940}
          height={1672}
          className="w-full sm:w-[85%] md:w-[80%] h-auto mt-10 sm:mt-20 mb-10 sm:mb-20 rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
        />

        <div className="flex flex-wrap gap-8 items-center justify-center sm:justify-between w-full">
          {meet.stats.map((stat, i) => (
            <div className="stat-container" key={i}>
              <div className="number">
                <CountUp
                  from={0}
                  to={stat.value}
                  separator=","
                  direction="up"
                  duration={0.5}
                  className=""
                  delay={0}
                />
                {stat.suffix}
              </div>
              <p>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div
        id="how-it-works"
        className="flex flex-col gap-4 items-center justify-center p-6 py-16 sm:p-20 bg-black text-white scroll-mt-24"
        style={{
          backgroundImage: "url('/bg2.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <h2 className="gradient-title">{howItWorks.eyebrow}</h2>

        <h1 className="text-3xl sm:text-4xl md:text-5xl text-center font-heading leading-normal z-5 mt-10 sm:mt-20">
          <MultilineText text={howItWorks.heading} />
        </h1>
        <p className="w-full max-w-150 text-center text-sm sm:text-base font-light">
          {howItWorks.paragraph}
        </p>
        <div className="flex flex-col md:flex-row justify-between w-full max-w-6xl mt-10 sm:mt-20 gap-6">
          {howItWorks.steps.map((step, i) => {
            return (
              <GlassCard
                key={i}
                className="w-full md:w-100 min-h-100 p-[14px]"
                contentClassName=""
              >
                <div className="photo relative h-50 border border-white/10 rounded-xl w-full overflow-hidden">
                  <Image
                    src={step.image}
                    alt={step.title}
                    fill
                    className="object-cover object-top"
                  />
                </div>

                <div className="flex flex-col gap-2 mt-5">
                  <h2 className="font-sans text-xl">{step.title}</h2>
                  <p className="font-light">{step.desc}</p>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>

      <Footer content={content.footer} />
    </>
  );
};

export default Hero;
