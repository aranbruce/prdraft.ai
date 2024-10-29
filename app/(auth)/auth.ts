import { compare } from "bcrypt-ts";
import type { Session, User } from "next-auth";
import NextAuth from "next-auth";
import { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";

import { getUser } from "@/db/queries";

import { authConfig } from "./auth.config";

interface ExtendedSession extends Session {
  user: User;
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {},
      async authorize(
        credentials: Record<string, string>,
      ): Promise<User | null> {
        const { email, password } = credentials;
        const users = await getUser(email);
        if (users.length === 0) return null;
        const passwordsMatch = await compare(password, users[0].password!);
        if (passwordsMatch) return users[0] as User;
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
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
      token: JWT;
    }) {
      if (session.user) {
        session.user.id = token?.id as string;
      }

      return session;
    },
  },
});
