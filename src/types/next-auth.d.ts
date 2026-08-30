import type { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      username: string;
      sessionVersion: number;
    };
  }

  interface User extends DefaultUser {
    username: string;
    displayName: string;
    sessionVersion: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    staffId: string;
    username: string;
    displayName: string;
    sessionVersion: number;
  }
}
