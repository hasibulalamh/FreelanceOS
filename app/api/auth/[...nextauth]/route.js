import NextAuth from "next-auth";

import { authOptions } from "@/lib/auth-options";

// NextAuth v4 route handler. In the App Router the GET/POST pair is exported
// directly; v4's NextAuth(options) returns both.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
