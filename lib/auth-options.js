import { PrismaAdapter } from "@next-auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { compare } from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { oauthProviders } from "@/lib/config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Auth.js v4 options object, consumed by app/api/auth/[...nextauth]/route.js.
// JWT session strategy is required with the credentials provider (v4 cannot
// issue database sessions for credentials login); OAuth logins still persist
// provider links through the Prisma adapter.
export const authOptions = {
  // Explicit secret: v4's default env name is NEXTAUTH_SECRET, but this
  // project standardizes on AUTH_SECRET (v5-compatible naming).
  secret: process.env.AUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    // Rolling 30-day session; v4 extends the cookie expiry on activity.
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        // Same generic message for unknown email and wrong password so the
        // endpoint cannot be used to enumerate registered accounts.
        if (!user?.passwordHash) return null;
        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
    // Providers are only registered when their env credentials exist, so the
    // sign-in page shows exactly the options this deployment supports.
    ...(oauthProviders.google
      ? [Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })]
      : []),
    ...(oauthProviders.github
      ? [GitHub({ clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET })]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Persist the database user id into the JWT on sign-in so every
      // server-side authorization check can trust it without a lookup.
      if (user) {
        token.uid = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        session.user.id = token.uid;
      }
      return session;
    },
  },
};
