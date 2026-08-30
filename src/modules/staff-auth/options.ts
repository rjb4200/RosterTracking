import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import { getAuthSecret } from "@/server/env";

import { authenticateStaff } from "./authentication";

export const STAFF_SESSION_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

const credentialsSchema = z.object({
  username: z.string(),
  password: z.string().min(1),
});

export const authOptions: NextAuthOptions = {
  secret: getAuthSecret(),
  session: {
    strategy: "jwt",
    maxAge: STAFF_SESSION_MAX_AGE_SECONDS,
  },
  jwt: {
    maxAge: STAFF_SESSION_MAX_AGE_SECONDS,
  },
  pages: {
    signIn: "/staff/login",
    error: "/staff/login",
  },
  providers: [
    CredentialsProvider({
      name: "Staff credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const forwardedFor = request.headers?.["x-forwarded-for"];
        const ipAddress = Array.isArray(forwardedFor)
          ? forwardedFor[0]
          : forwardedFor?.split(",")[0]?.trim();
        return authenticateStaff(
          parsed.data.username,
          parsed.data.password,
          ipAddress,
        );
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.staffId = user.id;
        token.username = user.username;
        token.displayName = user.displayName;
        token.sessionVersion = user.sessionVersion;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.staffId;
        session.user.username = token.username;
        session.user.name = token.displayName;
        session.user.sessionVersion = token.sessionVersion;
      }
      return session;
    },
  },
};
