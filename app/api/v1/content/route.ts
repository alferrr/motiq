import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";
import { z } from "zod";
import { ALLOWED_IMAGES, CONTENT_KEY_MAP } from "@/lib/content";
import { getSiteContent } from "@/lib/content-loader";

const ImagePath = z.enum(ALLOWED_IMAGES);

const HeroSchema = z.object({
  headline: z.string().min(1),
  subhead: z.string().min(1),
  ctaPrimaryLabel: z.string().min(1),
  ctaPrimaryHref: z.string().min(1),
  ctaSecondaryLabel: z.string().min(1),
  ctaSecondaryHref: z.string().min(1),
});

const PlatformSchema = z.object({
  eyebrow: z.string().min(1),
  heading: z.string().min(1),
  paragraph: z.string().min(1),
  features: z
    .array(
      z.object({
        title: z.string().min(1),
        desc: z.string().min(1),
        image: ImagePath,
        span: z.enum(["wide", "narrow"]),
      }),
    )
    .length(4),
});

const MeetSchema = z.object({
  eyebrow: z.string().min(1),
  heading: z.string().min(1),
  paragraph: z.string().min(1),
  stats: z
    .array(
      z.object({
        value: z.coerce.number(),
        suffix: z.string().min(1),
        label: z.string().min(1),
      }),
    )
    .length(4),
});

const HowItWorksSchema = z.object({
  eyebrow: z.string().min(1),
  heading: z.string().min(1),
  paragraph: z.string().min(1),
  steps: z
    .array(
      z.object({
        title: z.string().min(1),
        desc: z.string().min(1),
        image: ImagePath,
      }),
    )
    .length(3),
});

const FooterSchema = z.object({
  headline: z.string().min(1),
  paragraph: z.string().min(1),
  ctaPrimaryLabel: z.string().min(1),
  ctaPrimaryHref: z.string().min(1),
  ctaSecondaryLabel: z.string().min(1),
  ctaSecondaryHref: z.string().min(1),
});

const UpdateSchema = z.object({
  hero: HeroSchema.optional(),
  platform: PlatformSchema.optional(),
  meet: MeetSchema.optional(),
  howItWorks: HowItWorksSchema.optional(),
  footer: FooterSchema.optional(),
});

// proxy.ts already blocks non-owner access to this path; the email re-check
// here is defense-in-depth, matching how other routes re-check role inline.
function isOwner(email: string | undefined) {
  return !!email && email === process.env.OWNER_EMAIL;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getSession(request);
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isOwner(auth.email))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const content = await getSiteContent();
    return NextResponse.json({ content });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getSession(request);
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isOwner(auth.email))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = UpdateSchema.parse(await request.json());
    const entries = Object.entries(body).filter(
      ([, v]) => v !== undefined,
    ) as [keyof typeof CONTENT_KEY_MAP, object][];
    if (!entries.length)
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );

    for (const [section, value] of entries) {
      await pool.query(
        `INSERT INTO SiteContent (ContentKey, ContentValue, UpdatedBy)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE ContentValue = VALUES(ContentValue), UpdatedBy = VALUES(UpdatedBy)`,
        [CONTENT_KEY_MAP[section], JSON.stringify(value), auth.email],
      );
    }

    revalidatePath("/");

    return NextResponse.json({ message: "Content updated" });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json(
        { error: err.issues[0].message },
        { status: 400 },
      );
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
