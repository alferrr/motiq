"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import LineWaves from "@/components/LineWaves";
import Button from "@/components/ui/Button";

// ── types ─────────────────────────────────────────────────────────────────────

type CompanyInfo = {
  garageName: string;
  address: string;
  contactNumber: string;
  email: string;
};

type BrandingInfo = {
  themeColor: string;
};

type GarageDetails = {
  garageType: string;
  numberOfBays: string;
  openingTime: string;
  closingTime: string;
};

type BusinessRequirements = {
  businessPermitNumber: string;
  dtiSecNumber: string;
  yearsInOperation: string;
};

type OwnerInfo = {
  fullName: string;
  idType: string;
  idNumber: string;
};

type AdminAccount = {
  fullName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type Errors<T> = Partial<Record<keyof T, string>>;

// ── constants ─────────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Company", description: "Basic garage info" },
  { label: "Branding", description: "Choose your theme color" },
  { label: "Garage", description: "Operations details" },
  { label: "Business", description: "Permits & registration" },
  { label: "Owner", description: "Owner identification" },
  { label: "Account", description: "Admin credentials" },
  { label: "Review", description: "Confirm & submit" },
];

const GARAGE_TYPES = [
  "Auto Repair",
  "Car Wash",
  "Tire Shop",
  "Body & Paint",
  "Diagnostic Center",
  "General Service",
];

const ID_TYPES = [
  "Driver's License",
  "Passport",
  "SSS ID",
  "PhilHealth ID",
  "Postal ID",
  "Voter's ID",
  "National ID",
];

const PRESET_COLORS = [
  { label: "Blue", value: "#2563eb" },
  { label: "Indigo", value: "#4f46e5" },
  { label: "Violet", value: "#7c3aed" },
  { label: "Rose", value: "#e11d48" },
  { label: "Orange", value: "#ea580c" },
  { label: "Amber", value: "#d97706" },
  { label: "Green", value: "#16a34a" },
  { label: "Teal", value: "#0d9488" },
  { label: "Cyan", value: "#0891b2" },
  { label: "Slate", value: "#475569" },
];

// ── shared styles ─────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-full border border-white/10 text-base text-white py-2.5 px-5 font-light bg-transparent focus:outline-none focus:border-blue-600 transition-colors placeholder:text-white/25";

const selectCls =
  "w-full rounded-full border border-white/10 text-base text-white py-2.5 px-5 font-light bg-black focus:outline-none focus:border-blue-600 transition-colors appearance-none";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-light text-white/50 ml-1">{label}</p>
      {children}
      {error && <p className="text-red-400 text-xs ml-1">{error}</p>}
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    garageName: "",
    address: "",
    contactNumber: "",
    email: "",
  });
  const [companyErrors, setCompanyErrors] = useState<Errors<CompanyInfo>>({});

  const [branding, setBranding] = useState<BrandingInfo>({
    themeColor: "#2563eb",
  });
  const [customColor, setCustomColor] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  const [garageDetails, setGarageDetails] = useState<GarageDetails>({
    garageType: "",
    numberOfBays: "",
    openingTime: "",
    closingTime: "",
  });
  const [garageErrors, setGarageErrors] = useState<Errors<GarageDetails>>({});

  const [businessReqs, setBusinessReqs] = useState<BusinessRequirements>({
    businessPermitNumber: "",
    dtiSecNumber: "",
    yearsInOperation: "",
  });
  const [businessErrors, setBusinessErrors] = useState<
    Errors<BusinessRequirements>
  >({});

  const [ownerInfo, setOwnerInfo] = useState<OwnerInfo>({
    fullName: "",
    idType: "",
    idNumber: "",
  });
  const [ownerErrors, setOwnerErrors] = useState<Errors<OwnerInfo>>({});

  const [adminAccount, setAdminAccount] = useState<AdminAccount>({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [adminErrors, setAdminErrors] = useState<Errors<AdminAccount>>({});

  // ── handlers ─────────────────────────────────────────────────────────────────

  const handleCompany = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCompanyInfo((p) => ({ ...p, [name]: value }));
    setCompanyErrors((p) => ({ ...p, [name]: undefined }));
  };

  const handleGarage = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setGarageDetails((p) => ({ ...p, [name]: value }));
    setGarageErrors((p) => ({ ...p, [name]: undefined }));
  };

  const handleBusiness = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBusinessReqs((p) => ({ ...p, [name]: value }));
    setBusinessErrors((p) => ({ ...p, [name]: undefined }));
  };

  const handleOwner = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setOwnerInfo((p) => ({ ...p, [name]: value }));
    setOwnerErrors((p) => ({ ...p, [name]: undefined }));
  };

  const handleAdmin = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAdminAccount((p) => ({ ...p, [name]: value }));
    setAdminErrors((p) => ({ ...p, [name]: undefined }));
  };

  const selectPreset = (color: string) => {
    setBranding({ themeColor: color });
    setUseCustom(false);
    setCustomColor("");
  };

  const applyCustomColor = (val: string) => {
    setCustomColor(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      setBranding({ themeColor: val });
    }
  };

  // ── validation ────────────────────────────────────────────────────────────────

  const validateCompany = () => {
    const e: Errors<CompanyInfo> = {};
    if (!companyInfo.garageName.trim())
      e.garageName = "Garage name is required";
    if (!companyInfo.address.trim()) e.address = "Address is required";
    if (!companyInfo.contactNumber.trim())
      e.contactNumber = "Contact number is required";
    if (!companyInfo.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(companyInfo.email))
      e.email = "Enter a valid email";
    setCompanyErrors(e);
    return !Object.keys(e).length;
  };

  const validateBranding = () => {
    if (useCustom && !/^#[0-9a-fA-F]{6}$/.test(customColor)) return false;
    return true;
  };

  const validateGarage = () => {
    const e: Errors<GarageDetails> = {};
    if (!garageDetails.garageType) e.garageType = "Select a garage type";
    if (!garageDetails.numberOfBays.trim())
      e.numberOfBays = "Number of bays is required";
    else if (isNaN(Number(garageDetails.numberOfBays)))
      e.numberOfBays = "Must be a number";
    if (!garageDetails.openingTime) e.openingTime = "Opening time is required";
    if (!garageDetails.closingTime) e.closingTime = "Closing time is required";
    setGarageErrors(e);
    return !Object.keys(e).length;
  };

  const validateBusiness = () => {
    const e: Errors<BusinessRequirements> = {};
    if (!businessReqs.businessPermitNumber.trim())
      e.businessPermitNumber = "Business permit number is required";
    if (!businessReqs.dtiSecNumber.trim())
      e.dtiSecNumber = "DTI/SEC number is required";
    if (!businessReqs.yearsInOperation.trim())
      e.yearsInOperation = "Years in operation is required";
    else if (isNaN(Number(businessReqs.yearsInOperation)))
      e.yearsInOperation = "Must be a number";
    setBusinessErrors(e);
    return !Object.keys(e).length;
  };

  const validateOwner = () => {
    const e: Errors<OwnerInfo> = {};
    if (!ownerInfo.fullName.trim()) e.fullName = "Owner name is required";
    if (!ownerInfo.idType) e.idType = "Select an ID type";
    if (!ownerInfo.idNumber.trim()) e.idNumber = "ID number is required";
    setOwnerErrors(e);
    return !Object.keys(e).length;
  };

  const validateAdmin = () => {
    const e: Errors<AdminAccount> = {};
    if (!adminAccount.fullName.trim()) e.fullName = "Full name is required";
    if (!adminAccount.username.trim()) e.username = "Username is required";
    if (!adminAccount.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(adminAccount.email))
      e.email = "Enter a valid email";
    if (!adminAccount.password) e.password = "Password is required";
    else if (adminAccount.password.length < 8)
      e.password = "Minimum 8 characters";
    if (!adminAccount.confirmPassword)
      e.confirmPassword = "Please confirm your password";
    else if (adminAccount.password !== adminAccount.confirmPassword)
      e.confirmPassword = "Passwords do not match";
    setAdminErrors(e);
    return !Object.keys(e).length;
  };

  // ── navigation ────────────────────────────────────────────────────────────────

  const validators = [
    validateCompany,
    validateBranding,
    validateGarage,
    validateBusiness,
    validateOwner,
    validateAdmin,
  ];

  const handleNext = () => {
    if (step < STEPS.length - 1 && validators[step]()) setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => s - 1);

  // ── submit ────────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setServerError("");
    setLoading(true);
    try {
      const res = await axios.post("/api/v1/auth/register", {
        company: { ...companyInfo, themeColor: branding.themeColor },
        garage: garageDetails,
        business: businessReqs,
        owner: ownerInfo,
        admin: adminAccount,
      });
      const { companyId } = res.data;
      router.push(
        `/register/success?companyId=${companyId}&color=${encodeURIComponent(branding.themeColor)}`,
      );
    } catch (err: any) {
      setServerError(
        err.response?.data?.error ?? "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ── review helpers ────────────────────────────────────────────────────────────

  const ReviewRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
      <span className="text-white/40 text-sm">{label}</span>
      <span className="text-white text-sm font-light">{value || "—"}</span>
    </div>
  );

  const ReviewSection = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div className="flex flex-col gap-1">
      <p
        className="text-xs uppercase tracking-widest mb-1"
        style={{ color: branding.themeColor }}
      >
        {title}
      </p>
      {children}
    </div>
  );

  // ── render ────────────────────────────────────────────────────────────────────

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
          color3={branding.themeColor}
          mouseInfluence={2}
        />
      </div>

      {/* form side */}
      <div className="w-screen h-screen md:w-[50%] relative rounded-br-4xl rounded-tr-4xl text-white px-6 lg:px-24 flex flex-col gap-5 justify-center bg-black z-10 overflow-y-auto py-12">
        <h1 className="font-heading font-light text-lg">Motiq</h1>

        {/* step indicator */}
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-1 flex-1 last:flex-none"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                  i < step
                    ? "text-white"
                    : i === step
                      ? "text-white"
                      : "bg-white/5 text-white/20"
                }`}
                style={
                  i < step
                    ? {
                        backgroundColor: branding.themeColor + "4d",
                        color: branding.themeColor,
                      }
                    : i === step
                      ? { backgroundColor: branding.themeColor }
                      : {}
                }
              >
                {i < step ? (
                  <svg
                    viewBox="0 0 12 12"
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="2,6 5,9 10,3" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="h-px flex-1 transition-all duration-300"
                  style={{
                    backgroundColor:
                      i < step ? branding.themeColor + "66" : "#ffffff0d",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* heading */}
        <div className="flex flex-col gap-1">
          <p className="text-3xl font-light">{STEPS[step].label}</p>
          <p className="text-sm font-light text-white/40">
            {STEPS[step].description}
          </p>
        </div>

        {/* ── step 0: company info ── */}
        {step === 0 && (
          <div className="flex flex-col gap-3">
            <Field label="Garage Name" error={companyErrors.garageName}>
              <input
                className={inputCls}
                name="garageName"
                placeholder="Mercado Auto Repair"
                value={companyInfo.garageName}
                onChange={handleCompany}
              />
            </Field>
            <Field label="Address" error={companyErrors.address}>
              <input
                className={inputCls}
                name="address"
                placeholder="123 Colon St, Cebu City"
                value={companyInfo.address}
                onChange={handleCompany}
              />
            </Field>
            <Field label="Contact Number" error={companyErrors.contactNumber}>
              <input
                className={inputCls}
                name="contactNumber"
                placeholder="09171234567"
                value={companyInfo.contactNumber}
                onChange={handleCompany}
              />
            </Field>
            <Field label="Email" error={companyErrors.email}>
              <input
                className={inputCls}
                name="email"
                type="email"
                placeholder="garage@example.com"
                value={companyInfo.email}
                onChange={handleCompany}
              />
            </Field>
          </div>
        )}

        {/* ── step 1: branding ── */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            {/* preview */}
            <div
              className="w-full rounded-2xl p-4 flex items-center gap-3 transition-colors duration-300"
              style={{
                backgroundColor: branding.themeColor + "1a",
                border: `1px solid ${branding.themeColor}33`,
              }}
            >
              <div
                className="w-10 h-10 rounded-xl shrink-0"
                style={{ backgroundColor: branding.themeColor }}
              />
              <div>
                <p className="text-sm font-medium text-white">
                  {companyInfo.garageName || "Your Garage"}
                </p>
                <p className="text-xs text-white/40">Theme preview</p>
              </div>
              <div
                className="ml-auto text-xs px-3 py-1.5 rounded-full font-medium text-white"
                style={{ backgroundColor: branding.themeColor }}
              >
                Primary
              </div>
            </div>

            {/* presets */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-light text-white/50 ml-1">
                Choose a color
              </p>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => {
                  const selected =
                    branding.themeColor === c.value && !useCustom;
                  return (
                    <button
                      key={c.value}
                      onClick={() => selectPreset(c.value)}
                      title={c.label}
                      className={`w-8 h-8 rounded-full transition-all duration-200 ${
                        selected
                          ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110"
                          : "opacity-70 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: c.value }}
                    />
                  );
                })}
              </div>
            </div>

            {/* custom hex */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-light text-white/50 ml-1">
                Or enter a custom hex
              </p>
              <div className="flex items-center gap-2">
                <input
                  className={inputCls + " flex-1"}
                  placeholder="#e63946"
                  value={customColor}
                  maxLength={7}
                  onChange={(e) => {
                    setUseCustom(true);
                    applyCustomColor(e.target.value);
                  }}
                />
                {/* native color picker */}
                <label
                  className="w-11 h-11 rounded-full border border-white/10 flex items-center justify-center cursor-pointer overflow-hidden shrink-0"
                  title="Pick color"
                  style={{
                    backgroundColor:
                      useCustom && /^#[0-9a-fA-F]{6}$/.test(customColor)
                        ? customColor
                        : "#ffffff1a",
                  }}
                >
                  <input
                    type="color"
                    className="opacity-0 absolute w-0 h-0"
                    value={
                      useCustom && /^#[0-9a-fA-F]{6}$/.test(customColor)
                        ? customColor
                        : branding.themeColor
                    }
                    onChange={(e) => {
                      setUseCustom(true);
                      setCustomColor(e.target.value);
                      setBranding({ themeColor: e.target.value });
                    }}
                  />
                </label>
              </div>
              {useCustom &&
                customColor &&
                !/^#[0-9a-fA-F]{6}$/.test(customColor) && (
                  <p className="text-red-400 text-xs ml-1">
                    Enter a valid hex color (e.g. #e63946)
                  </p>
                )}
            </div>
          </div>
        )}

        {/* ── step 2: garage details ── */}
        {step === 2 && (
          <div className="flex flex-col gap-3">
            <Field label="Garage Type" error={garageErrors.garageType}>
              <div className="relative">
                <select
                  className={selectCls}
                  name="garageType"
                  value={garageDetails.garageType}
                  onChange={handleGarage}
                >
                  <option value="" disabled>
                    Select type
                  </option>
                  {GARAGE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <svg
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </Field>
            <Field label="Number of Bays" error={garageErrors.numberOfBays}>
              <input
                className={inputCls}
                name="numberOfBays"
                type="number"
                placeholder="e.g. 4"
                min="1"
                value={garageDetails.numberOfBays}
                onChange={handleGarage}
              />
            </Field>
            <div className="flex gap-3">
              <Field label="Opening Time" error={garageErrors.openingTime}>
                <input
                  className={inputCls}
                  name="openingTime"
                  type="time"
                  value={garageDetails.openingTime}
                  onChange={handleGarage}
                />
              </Field>
              <Field label="Closing Time" error={garageErrors.closingTime}>
                <input
                  className={inputCls}
                  name="closingTime"
                  type="time"
                  value={garageDetails.closingTime}
                  onChange={handleGarage}
                />
              </Field>
            </div>
          </div>
        )}

        {/* ── step 3: business requirements ── */}
        {step === 3 && (
          <div className="flex flex-col gap-3">
            <Field
              label="Business Permit Number"
              error={businessErrors.businessPermitNumber}
            >
              <input
                className={inputCls}
                name="businessPermitNumber"
                placeholder="BP-2024-XXXXXX"
                value={businessReqs.businessPermitNumber}
                onChange={handleBusiness}
              />
            </Field>
            <Field
              label="DTI / SEC Registration Number"
              error={businessErrors.dtiSecNumber}
            >
              <input
                className={inputCls}
                name="dtiSecNumber"
                placeholder="DTI-XXXXXXXXXX"
                value={businessReqs.dtiSecNumber}
                onChange={handleBusiness}
              />
            </Field>
            <Field
              label="Years in Operation"
              error={businessErrors.yearsInOperation}
            >
              <input
                className={inputCls}
                name="yearsInOperation"
                type="number"
                placeholder="e.g. 5"
                min="0"
                value={businessReqs.yearsInOperation}
                onChange={handleBusiness}
              />
            </Field>
          </div>
        )}

        {/* ── step 4: owner info ── */}
        {step === 4 && (
          <div className="flex flex-col gap-3">
            <Field label="Owner Full Name" error={ownerErrors.fullName}>
              <input
                className={inputCls}
                name="fullName"
                placeholder="Juan Dela Cruz"
                value={ownerInfo.fullName}
                onChange={handleOwner}
              />
            </Field>
            <Field label="Government-Issued ID Type" error={ownerErrors.idType}>
              <div className="relative">
                <select
                  className={selectCls}
                  name="idType"
                  value={ownerInfo.idType}
                  onChange={handleOwner}
                >
                  <option value="" disabled>
                    Select ID type
                  </option>
                  {ID_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <svg
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </Field>
            <Field label="ID Number" error={ownerErrors.idNumber}>
              <input
                className={inputCls}
                name="idNumber"
                placeholder="XXXX-XXXX-XXXX"
                value={ownerInfo.idNumber}
                onChange={handleOwner}
              />
            </Field>
          </div>
        )}

        {/* ── step 5: admin account ── */}
        {step === 5 && (
          <div className="flex flex-col gap-3">
            <Field label="Full Name" error={adminErrors.fullName}>
              <input
                className={inputCls}
                name="fullName"
                placeholder="Juan Dela Cruz"
                value={adminAccount.fullName}
                onChange={handleAdmin}
              />
            </Field>
            <Field label="Username" error={adminErrors.username}>
              <input
                className={inputCls}
                name="username"
                placeholder="juandc"
                value={adminAccount.username}
                onChange={handleAdmin}
              />
            </Field>
            <Field label="Email" error={adminErrors.email}>
              <input
                className={inputCls}
                name="email"
                type="email"
                placeholder="juan@example.com"
                value={adminAccount.email}
                onChange={handleAdmin}
              />
            </Field>
            <Field label="Password" error={adminErrors.password}>
              <input
                className={inputCls}
                name="password"
                type="password"
                placeholder="••••••••"
                value={adminAccount.password}
                onChange={handleAdmin}
              />
            </Field>
            <Field label="Confirm Password" error={adminErrors.confirmPassword}>
              <input
                className={inputCls}
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={adminAccount.confirmPassword}
                onChange={handleAdmin}
              />
            </Field>
          </div>
        )}

        {/* ── step 6: review ── */}
        {step === 6 && (
          <div className="flex flex-col gap-4 max-h-[45vh] overflow-y-auto pr-1">
            <ReviewSection title="Company">
              <ReviewRow label="Garage Name" value={companyInfo.garageName} />
              <ReviewRow label="Address" value={companyInfo.address} />
              <ReviewRow label="Contact" value={companyInfo.contactNumber} />
              <ReviewRow label="Email" value={companyInfo.email} />
            </ReviewSection>
            <ReviewSection title="Branding">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-white/40 text-sm">Theme Color</span>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full border border-white/20"
                    style={{ backgroundColor: branding.themeColor }}
                  />
                  <span className="text-white text-sm font-mono">
                    {branding.themeColor}
                  </span>
                </div>
              </div>
            </ReviewSection>
            <ReviewSection title="Garage">
              <ReviewRow label="Type" value={garageDetails.garageType} />
              <ReviewRow label="Bays" value={garageDetails.numberOfBays} />
              <ReviewRow
                label="Hours"
                value={`${garageDetails.openingTime} – ${garageDetails.closingTime}`}
              />
            </ReviewSection>
            <ReviewSection title="Business">
              <ReviewRow
                label="Permit No."
                value={businessReqs.businessPermitNumber}
              />
              <ReviewRow
                label="DTI/SEC No."
                value={businessReqs.dtiSecNumber}
              />
              <ReviewRow
                label="Years Open"
                value={businessReqs.yearsInOperation}
              />
            </ReviewSection>
            <ReviewSection title="Owner">
              <ReviewRow label="Name" value={ownerInfo.fullName} />
              <ReviewRow label="ID Type" value={ownerInfo.idType} />
              <ReviewRow label="ID Number" value={ownerInfo.idNumber} />
            </ReviewSection>
            <ReviewSection title="Admin Account">
              <ReviewRow label="Full Name" value={adminAccount.fullName} />
              <ReviewRow label="Username" value={adminAccount.username} />
              <ReviewRow label="Email" value={adminAccount.email} />
            </ReviewSection>
            {serverError && (
              <p className="text-red-400 text-sm text-center">{serverError}</p>
            )}
          </div>
        )}

        {/* navigation */}
        <div className={`flex gap-3 ${step > 0 ? "flex-row" : "flex-col"}`}>
          {step > 0 && (
            <button
              onClick={handleBack}
              className="w-full py-3 rounded-full border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-colors text-sm font-light"
            >
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              className="w-full py-3 rounded-full text-white font-light text-sm transition-colors"
              style={{ backgroundColor: branding.themeColor }}
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3 rounded-full text-white font-light text-sm transition-opacity disabled:opacity-60"
              style={{ backgroundColor: branding.themeColor }}
            >
              {loading ? "Submitting…" : "Submit"}
            </button>
          )}
        </div>

        <p className="text-center text-white/30 text-sm">
          Already registered?{" "}
          <Link
            href="/"
            className="transition-colors hover:opacity-80"
            style={{ color: branding.themeColor }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
