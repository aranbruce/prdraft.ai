import { compare } from "bcrypt-ts";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

import { getUser } from "@/lib/db/queries";

import type { NextAuthConfig, Session, User } from "next-auth";

interface ExtendedSession extends Session {
  user: User;
}

export const authConfig = {
  pages: {
    signIn: "/login",
    newUser: "/",
  },
  providers: [
    GitHub({
      allowDangerousEmailAccountLinking: true,
    }),
    Google({
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: {},
      async authorize({ email, password }: any) {
        let users = await getUser(email);
        if (users.length === 0) return null;
        let passwordsMatch = await compare(password, users[0].password!);
        if (!passwordsMatch) return null;
        if (passwordsMatch) return users[0] as any;
      },
    }),

    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  callbacks: {
    async jwt({ token, user }: { token: any; user: User }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({
      session,
      token,
    }: {
      session: ExtendedSession;
      token: any;
    }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;

      // Check if the path is a callback URL
      const isAuthCallback = nextUrl.pathname.startsWith("/api/auth/callback");

      // Public routes - always accessible
      const publicRoutes = ["/login", "/sign-up"];
      const isPublicRoute = publicRoutes.includes(nextUrl.pathname);

      if (isAuthCallback || isPublicRoute) {
        if (isLoggedIn && !isAuthCallback) {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
