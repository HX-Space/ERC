import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      managerCode: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    managerCode: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    managerCode?: string | null;
  }
}
