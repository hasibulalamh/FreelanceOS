"use client";

import { SessionProvider } from "next-auth/react";

// Client boundary for NextAuth context: React Context cannot be created in
// server components, so the provider must live in its own client file.
export function AuthSessionProvider({ session, children }) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
