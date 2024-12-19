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
    authorized({
      auth,
      request: { nextUrl },
    }: {
      auth: any;
      request: { nextUrl: URL };
    }) {
      const isLoggedIn = !!auth?.user;
      const isOnChat = nextUrl.pathname.startsWith("/chat");
      const isOnRegister = nextUrl.pathname.startsWith("/register");
      const isOnLogin = nextUrl.pathname.startsWith("/login");

      if (isLoggedIn) {
        if (isOnLogin || isOnRegister) {
          return Response.redirect(new URL("/", nextUrl as unknown as URL));
        }
        if (isOnChat) {
          return true; // Allow access to chat page if logged in
        }
        return true; // Allow access to other pages if logged in
      }

      if (isOnRegister || isOnLogin) {
        return true; // Always allow access to register and login pages
      }

      if (isOnChat) {
        return false; // Redirect unauthenticated users to login page
      }

      return true; // Allow access to other pages if not logged in
    },
  },
} satisfies NextAuthConfig;
