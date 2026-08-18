import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { verify as argonVerify } from "@node-rs/argon2";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { mergeCartIntoUser } from "@/lib/cart";

// Customer auth realm. JWT sessions (Credentials requires it); the Prisma
// adapter persists users + OAuth account links. Completely separate from the
// admin realm — different table, cookie, and session mechanism (guardrail 10).

const providers: NextAuthConfig["providers"] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Same verified email → link to the existing User, never a duplicate
      // account (engineering brief §5). The unverified-credentials case is
      // blocked in the signIn callback below.
      allowDangerousEmailAccountLinking: true,
    })
  );
}

if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
  providers.push(
    Apple({
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

providers.push(
  Credentials({
    credentials: { email: {}, password: {} },
    authorize: async (credentials) => {
      const parsed = z
        .object({ email: z.string().email(), password: z.string().min(1) })
        .safeParse(credentials);
      if (!parsed.success) return null;
      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email.toLowerCase() },
      });
      if (!user?.passwordHash) return null;
      const ok = await argonVerify(user.passwordHash, parsed.data.password);
      if (!ok) return null;
      return { id: user.id, name: user.name, email: user.email };
    },
  })
);

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/sign-in" },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      // OAuth linking guard: an existing credentials account that never
      // verified its email cannot be silently taken over via OAuth.
      if (account && account.provider !== "credentials" && user.email) {
        const existing = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase() },
        });
        if (existing && existing.passwordHash && !existing.emailVerified) {
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.uid && session.user) {
        session.user.id = String(token.uid);
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Apple returns the user's name only on the first authorization; when a
      // provider sends none at all, fall back to the email's local part so
      // User.name is never empty.
      if (user.id && (!user.name || user.name.trim() === "")) {
        const fallback = user.email?.split("@")[0] ?? "Rider";
        await prisma.user.update({
          where: { id: user.id },
          data: { name: fallback },
        });
      }
    },
    async signIn({ user }) {
      // The anonymous cookie cart merges into the user cart on sign-in.
      if (user.id) {
        try {
          await mergeCartIntoUser(user.id);
        } catch {
          // Never block a sign-in because the cart merge hiccuped.
        }
      }
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

export const oauthProviders = {
  google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  apple: Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET),
};
