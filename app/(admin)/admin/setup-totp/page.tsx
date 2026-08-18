import { redirect } from "next/navigation";
import { generateURI } from "otplib";
import { toDataURL } from "qrcode";
import { readAdminSession } from "@/lib/admin/session";
import { ensureTotpSecret } from "@/lib/admin/auth-actions";
import { ConfirmTotpForm } from "./confirm-form";

export const dynamic = "force-dynamic";

export default async function SetupTotpPage() {
  const session = await readAdminSession();
  if (!session) redirect("/admin/sign-in");

  const secret = await ensureTotpSecret(session.adminId);
  const uri = generateURI({
    issuer: "Fullthrottle Admin",
    label: session.email,
    secret,
  });
  const qr = await toDataURL(uri, { margin: 1, width: 220 });

  return (
    <div className="flex w-[440px] max-w-full flex-col gap-4 rounded-1 border border-line bg-surface p-8">
      <div>
        <h1 className="font-display text-[28px] font-bold text-ink">SET UP TWO-FACTOR</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">
          Two-factor is mandatory for admin accounts. Scan the code with any
          authenticator app (Google Authenticator, 1Password, Authy), then confirm
          with the 6-digit code it shows.
        </p>
      </div>
      <div className="flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qr}
          alt="TOTP enrollment QR code"
          className="size-[140px] rounded-1 border border-line bg-ink p-1"
        />
        <div className="min-w-0">
          <p className="type-label text-ink-secondary">Manual entry key</p>
          <p className="mt-1 break-all font-mono text-xs text-ink">{secret}</p>
        </div>
      </div>
      <ConfirmTotpForm />
    </div>
  );
}
