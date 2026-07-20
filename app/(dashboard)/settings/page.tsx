"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import axios from "axios";
import PageHeader from "@/components/shared/PageHeader";
import { FaMoon, FaSun, FaCheck, FaLink, FaCheckCircle, FaDownload } from "react-icons/fa";

type Company = {
  Name: string;
  Email: string;
  ContactNumber: string;
  Address: string;
  GarageType: string | null;
  NumberOfBays: number | null;
  OpeningTime: string | null;
  ClosingTime: string | null;
};

type Me = {
  FullName: string;
  Username: string;
  Email: string;
  Role: string;
};

type KasaStatus = {
  connected: boolean;
  merchantSlug: string | null;
  merchantName: string | null;
  environment: "live" | "sandbox" | null;
  connectedAt: string | null;
  maskedKey: string | null;
};

const ACCENT_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#0891b2",
  "#059669",
  "#d97706",
  "#dc2626",
  "#db2777",
];

const TABS = [
  { id: "appearance", label: "Appearance" },
  { id: "company", label: "Company Profile" },
  { id: "kasa", label: "Kasa Payments" },
  { id: "export", label: "Export Data" },
  { id: "account", label: "Your Account" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-inherit opacity-70">{label}</p>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { dark, toggleTheme, primaryColor, setPrimaryColor, setCompanyName, userRole } =
    useTheme();
  const isAdmin = userRole === "Admin";

  const [activeTab, setActiveTab] = useState<TabId>("appearance");
  const visibleTabs = TABS.filter(
    (t) => (t.id !== "kasa" && t.id !== "export") || isAdmin,
  );

  const innerBg = dark ? "bg-[#0d0f13]" : "bg-[#f8f9fb]";
  const card = dark ? "bg-[#111318] border-white/5" : "bg-white border-gray-100";
  const text = dark ? "text-white" : "text-gray-900";
  const muted = dark ? "text-gray-500" : "text-gray-400";
  const border = dark ? "border-white/5" : "border-gray-100";
  const inputCls = `w-full rounded-xl border px-4 py-2.5 text-sm bg-transparent outline-none transition-colors
    ${dark ? "border-white/10 text-white placeholder:text-gray-600" : "border-gray-200 text-gray-900 placeholder:text-gray-400"}`;

  const [company, setCompany] = useState<Company | null>(null);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [companySaving, setCompanySaving] = useState(false);
  const [companyMsg, setCompanyMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [me, setMe] = useState<Me | null>(null);
  const [meLoading, setMeLoading] = useState(true);
  const [meSaving, setMeSaving] = useState(false);
  const [meMsg, setMeMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [kasaStatus, setKasaStatus] = useState<KasaStatus | null>(null);
  const [kasaLoading, setKasaLoading] = useState(true);
  const [kasaBusy, setKasaBusy] = useState(false);
  const [kasaMsg, setKasaMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const fetchKasaStatus = async (): Promise<KasaStatus | null> => {
    try {
      const res = await axios.get("/api/v1/company/kasa");
      setKasaStatus(res.data);
      return res.data;
    } catch {
      return null;
    } finally {
      setKasaLoading(false);
    }
  };

  const kasaPollRef = useRef<number | null>(null);
  const clearKasaPoll = () => {
    if (kasaPollRef.current !== null) {
      window.clearInterval(kasaPollRef.current);
      kasaPollRef.current = null;
    }
  };

  const signInWithKasa = () => {
    setKasaMsg(null);
    // Kasa's consent card alone is ~570px tall; window.open's height budget
    // also has to cover the browser's own popup chrome (title bar, etc.),
    // so a tight value here can clip the Authorize button below the fold
    // with no obvious scrollbar — comfortably overshoot instead.
    const width = 520;
    const height = 900;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      "/api/v1/company/kasa/oauth/start",
      "kasa-oauth",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`,
    );
    if (!popup) {
      setKasaMsg({
        type: "err",
        text: "Please allow popups for this site to sign in with Kasa.",
      });
      return;
    }
    setKasaBusy(true);
    // rather than have the popup's closing page postMessage the result back
    // (window.opener isn't reliably preserved across the cross-origin round
    // trip through Kasa's own domain and back), just poll for the popup
    // closing and re-check the real connection status from the server —
    // works whether the admin finished, cancelled, or just closed it
    kasaPollRef.current = window.setInterval(() => {
      if (popup.closed) {
        clearKasaPoll();
        setKasaBusy(false);
        fetchKasaStatus().then((status) => {
          if (status?.connected) {
            setKasaMsg({ type: "ok", text: "Kasa account connected." });
            return;
          }
          // the popup's own error message can close before it's readable,
          // so the callback route also leaves the specific reason here
          const match = document.cookie.match(/(?:^|; )kasa_oauth_error=([^;]*)/);
          const reason = match ? decodeURIComponent(match[1]) : null;
          document.cookie = "kasa_oauth_error=; Max-Age=0; path=/";
          setKasaMsg({
            type: "err",
            text: reason
              ? `Kasa sign-in failed: ${reason}`
              : "Kasa sign-in was not completed.",
          });
        });
      }
    }, 500);
  };

  const disconnectKasa = async () => {
    setKasaBusy(true);
    setKasaMsg(null);
    try {
      await axios.delete("/api/v1/company/kasa");
      setKasaMsg({ type: "ok", text: "Kasa account disconnected." });
      await fetchKasaStatus();
    } catch (err: any) {
      setKasaMsg({
        type: "err",
        text: err.response?.data?.error ?? "Failed to disconnect Kasa account.",
      });
    } finally {
      setKasaBusy(false);
    }
  };

  const [exportBusy, setExportBusy] = useState(false);
  const [exportMsg, setExportMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const exportData = async () => {
    setExportBusy(true);
    setExportMsg(null);
    try {
      const res = await axios.get("/api/v1/company/export", {
        responseType: "blob",
      });
      const disposition = res.headers["content-disposition"] as string | undefined;
      const match = disposition?.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "motiq-export.zip";

      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      setExportMsg({ type: "ok", text: "Export downloaded." });
    } catch (err: any) {
      setExportMsg({
        type: "err",
        text: err.response?.data?.error ?? "Failed to export data.",
      });
    } finally {
      setExportBusy(false);
    }
  };

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    axios
      .get("/api/v1/company")
      .then((res) => setCompany(res.data.company))
      .catch(() => {})
      .finally(() => setCompanyLoading(false));

    axios
      .get("/api/v1/users/me")
      .then((res) => setMe(res.data.user))
      .catch(() => {})
      .finally(() => setMeLoading(false));

    if (isAdmin) fetchKasaStatus();
    else setKasaLoading(false);
  }, [isAdmin]);

  const saveCompany = async () => {
    if (!company) return;
    setCompanySaving(true);
    setCompanyMsg(null);
    try {
      await axios.patch("/api/v1/company", {
        name: company.Name,
        email: company.Email,
        contactNumber: company.ContactNumber,
        address: company.Address,
        garageType: company.GarageType ?? undefined,
        numberOfBays: company.NumberOfBays ?? undefined,
        openingTime: company.OpeningTime ?? undefined,
        closingTime: company.ClosingTime ?? undefined,
      });
      setCompanyName(company.Name);
      setCompanyMsg({ type: "ok", text: "Company profile saved." });
    } catch (err: any) {
      setCompanyMsg({
        type: "err",
        text: err.response?.data?.error ?? "Failed to save company profile.",
      });
    } finally {
      setCompanySaving(false);
    }
  };

  const saveMe = async () => {
    if (!me) return;
    setMeSaving(true);
    setMeMsg(null);
    try {
      await axios.patch("/api/v1/users/me", {
        fullName: me.FullName,
        email: me.Email,
      });
      setMeMsg({ type: "ok", text: "Profile saved." });
    } catch (err: any) {
      setMeMsg({
        type: "err",
        text: err.response?.data?.error ?? "Failed to save profile.",
      });
    } finally {
      setMeSaving(false);
    }
  };

  const savePassword = async () => {
    setPasswordMsg(null);
    if (!currentPassword || !newPassword) {
      setPasswordMsg({ type: "err", text: "Fill in both password fields." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "err", text: "New passwords do not match." });
      return;
    }
    setPasswordSaving(true);
    try {
      await axios.patch("/api/v1/users/me", {
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg({ type: "ok", text: "Password updated." });
    } catch (err: any) {
      setPasswordMsg({
        type: "err",
        text: err.response?.data?.error ?? "Failed to update password.",
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div
      suppressHydrationWarning
      className={`flex-1 flex flex-col min-h-0 ${innerBg} ${text}`}
    >
      <PageHeader title="Settings" />

      <main className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto min-h-0 [&>*]:shrink-0">
        <div>
          <h1 className={`text-lg font-semibold ${text}`}>Settings</h1>
          <p className={`text-sm mt-0.5 ${muted}`}>
            Manage your garage profile, account, and appearance preferences.
          </p>
        </div>

        <div className={`flex items-center gap-1 border-b overflow-x-auto ${border}`}>
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap"
              style={{
                color:
                  activeTab === tab.id
                    ? primaryColor
                    : dark
                      ? "#6b7280"
                      : "#9ca3af",
              }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span
                  className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                />
              )}
            </button>
          ))}
        </div>

        <div className={`rounded-2xl border p-5 flex flex-col gap-4 ${card}`}>
          {activeTab === "appearance" && (
            <>
              <Field label="Theme">
                <div
                  className={`flex items-center gap-0.5 p-0.5 rounded-full border w-fit ${dark ? "border-white/5 bg-white/3" : "border-gray-200 bg-gray-100"}`}
                >
                  <button
                    onClick={() => dark && toggleTheme()}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-colors"
                    style={
                      !dark
                        ? { backgroundColor: "#fff", color: "#111" }
                        : { color: "#6b7280" }
                    }
                  >
                    <FaSun size={11} /> Light
                  </button>
                  <button
                    onClick={() => !dark && toggleTheme()}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-colors"
                    style={
                      dark
                        ? { backgroundColor: "#fff", color: "#111" }
                        : { color: "#9ca3af" }
                    }
                  >
                    <FaMoon size={11} /> Dark
                  </button>
                </div>
              </Field>

              <Field label="Accent color">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setPrimaryColor(c)}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-105"
                      style={{ backgroundColor: c }}
                    >
                      {primaryColor.toLowerCase() === c && (
                        <FaCheck size={11} className="text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </Field>
            </>
          )}

          {activeTab === "company" &&
            (companyLoading || !company ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 w-full rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                <p className={`text-xs ${muted}`}>
                  Shown across your dashboard and on customer-facing pages.
                </p>
                {companyMsg && (
                  <p className={`text-xs ${companyMsg.type === "ok" ? "text-emerald-500" : "text-red-400"}`}>
                    {companyMsg.text}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Garage Name">
                    <input
                      className={inputCls}
                      value={company.Name}
                      onChange={(e) => setCompany({ ...company, Name: e.target.value })}
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      className={inputCls}
                      value={company.Email}
                      onChange={(e) => setCompany({ ...company, Email: e.target.value })}
                    />
                  </Field>
                  <Field label="Contact Number">
                    <input
                      className={inputCls}
                      value={company.ContactNumber}
                      onChange={(e) => setCompany({ ...company, ContactNumber: e.target.value })}
                    />
                  </Field>
                  <Field label="Garage Type">
                    <input
                      className={inputCls}
                      value={company.GarageType ?? ""}
                      onChange={(e) => setCompany({ ...company, GarageType: e.target.value })}
                    />
                  </Field>
                  <Field label="Opening Time">
                    <input
                      type="time"
                      className={inputCls}
                      value={company.OpeningTime ?? ""}
                      onChange={(e) => setCompany({ ...company, OpeningTime: e.target.value })}
                    />
                  </Field>
                  <Field label="Closing Time">
                    <input
                      type="time"
                      className={inputCls}
                      value={company.ClosingTime ?? ""}
                      onChange={(e) => setCompany({ ...company, ClosingTime: e.target.value })}
                    />
                  </Field>
                </div>
                <Field label="Address">
                  <input
                    className={inputCls}
                    value={company.Address}
                    onChange={(e) => setCompany({ ...company, Address: e.target.value })}
                  />
                </Field>
                <div className="flex justify-end">
                  <button
                    onClick={saveCompany}
                    disabled={companySaving}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity disabled:opacity-60"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {companySaving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </>
            ))}

          {activeTab === "kasa" && isAdmin && (
            kasaLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 w-full rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                <p className={`text-xs ${muted}`}>
                  Link your garage&apos;s own Kasa account so customer payments
                  and refunds go directly to you, instead of a shared account.
                </p>
                {kasaMsg && (
                  <p className={`text-xs ${kasaMsg.type === "ok" ? "text-emerald-500" : "text-red-400"}`}>
                    {kasaMsg.text}
                  </p>
                )}

                {kasaStatus?.connected ? (
                  <>
                    <div
                      className={`flex items-center gap-3 rounded-xl p-4 ${dark ? "bg-white/3" : "bg-gray-50"}`}
                    >
                      <FaCheckCircle size={18} className="text-emerald-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${text}`}>
                          {kasaStatus.merchantName}
                          <span
                            className={`ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full uppercase ${
                              kasaStatus.environment === "live"
                                ? "bg-emerald-500/15 text-emerald-500"
                                : "bg-amber-500/15 text-amber-500"
                            }`}
                          >
                            {kasaStatus.environment}
                          </span>
                        </p>
                        <p className={`text-xs mt-0.5 font-mono ${muted}`}>
                          {kasaStatus.maskedKey}
                        </p>
                        {kasaStatus.connectedAt && (
                          <p className={`text-[10px] mt-1 ${muted}`}>
                            Connected{" "}
                            {new Date(kasaStatus.connectedAt).toLocaleDateString("en-PH", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={disconnectKasa}
                        disabled={kasaBusy}
                        className={`px-5 py-2.5 rounded-xl border text-sm font-medium transition-colors disabled:opacity-60 ${dark ? "border-red-900/50 text-red-400 hover:bg-red-900/20" : "border-red-200 text-red-500 hover:bg-red-50"}`}
                      >
                        {kasaBusy ? "Disconnecting…" : "Disconnect Kasa"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className={`text-[11px] ${muted}`}>
                      A Kasa sign-in window will open where you approve
                      access — your Kasa password and secret key are never
                      entered into Motiq.
                    </p>
                    <div className="flex justify-end">
                      <button
                        onClick={signInWithKasa}
                        disabled={kasaBusy}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <FaLink size={11} />
                        {kasaBusy ? "Waiting for Kasa…" : "Sign in with Kasa"}
                      </button>
                    </div>
                  </>
                )}
              </>
            )
          )}

          {activeTab === "export" && isAdmin && (
            <>
              <p className={`text-xs ${muted}`}>
                Download every record your garage owns — customers, vehicles,
                job orders, invoices, payments, appointments, and staff — as
                plain CSV files in a single ZIP. Opens directly in Excel or
                Google Sheets, so your data is never locked in.
              </p>
              {exportMsg && (
                <p className={`text-xs ${exportMsg.type === "ok" ? "text-emerald-500" : "text-red-400"}`}>
                  {exportMsg.text}
                </p>
              )}
              <div className="flex justify-end">
                <button
                  onClick={exportData}
                  disabled={exportBusy}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: primaryColor }}
                >
                  <FaDownload size={11} />
                  {exportBusy ? "Preparing export…" : "Export Data"}
                </button>
              </div>
            </>
          )}

          {activeTab === "account" &&
            (meLoading || !me ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 w-full rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                {meMsg && (
                  <p className={`text-xs ${meMsg.type === "ok" ? "text-emerald-500" : "text-red-400"}`}>
                    {meMsg.text}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Field label="Full Name">
                    <input
                      className={inputCls}
                      value={me.FullName}
                      onChange={(e) => setMe({ ...me, FullName: e.target.value })}
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      className={inputCls}
                      value={me.Email}
                      onChange={(e) => setMe({ ...me, Email: e.target.value })}
                    />
                  </Field>
                  <Field label="Username">
                    <input className={`${inputCls} opacity-60`} value={me.Username} disabled />
                  </Field>
                  <Field label="Role">
                    <input className={`${inputCls} opacity-60`} value={me.Role} disabled />
                  </Field>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={saveMe}
                    disabled={meSaving}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity disabled:opacity-60"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {meSaving ? "Saving…" : "Save Changes"}
                  </button>
                </div>

                <div className={`border-t pt-4 flex flex-col gap-4 ${border}`}>
                  <p className={`text-xs font-semibold ${text}`}>Change Password</p>
                  {passwordMsg && (
                    <p className={`text-xs ${passwordMsg.type === "ok" ? "text-emerald-500" : "text-red-400"}`}>
                      {passwordMsg.text}
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Field label="Current Password">
                      <input
                        type="password"
                        className={inputCls}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </Field>
                    <Field label="New Password">
                      <input
                        type="password"
                        className={inputCls}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </Field>
                    <Field label="Confirm New Password">
                      <input
                        type="password"
                        className={inputCls}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </Field>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={savePassword}
                      disabled={passwordSaving}
                      className={`px-5 py-2.5 rounded-xl border text-sm font-medium transition-colors disabled:opacity-60 ${dark ? "border-white/10 text-gray-300 hover:text-white" : "border-gray-200 text-gray-600 hover:text-gray-900"}`}
                    >
                      {passwordSaving ? "Updating…" : "Update Password"}
                    </button>
                  </div>
                </div>
              </>
            ))}
        </div>
      </main>
    </div>
  );
}
