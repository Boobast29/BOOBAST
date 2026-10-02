import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AlertTriangle } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

// Alertes nationales : plusieurs garages remontent la meme panne
export default async function AlertsPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "TECHNICIEN" && role !== "ADMIN") redirect("/tickets");

  const alerts = await prisma.nationalAlert.findMany({ where: { active: true }, orderBy: { count: "desc" } });

  return (
    <div>
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-6 w-6 text-profil-rose" />
        <h1 className="text-2xl font-bold">Alertes nationales</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Pannes récurrentes détectées sur le réseau.</p>

      <div className="mt-6 space-y-3">
        {alerts.length === 0 && <Card className="p-10 text-center text-muted-foreground">Aucune alerte active.</Card>}
        {alerts.map((a) => (
          <Card key={a.id} className="border-profil-rose/40 bg-profil-rose/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-semibold">🚨 {a.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">Depuis le {formatDate(a.createdAt)}</p>
              </div>
              <span className="shrink-0 rounded-full bg-profil-rose px-3 py-1 text-sm font-bold text-white">{a.count}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
