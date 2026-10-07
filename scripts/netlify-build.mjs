// Netlify build entry: resolve the database URL (Netlify DB injects
// NETLIFY_DATABASE_URL), apply migrations, run the production-safe seed
// (skips an existing catalog; bootstraps the first admin from env), then
// build the app.
import { execSync } from "node:child_process";

const dbUrl = process.env.DATABASE_URL ?? process.env.NETLIFY_DATABASE_URL;

const run = (cmd, extraEnv = {}) => {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: { ...process.env, ...extraEnv } });
};

if (dbUrl) {
  // One deploy shipped this migration as a non-idempotent duplicate and may
  // have recorded it as failed, which blocks every later `migrate deploy`.
  // Clearing that record lets the now-idempotent version re-apply; when it
  // isn't in a failed state this errors harmlessly.
  try {
    execSync(
      "npx prisma migrate resolve --rolled-back 20261007093000_admin_totp_required",
      { stdio: "ignore", env: { ...process.env, DATABASE_URL: dbUrl } }
    );
  } catch {
    // not failed — nothing to clear
  }
  run("npx prisma migrate deploy", { DATABASE_URL: dbUrl });
  run("npx prisma db seed", { DATABASE_URL: dbUrl });
} else {
  console.warn(
    "⚠ No DATABASE_URL / NETLIFY_DATABASE_URL — skipping migrations and seed. " +
      "Provision Netlify DB (or set DATABASE_URL) so the catalog can load."
  );
}

run("npx next build");
