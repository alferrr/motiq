import Hero from "@/components/pages/Hero";
import { getSiteContent } from "@/lib/content-loader";

// ISR safety net — the /content editor also calls revalidatePath("/") on
// save, so edits show up immediately rather than waiting for this window.
export const revalidate = 60;

export default async function Home() {
  const content = await getSiteContent();
  return <Hero content={content} />;
}
