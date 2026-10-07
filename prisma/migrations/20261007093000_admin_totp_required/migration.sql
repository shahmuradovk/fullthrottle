-- No-op on purpose: 20261007092803_admin_totp_required already adds this
-- column. Kept (idempotent) because a deploy may have recorded it as failed.
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "totpRequired" BOOLEAN NOT NULL DEFAULT true;
