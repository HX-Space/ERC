import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query } from "@/lib/db";
import type { UserRole } from "@/types";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const result = await query<{
          id: string;
          email: string;
          name: string;
          password_hash: string;
          role: UserRole;
          manager_code: string | null;
          is_active: boolean;
        }>(
          `SELECT id, email, name, password_hash, role, manager_code, is_active
           FROM employee_relations_users WHERE lower(email) = lower($1) LIMIT 1`,
          [email],
        );

        const user = result.rows[0];
        if (!user || !user.is_active) return null;

        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          managerCode: user.manager_code,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = (user as { role: UserRole }).role;
        token.managerCode = (user as { managerCode: string | null }).managerCode;
        return token;
      }
      // Re-read the account on every request, so disabling a user or changing their role
      // takes effect at once instead of when the 30-day session expires.
      if (!token.id) return null;
      try {
        const { rows } = await query<{ name: string; role: UserRole; manager_code: string | null; is_active: boolean }>(
          `SELECT name, role, manager_code, is_active FROM employee_relations_users WHERE id = $1`,
          [token.id],
        );
        const account = rows[0];
        if (!account || !account.is_active) return null; // signed out
        token.name = account.name;
        token.role = account.role;
        token.managerCode = account.manager_code;
      } catch {
        // Database briefly unreachable: keep the current session rather than signing everyone out.
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.managerCode = (token.managerCode as string | null) ?? null;
      }
      return session;
    },
  },
});
