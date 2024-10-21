import { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    newUser: "/",
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      let isLoggedIn = !!auth?.user;
      let isOnChat = nextUrl.pathname.startsWith("/chat");
      let isOnSignUp = nextUrl.pathname.startsWith("/sign-up");
      let isOnLogin = nextUrl.pathname.startsWith("/login");

      if (isLoggedIn && (isOnLogin || isOnSignUp)) {
        return Response.redirect(new URL("/", nextUrl));
      }

      if (isOnSignUp || isOnLogin) {
        return true; // Always allow access to register and login pages
      }

      if (isOnChat) {
        if (isLoggedIn) return true;
        // return false; // Redirect unauthenticated users to login page
        return true; // Allow unauthenticated users to access chat pages
      }

      // if (isLoggedIn) {
      //   return Response.redirect(new URL("/", nextUrl));
      // }

      return true;
    },
  },
} satisfies NextAuthConfig;
