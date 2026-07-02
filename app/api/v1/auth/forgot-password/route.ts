import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { sendEmail } from "@/lib/email";
import { passwordResetEmail } from "@/lib/emailTemplates";

const BodySchema = z.object({
  companyId: z.string().min(1, "Company ID is required"),
  email: z.string().email("Invalid email address"),
});

const GENERIC_MESSAGE =
  "If an account exists for that email, we've sent a password reset link.";

export async function POST(request: NextRequest) {
  try {
    const { companyId, email } = BodySchema.parse(await request.json());

    const [[user]]: any = await pool.query(
      `SELECT u.User_ID, u.FullName, u.Email, co.Name AS companyName, co.ThemeColor,
              co.Email AS companyEmail, co.ContactNumber AS companyContact, co.Address AS companyAddress
       FROM User u
       JOIN Company co ON co.Company_ID = u.Company_ID
       WHERE u.Email = ? AND u.Company_ID = ?
       LIMIT 1`,
      [email, companyId],
    );

    // Always respond the same way whether or not the account exists, so
    // this endpoint can't be used to enumerate registered emails.
    if (user) {
      const token = jwt.sign(
        { purpose: "password_reset", userId: user.User_ID, companyId },
        process.env.JWT_SECRET!,
        { expiresIn: "30m" },
      );
      const resetUrl = new URL(
        `/reset-password?token=${token}`,
        request.nextUrl.origin,
      ).toString();

      const { subject, html } = passwordResetEmail({
        companyName: user.companyName,
        themeColor: user.ThemeColor,
        companyEmail: user.companyEmail,
        companyContact: user.companyContact,
        companyAddress: user.companyAddress,
        userName: user.FullName,
        resetUrl,
      });
      await sendEmail({ to: user.Email, subject, html });
    }

    return NextResponse.json({ message: GENERIC_MESSAGE });
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
