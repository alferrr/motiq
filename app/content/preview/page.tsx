"use client";

import { useEffect, useState } from "react";
import Hero from "@/components/pages/Hero";
import { DEFAULT_SITE_CONTENT, type SiteContent } from "@/lib/content";

// Renders the real landing page, driven entirely by postMessage from the
// /content editor (no DB fetch) so unsaved edits can be previewed live.
// Loaded in an <iframe> rather than scaled with CSS so Tailwind's responsive
// (sm:/md:) classes respond to the iframe's own viewport width, matching
// what visitors would actually see at that width.
export default function ContentPreviewPage() {
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "site-content-preview") return;
      setContent(event.data.content);
    };
    window.addEventListener("message", handleMessage);

    // tell the parent editor we're ready to receive content
    window.parent.postMessage({ type: "site-content-preview-ready" }, window.location.origin);

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return <Hero content={content} />;
}
