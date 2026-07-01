"use client";

import { useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import PageHeader from "@/components/shared/PageHeader";
import {
  FaEnvelope,
  FaBook,
  FaComments,
  FaChevronDown,
} from "react-icons/fa";

const FAQS = [
  {
    q: "How do I create an invoice for a job order?",
    a: "Go to Invoices → Create Invoice, then pick a job order that's marked Completed or Released. Motiq computes the total automatically from the services and parts already logged on that job — you don't need to enter amounts by hand.",
  },
  {
    q: "How does online payment work?",
    a: "Open an invoice and click Generate Kasa Payment Link, then share the link with your customer. Once they pay via GCash, Maya, QR Ph, Bank Transfer, or card, it shows up on the Payments page. If a payment is still awaiting confirmation, use Refresh Status to pull the latest state.",
  },
  {
    q: "Can I record a cash or card payment manually?",
    a: "Yes — open the invoice and click Record Manual Payment. This is for payments collected in person and marks the invoice paid immediately, no online gateway involved.",
  },
  {
    q: "How do I add services and parts to a job order?",
    a: "Open a job order and click Update Status. From there you can check off services from your catalog and add parts with quantities — the total updates live, and stock is deducted automatically.",
  },
  {
    q: "Why does a part show up as low stock?",
    a: "A part is flagged as low stock once its quantity on hand drops to or below the minimum stock level you set for it in Inventory. You can adjust both numbers from the part's detail view.",
  },
  {
    q: "Who can access Reports, Users, and Settings?",
    a: "Reports is available to Admins and Front Desk staff. Users and Settings are Admin-only. Mechanics see a focused view of their own assigned jobs.",
  },
  {
    q: "How do refunds work?",
    a: "On the Payments page, a succeeded online payment shows a Refund action. You can refund the full amount or a partial amount — the invoice balance updates automatically once the refund goes through.",
  },
];

const TABS = [
  { id: "faq", label: "FAQ" },
  { id: "contact", label: "Contact Us" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function AccordionItem({
  q,
  a,
  open,
  onToggle,
  text,
  muted,
  border,
  primary,
}: {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
  text: string;
  muted: string;
  border: string;
  primary: string;
}) {
  return (
    <div className={`border-b last:border-b-0 ${border}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <p className={`text-sm font-medium ${text}`}>{q}</p>
        <FaChevronDown
          size={11}
          className="shrink-0 transition-transform duration-200"
          style={{
            color: open ? primary : undefined,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-200"
        style={{ maxHeight: open ? "200px" : "0px" }}
      >
        <p className={`text-sm px-5 pb-4 leading-relaxed ${muted}`}>{a}</p>
      </div>
    </div>
  );
}

export default function HelpPage() {
  const { dark, primaryColor } = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>("faq");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const innerBg = dark ? "bg-[#0d0f13]" : "bg-[#f8f9fb]";
  const card = dark ? "bg-[#111318] border-white/5" : "bg-white border-gray-100";
  const text = dark ? "text-white" : "text-gray-900";
  const muted = dark ? "text-gray-500" : "text-gray-400";
  const border = dark ? "border-white/5" : "border-gray-100";

  const contactCards = [
    {
      icon: FaEnvelope,
      title: "Email Support",
      desc: "Reach the Motiq team for account or billing questions.",
      action: "support@motiq.app",
      href: "mailto:support@motiq.app",
    },
    {
      icon: FaBook,
      title: "Documentation",
      desc: "Guides on invoices, job orders, and inventory.",
      action: "View docs",
      href: "#",
    },
    {
      icon: FaComments,
      title: "Talk to Us",
      desc: "Have feedback or a feature request? Let us know.",
      action: "Send feedback",
      href: "mailto:support@motiq.app?subject=Motiq%20Feedback",
    },
  ];

  return (
    <div
      suppressHydrationWarning
      className={`flex-1 flex flex-col min-h-0 ${innerBg} ${text}`}
    >
      <PageHeader title="Help & Support" />

      <main className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto min-h-0 [&>*]:shrink-0">
        <div>
          <h1 className={`text-lg font-semibold ${text}`}>Help & Support</h1>
          <p className={`text-sm mt-0.5 ${muted}`}>
            Answers to common questions, plus ways to reach us.
          </p>
        </div>

        <div className={`flex items-center gap-1 border-b overflow-x-auto ${border}`}>
          {TABS.map((tab) => (
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

        {activeTab === "faq" && (
          <div className={`rounded-2xl border overflow-hidden ${card}`}>
            {FAQS.map((f, i) => (
              <AccordionItem
                key={f.q}
                q={f.q}
                a={f.a}
                open={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
                text={text}
                muted={muted}
                border={border}
                primary={primaryColor}
              />
            ))}
          </div>
        )}

        {activeTab === "contact" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {contactCards.map((c) => (
              <a
                key={c.title}
                href={c.href}
                className={`rounded-2xl border p-5 flex flex-col gap-3 transition-colors ${card} ${dark ? "hover:bg-white/3" : "hover:bg-gray-50"}`}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: primaryColor + "20", color: primaryColor }}
                >
                  <c.icon size={14} />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${text}`}>{c.title}</p>
                  <p className={`text-xs mt-1 ${muted}`}>{c.desc}</p>
                </div>
                <p className="text-xs font-medium mt-auto" style={{ color: primaryColor }}>
                  {c.action} →
                </p>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
