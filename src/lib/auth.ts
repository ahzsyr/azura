import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { DatabaseUnavailableError } from "@/lib/auth-errors";
import { resolveAuthSecret } from "@/lib/auth-secret.server";

const authSecret = await resolveAuthSecret();

if (!authSecret && process.env.NODE_ENV === "production") {
  console.error(
    "[auth] AUTH_SECRET is missing or placeholder. Set AUTH_SECRET in env or complete /setup.",
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: authSecret ?? authConfig.secret,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        let user;
        try {
          user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });
        } catch (error) {
          console.error("[auth] database lookup failed:", error);
          throw new DatabaseUnavailableError();
        }

        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});
