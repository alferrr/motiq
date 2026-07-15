"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useTheme } from "@/context/ThemeContext";
import { ALLOWED_IMAGES, SECTION_IDS, SiteContent } from "@/lib/content";

const TABS = [
  { id: "hero", label: "Hero" },
  { id: "platform", label: "Platform" },
  { id: "meet", label: "Meet Motiq" },
  { id: "howItWorks", label: "How It Works" },
  { id: "footer", label: "Footer" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// This is superadmin tooling shared across all tenants, not a company
// dashboard page — it must not pick up a tenant's ThemeContext.primaryColor
// (e.g. a company's branded accent color), so the accent is fixed here.
const ACCENT_COLOR = "#2563eb";

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

function LinkFieldHelp() {
  return (
    <p className="text-xs opacity-60 -mt-1">
      A link can be a path (<code>/register</code>), a full URL, or a section
      id to jump to on this page: {SECTION_IDS.map((id) => (
        <code key={id} className="mx-0.5">
          {id}
        </code>
      ))}
    </p>
  );
}

// Standalone device-width preview of the landing page, driven by postMessage
// to app/content/preview/page.tsx. An <iframe> (rather than a CSS transform
// on the real component) so Tailwind's sm:/md: classes respond to the
// preview's own viewport width, same as a real visitor would see.
function LivePreview({ content }: { content: SiteContent | null }) {
  const { dark } = useTheme();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const border = dark ? "border-white/5" : "border-gray-100";
  const muted = dark ? "text-gray-500" : "text-gray-400";

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === "site-content-preview-ready") setReady(true);
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (!ready || !content) return;
    iframeRef.current?.contentWindow?.postMessage(
      { type: "site-content-preview", content },
      window.location.origin,
    );
  }, [ready, content]);

  return (
    <div className="flex flex-col w-full h-full min-h-0 min-w-0">
      <div
        className={`flex items-center justify-between gap-2 px-4 py-2.5 border-b shrink-0 ${border}`}
      >
        <p className={`text-xs font-medium ${muted}`}>Live Preview</p>
        <div
          className={`flex items-center gap-0.5 p-0.5 rounded-full border ${dark ? "border-white/5 bg-white/3" : "border-gray-200 bg-gray-100"}`}
        >
          {(["desktop", "mobile"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              className="px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors"
              style={
                device === d
                  ? { backgroundColor: ACCENT_COLOR, color: "#fff" }
                  : { color: dark ? "#9ca3af" : "#6b7280" }
              }
            >
              {d}
            </button>
          ))}
        </div>
      </div>
      <div
        className={`flex-1 min-h-0 w-full overflow-auto flex ${device === "mobile" ? "justify-center py-4" : ""} ${dark ? "bg-black/40" : "bg-gray-200"}`}
      >
        <iframe
          ref={iframeRef}
          src="/content/preview"
          title="Landing page preview"
          className={
            device === "mobile"
              ? "w-[390px] h-full rounded-2xl border border-white/10 shrink-0"
              : "flex-1 h-full"
          }
        />
      </div>
    </div>
  );
}

export default function ContentPage() {
  const { dark } = useTheme();
  const router = useRouter();

  const rootBg = dark ? "bg-[#111318]" : "bg-white";
  const innerBg = dark ? "bg-[#0d0f13]" : "bg-[#f8f9fb]";
  const card = dark ? "bg-[#111318] border-white/5" : "bg-white border-gray-100";
  const subCard = dark ? "bg-white/3 border-white/5" : "bg-gray-50 border-gray-100";
  const text = dark ? "text-white" : "text-gray-900";
  const muted = dark ? "text-gray-500" : "text-gray-400";
  const border = dark ? "border-white/5" : "border-gray-100";
  const inputCls = `w-full rounded-xl border px-4 py-2.5 text-sm bg-transparent outline-none transition-colors
    ${dark ? "border-white/10 text-white placeholder:text-gray-600" : "border-gray-200 text-gray-900 placeholder:text-gray-400"}`;
  const textareaCls = `${inputCls} resize-y min-h-20`;

  const [activeTab, setActiveTab] = useState<TabId>("hero");
  const [mobilePane, setMobilePane] = useState<"edit" | "preview">("edit");
  const [content, setContent] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  useEffect(() => {
    axios
      .get("/api/v1/content")
      .then((res) => setContent(res.data.content))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // generic helpers — content sections are short-form marketing copy, so a
  // typed setter per field would be a lot of boilerplate for little benefit
  const updateSection = (section: TabId, patch: Record<string, any>) => {
    setContent((prev) =>
      prev ? { ...prev, [section]: { ...(prev as any)[section], ...patch } } : prev,
    );
  };

  const updateArrayItem = (
    section: TabId,
    arrayField: string,
    index: number,
    patch: Record<string, any>,
  ) => {
    setContent((prev) => {
      if (!prev) return prev;
      const sectionData: any = (prev as any)[section];
      const arr = [...sectionData[arrayField]];
      arr[index] = { ...arr[index], ...patch };
      return { ...prev, [section]: { ...sectionData, [arrayField]: arr } };
    });
  };

  const save = async (section: TabId) => {
    if (!content) return;
    setSaving(true);
    setMsg(null);
    try {
      await axios.patch("/api/v1/content", { [section]: (content as any)[section] });
      setMsg({ type: "ok", text: "Saved." });
    } catch (err: any) {
      setMsg({
        type: "err",
        text: err.response?.data?.error ?? "Failed to save.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post("/api/v1/auth/logout");
    } finally {
      router.push("/");
    }
  };

  const SaveButton = ({ section }: { section: TabId }) => (
    <div className="flex justify-end">
      <button
        onClick={() => save(section)}
        disabled={saving}
        className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity disabled:opacity-60"
        style={{ backgroundColor: ACCENT_COLOR }}
      >
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );

  const ImageSelect = ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <select
      className={inputCls}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {ALLOWED_IMAGES.map((img) => (
        <option key={img} value={img}>
          {img}
        </option>
      ))}
    </select>
  );

  return (
    <div
      suppressHydrationWarning
      className={`h-screen flex flex-col overflow-hidden ${rootBg} ${text}`}
    >
      <header
        className={`h-14 flex items-center justify-between px-6 border-b shrink-0 ${border}`}
      >
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold">Motiq — Site Content</p>
          <span className={`text-xs ${muted}`}>
            Edit the copy shown on the public landing page.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`lg:hidden flex items-center gap-0.5 p-0.5 rounded-full border mr-2 ${dark ? "border-white/5 bg-white/3" : "border-gray-200 bg-gray-100"}`}
          >
            {(["edit", "preview"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setMobilePane(p)}
                className="px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors"
                style={
                  mobilePane === p
                    ? { backgroundColor: ACCENT_COLOR, color: "#fff" }
                    : { color: dark ? "#9ca3af" : "#6b7280" }
                }
              >
                {p}
              </button>
            ))}
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${dark ? "border-white/10 text-gray-300 hover:text-white" : "border-gray-200 text-gray-600 hover:text-gray-900"}`}
          >
            View Live Site
          </a>
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
          >
            Log Out
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <main
          className={`w-full lg:w-[480px] xl:w-[560px] shrink-0 p-6 flex-col gap-5 overflow-y-auto min-h-0 [&>*]:shrink-0 border-r ${border} ${innerBg} ${
            mobilePane === "edit" ? "flex" : "hidden lg:flex"
          }`}
        >
          <div
            className={`flex items-center gap-1 border-b overflow-x-auto ${border}`}
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap"
                style={{
                  color:
                    activeTab === tab.id
                      ? ACCENT_COLOR
                      : dark
                        ? "#6b7280"
                        : "#9ca3af",
                }}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span
                    className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full"
                    style={{ backgroundColor: ACCENT_COLOR }}
                  />
                )}
              </button>
            ))}
          </div>

          <div className={`rounded-2xl border p-5 flex flex-col gap-4 ${card}`}>
            {loading || !content ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 w-full rounded-xl bg-white/5 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <>
                {msg && (
                  <p
                    className={`text-xs ${msg.type === "ok" ? "text-emerald-500" : "text-red-400"}`}
                  >
                    {msg.text}
                  </p>
                )}

                {activeTab === "hero" && (
                  <>
                    <Field label="Headline (use a new line for a line break)">
                      <textarea
                        className={textareaCls}
                        value={content.hero.headline}
                        onChange={(e) =>
                          updateSection("hero", { headline: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Subhead">
                      <textarea
                        className={textareaCls}
                        value={content.hero.subhead}
                        onChange={(e) =>
                          updateSection("hero", { subhead: e.target.value })
                        }
                      />
                    </Field>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-3">
                        <Field label="Primary CTA Label">
                          <input
                            className={inputCls}
                            value={content.hero.ctaPrimaryLabel}
                            onChange={(e) =>
                              updateSection("hero", {
                                ctaPrimaryLabel: e.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="Primary CTA Link">
                          <input
                            className={inputCls}
                            value={content.hero.ctaPrimaryHref}
                            onChange={(e) =>
                              updateSection("hero", {
                                ctaPrimaryHref: e.target.value,
                              })
                            }
                          />
                        </Field>
                      </div>
                      <div className="flex flex-col gap-3">
                        <Field label="Secondary CTA Label">
                          <input
                            className={inputCls}
                            value={content.hero.ctaSecondaryLabel}
                            onChange={(e) =>
                              updateSection("hero", {
                                ctaSecondaryLabel: e.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="Secondary CTA Link">
                          <input
                            className={inputCls}
                            value={content.hero.ctaSecondaryHref}
                            onChange={(e) =>
                              updateSection("hero", {
                                ctaSecondaryHref: e.target.value,
                              })
                            }
                          />
                        </Field>
                      </div>
                    </div>
                    <LinkFieldHelp />
                    <SaveButton section="hero" />
                  </>
                )}

                {activeTab === "platform" && (
                  <>
                    <Field label="Eyebrow">
                      <input
                        className={inputCls}
                        value={content.platform.eyebrow}
                        onChange={(e) =>
                          updateSection("platform", { eyebrow: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Heading (use a new line for a line break)">
                      <textarea
                        className={textareaCls}
                        value={content.platform.heading}
                        onChange={(e) =>
                          updateSection("platform", { heading: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Paragraph">
                      <textarea
                        className={textareaCls}
                        value={content.platform.paragraph}
                        onChange={(e) =>
                          updateSection("platform", {
                            paragraph: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <p className={`text-xs font-semibold mt-2 ${text}`}>
                      Feature Cards
                    </p>
                    {content.platform.features.map((feature, i) => (
                      <div
                        key={i}
                        className={`rounded-xl border p-4 flex flex-col gap-3 ${subCard}`}
                      >
                        <Field label="Title">
                          <input
                            className={inputCls}
                            value={feature.title}
                            onChange={(e) =>
                              updateArrayItem("platform", "features", i, {
                                title: e.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="Description">
                          <textarea
                            className={textareaCls}
                            value={feature.desc}
                            onChange={(e) =>
                              updateArrayItem("platform", "features", i, {
                                desc: e.target.value,
                              })
                            }
                          />
                        </Field>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Field label="Image">
                            <ImageSelect
                              value={feature.image}
                              onChange={(v) =>
                                updateArrayItem("platform", "features", i, {
                                  image: v,
                                })
                              }
                            />
                          </Field>
                          <Field label="Card Width">
                            <select
                              className={inputCls}
                              value={feature.span}
                              onChange={(e) =>
                                updateArrayItem("platform", "features", i, {
                                  span: e.target.value,
                                })
                              }
                            >
                              <option value="wide">Wide</option>
                              <option value="narrow">Narrow</option>
                            </select>
                          </Field>
                        </div>
                      </div>
                    ))}
                    <SaveButton section="platform" />
                  </>
                )}

                {activeTab === "meet" && (
                  <>
                    <Field label="Eyebrow">
                      <input
                        className={inputCls}
                        value={content.meet.eyebrow}
                        onChange={(e) =>
                          updateSection("meet", { eyebrow: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Heading (use a new line for a line break)">
                      <textarea
                        className={textareaCls}
                        value={content.meet.heading}
                        onChange={(e) =>
                          updateSection("meet", { heading: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Paragraph">
                      <textarea
                        className={textareaCls}
                        value={content.meet.paragraph}
                        onChange={(e) =>
                          updateSection("meet", { paragraph: e.target.value })
                        }
                      />
                    </Field>
                    <p className={`text-xs font-semibold mt-2 ${text}`}>Stats</p>
                    {content.meet.stats.map((stat, i) => (
                      <div
                        key={i}
                        className={`rounded-xl border p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 ${subCard}`}
                      >
                        <Field label="Value">
                          <input
                            type="number"
                            className={inputCls}
                            value={stat.value}
                            onChange={(e) =>
                              updateArrayItem("meet", "stats", i, {
                                value: Number(e.target.value),
                              })
                            }
                          />
                        </Field>
                        <Field label="Suffix">
                          <input
                            className={inputCls}
                            value={stat.suffix}
                            onChange={(e) =>
                              updateArrayItem("meet", "stats", i, {
                                suffix: e.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="Label">
                          <input
                            className={inputCls}
                            value={stat.label}
                            onChange={(e) =>
                              updateArrayItem("meet", "stats", i, {
                                label: e.target.value,
                              })
                            }
                          />
                        </Field>
                      </div>
                    ))}
                    <SaveButton section="meet" />
                  </>
                )}

                {activeTab === "howItWorks" && (
                  <>
                    <Field label="Eyebrow">
                      <input
                        className={inputCls}
                        value={content.howItWorks.eyebrow}
                        onChange={(e) =>
                          updateSection("howItWorks", {
                            eyebrow: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Heading (use a new line for a line break)">
                      <textarea
                        className={textareaCls}
                        value={content.howItWorks.heading}
                        onChange={(e) =>
                          updateSection("howItWorks", {
                            heading: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Paragraph">
                      <textarea
                        className={textareaCls}
                        value={content.howItWorks.paragraph}
                        onChange={(e) =>
                          updateSection("howItWorks", {
                            paragraph: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <p className={`text-xs font-semibold mt-2 ${text}`}>Steps</p>
                    {content.howItWorks.steps.map((step, i) => (
                      <div
                        key={i}
                        className={`rounded-xl border p-4 flex flex-col gap-3 ${subCard}`}
                      >
                        <Field label="Title">
                          <input
                            className={inputCls}
                            value={step.title}
                            onChange={(e) =>
                              updateArrayItem("howItWorks", "steps", i, {
                                title: e.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="Description">
                          <textarea
                            className={textareaCls}
                            value={step.desc}
                            onChange={(e) =>
                              updateArrayItem("howItWorks", "steps", i, {
                                desc: e.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="Image">
                          <ImageSelect
                            value={step.image}
                            onChange={(v) =>
                              updateArrayItem("howItWorks", "steps", i, {
                                image: v,
                              })
                            }
                          />
                        </Field>
                      </div>
                    ))}
                    <SaveButton section="howItWorks" />
                  </>
                )}

                {activeTab === "footer" && (
                  <>
                    <Field label="Headline">
                      <textarea
                        className={textareaCls}
                        value={content.footer.headline}
                        onChange={(e) =>
                          updateSection("footer", { headline: e.target.value })
                        }
                      />
                    </Field>
                    <Field label="Paragraph">
                      <textarea
                        className={textareaCls}
                        value={content.footer.paragraph}
                        onChange={(e) =>
                          updateSection("footer", { paragraph: e.target.value })
                        }
                      />
                    </Field>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-3">
                        <Field label="Primary CTA Label">
                          <input
                            className={inputCls}
                            value={content.footer.ctaPrimaryLabel}
                            onChange={(e) =>
                              updateSection("footer", {
                                ctaPrimaryLabel: e.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="Primary CTA Link">
                          <input
                            className={inputCls}
                            value={content.footer.ctaPrimaryHref}
                            onChange={(e) =>
                              updateSection("footer", {
                                ctaPrimaryHref: e.target.value,
                              })
                            }
                          />
                        </Field>
                      </div>
                      <div className="flex flex-col gap-3">
                        <Field label="Secondary CTA Label">
                          <input
                            className={inputCls}
                            value={content.footer.ctaSecondaryLabel}
                            onChange={(e) =>
                              updateSection("footer", {
                                ctaSecondaryLabel: e.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="Secondary CTA Link">
                          <input
                            className={inputCls}
                            value={content.footer.ctaSecondaryHref}
                            onChange={(e) =>
                              updateSection("footer", {
                                ctaSecondaryHref: e.target.value,
                              })
                            }
                          />
                        </Field>
                      </div>
                    </div>
                    <LinkFieldHelp />
                    <SaveButton section="footer" />
                  </>
                )}
              </>
            )}
          </div>
        </main>

        <div
          className={`flex-1 min-h-0 ${mobilePane === "preview" ? "flex" : "hidden lg:flex"}`}
        >
          <LivePreview content={content} />
        </div>
      </div>
    </div>
  );
}
