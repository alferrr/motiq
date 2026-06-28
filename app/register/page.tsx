"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import LineWaves from "@/components/LineWaves";
import Button from "@/components/ui/Button";

type CompanyInfo = {
  garageName: string;
  address: string;
  contactNumber: string;
  email: string;
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

const STEPS = [
  { label: "Company", description: "Basic garage info" },
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

// ── helpers ──────────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-full border border-white/10 text-base text-white py-2.5 px-5 font-light bg-transparent focus:outline-none focus:border-blue-600 transition-colors placeholder:text-white/25";

const selectCls =
  "w-full rounded-full border border-white/10 text-base text-white py-2.5 px-5 font-light bg-black focus:outline-none focus:border-blue-600 transition-colors appearance-none";

const labelCls = "text-sm font-light text-white/50 ml-1";

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
      <p className={labelCls}>{label}</p>
      {children}
      {error && <p className="text-red-400 text-xs ml-1">{error}</p>}
    </div>
  );
}

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

  const validateCompany = () => {
    const errors: Errors<CompanyInfo> = {};
    if (!companyInfo.garageName.trim())
      errors.garageName = "Garage name is required";
    if (!companyInfo.address.trim()) errors.address = "Address is required";
    if (!companyInfo.contactNumber.trim())
      errors.contactNumber = "Contact number is required";
    if (!companyInfo.email.trim()) errors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(companyInfo.email))
      errors.email = "Enter a valid email";
    setCompanyErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateGarage = () => {
    const errors: Errors<GarageDetails> = {};
    if (!garageDetails.garageType) errors.garageType = "Select a garage type";
    if (!garageDetails.numberOfBays.trim())
      errors.numberOfBays = "Number of bays is required";
    else if (isNaN(Number(garageDetails.numberOfBays)))
      errors.numberOfBays = "Must be a number";
    if (!garageDetails.openingTime)
      errors.openingTime = "Opening time is required";
    if (!garageDetails.closingTime)
      errors.closingTime = "Closing time is required";
    setGarageErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateBusiness = () => {
    const errors: Errors<BusinessRequirements> = {};
    if (!businessReqs.businessPermitNumber.trim())
      errors.businessPermitNumber = "Business permit number is required";
    if (!businessReqs.dtiSecNumber.trim())
      errors.dtiSecNumber = "DTI/SEC number is required";
    if (!businessReqs.yearsInOperation.trim())
      errors.yearsInOperation = "Years in operation is required";
    else if (isNaN(Number(businessReqs.yearsInOperation)))
      errors.yearsInOperation = "Must be a number";
    setBusinessErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateOwner = () => {
    const errors: Errors<OwnerInfo> = {};
    if (!ownerInfo.fullName.trim()) errors.fullName = "Owner name is required";
    if (!ownerInfo.idType) errors.idType = "Select an ID type";
    if (!ownerInfo.idNumber.trim()) errors.idNumber = "ID number is required";
    setOwnerErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateAdmin = () => {
    const errors: Errors<AdminAccount> = {};
    if (!adminAccount.fullName.trim())
      errors.fullName = "Full name is required";
    if (!adminAccount.username.trim()) errors.username = "Username is required";
    if (!adminAccount.email.trim()) errors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(adminAccount.email))
      errors.email = "Enter a valid email";
    if (!adminAccount.password) errors.password = "Password is required";
    else if (adminAccount.password.length < 8)
      errors.password = "Minimum 8 characters";
    if (!adminAccount.confirmPassword)
      errors.confirmPassword = "Please confirm your password";
    else if (adminAccount.password !== adminAccount.confirmPassword)
      errors.confirmPassword = "Passwords do not match";
    setAdminErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    const validators = [
      validateCompany,
      validateGarage,
      validateBusiness,
      validateOwner,
      validateAdmin,
    ];
    if (step < 5 && validators[step]()) setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => s - 1);

  const handleSubmit = async () => {
    setServerError("");
    setLoading(true);
    try {
      const res = await axios.post("/api/v1/auth/register", {
        company: companyInfo,
        garage: garageDetails,
        business: businessReqs,
        owner: ownerInfo,
        admin: adminAccount,
      });
      const { companyId } = res.data;
      router.push(`/register/success?companyId=${companyId}`);
    } catch (err: any) {
      setServerError(
        err.response?.data?.error ?? "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

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
      <p className="text-xs text-blue-500 uppercase tracking-widest mb-1">
        {title}
      </p>
      {children}
    </div>
  );

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
          color3="#2563EB"
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
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                    i < step
                      ? "bg-blue-700/30 text-blue-400"
                      : i === step
                        ? "bg-blue-700 text-white"
                        : "bg-white/5 text-white/20"
                  }`}
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
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-px flex-1 transition-all duration-300 ${i < step ? "bg-blue-700/40" : "bg-white/5"}`}
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

        {step === 1 && (
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

        {/* ── step 2: business requirements ── */}
        {step === 2 && (
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

        {/* ── step 3: owner info ── */}
        {step === 3 && (
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

        {/* ── step 4: admin account ── */}
        {step === 4 && (
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

        {/* step 5: review */}
        {step === 5 && (
          <div className="flex flex-col gap-4 max-h-[45vh] overflow-y-auto pr-1 scrollbar-thin">
            <ReviewSection title="Company">
              <ReviewRow label="Garage Name" value={companyInfo.garageName} />
              <ReviewRow label="Address" value={companyInfo.address} />
              <ReviewRow label="Contact" value={companyInfo.contactNumber} />
              <ReviewRow label="Email" value={companyInfo.email} />
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

        <div className={`flex gap-3 ${step > 0 ? "flex-row" : "flex-col"}`}>
          {step > 0 && (
            <button
              onClick={handleBack}
              className="w-full py-3 rounded-full border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-colors text-sm font-light"
            >
              Back
            </button>
          )}
          {step < 5 ? (
            <Button text="Continue" onClick={handleNext} />
          ) : (
            <Button
              text={loading ? "Submitting…" : "Submit"}
              onClick={handleSubmit}
            />
          )}
        </div>

        <p className="text-center text-white/30 text-sm">
          Already registered?{" "}
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-500 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
