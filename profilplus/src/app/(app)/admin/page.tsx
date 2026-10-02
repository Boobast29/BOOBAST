import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ShieldCheck, Users, Building2, FileClock } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") redirect("/tickets");

  const [users, garages, audit, counts] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, include: { garage: true } }),
    prisma.garage.count(),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { user: true } }),
    prisma.ticket.count(),
  ]);

  return (
    <div>
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-profil-blue" />
        <h1 className="text-2xl font-bold">Administration</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Gestion des utilisateurs, garages et journal d&apos;audit (RBAC).</p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Card className="p-4"><Users className="h-5 w-5 text-muted-foreground" /><p className="mt-2 text-2xl font-bold">{users.length}</p><p className="text-xs text-muted-foreground">Utilisateurs</p></Card>
        <Card className="p-4"><Building2 className="h-5 w-5 text-muted-foreground" /><p className="mt-2 text-2xl font-bold">{garages}</p><p className="text-xs text-muted-foreground">Garages</p></Card>
        <Card className="p-4"><FileClock className="h-5 w-5 text-muted-foreground" /><p className="mt-2 text-2xl font-bold">{counts}</p><p className="text-xs text-muted-foreground">Tickets</p></Card>
      </div>

      <Card className="mt-6 p-4">
        <p className="mb-3 text-sm font-semibold">Utilisateurs</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1 pr-4">Nom</th><th className="pr-4">Email</th><th className="pr-4">Rôle</th><th>Garage</th></tr></thead>
            <tbody>
              {users.map((u: (typeof users)[number]) => (
                <tr key={u.id} className="border-t">
                  <td className="py-1.5 pr-4 font-medium">{u.name}</td>
                  <td className="pr-4 text-muted-foreground">{u.email}</td>
                  <td className="pr-4"><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{u.role}</span></td>
                  <td className="text-muted-foreground">{u.garage?.name ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-6 p-4">
        <p className="mb-3 text-sm font-semibold">Journal d&apos;audit</p>
        <div className="space-y-1.5">
          {audit.map((a: (typeof audit)[number]) => (
            <div key={a.id} className="flex items-center gap-2 text-xs">
              <span className="font-mono text-muted-foreground">{formatDate(a.createdAt)}</span>
              <span className="rounded bg-profil-blue/10 px-1.5 py-0.5 font-medium text-profil-blue">{a.action}</span>
              <span className="text-muted-foreground">{a.user?.name ?? "système"}</span>
              {a.entity && <span className="text-muted-foreground">· {a.entity}</span>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
