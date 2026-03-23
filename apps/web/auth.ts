import path from "node:path";
import { config } from "dotenv";
// Monorepo: .env root'ta olabilir (apps/web'den ../../ veya root'tan .)
config({ path: path.resolve(process.cwd(), ".env") });
config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), "../.env") });
config({ path: path.resolve(process.cwd(), "../../.env") });
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@socialflow/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Şifre", type: "password" }
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email);
        const password = String(credentials.password);

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      const userId = (user?.id ?? token.id) as string | undefined;
      if (userId && typeof userId === "string") {
        if (user) {
          token.id = user.id;
          token.email = user.email;
        }
        if (!token.organizationId) {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { ownedOrganizations: { take: 1 } }
          });
          token.organizationId = dbUser?.ownedOrganizations[0]?.id ?? null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as unknown as Record<string, unknown>;
        u.id = token.id;
        u.organizationId = token.organizationId ?? null;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login"
  },
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET
});
