import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("UNAUTHORIZED");
  return session.user;
}

export function requireRole(role: string, allowed: string[]) {
  if (!allowed.includes(role)) throw new Error("FORBIDDEN");
}
