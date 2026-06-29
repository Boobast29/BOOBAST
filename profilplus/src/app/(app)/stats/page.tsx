import { getServerSession } from "next-auth";
import { Trophy, TicketCheck, TicketX, Clock, Car, Wrench } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { LEVEL_META } from "@/lib/constants";
import { formatMinutes } from "@/lib/utils";

export default async function StatsPage() {
  const session = await getServerSession(authOptions);
  const garageId = (session?.user as any)?.garageId;

  const [open, closed, resolved, byTool, byBrand, garages, myGarage] = await Promise.all([
    prisma.ticket.count({ where: { status: { not: "RESOLU" } } }),
    prisma.ticket.count({ where: { status: "RESOLU" } }),
    prisma.ticket.findMany({ where: { resolutionMinutes: { not: null } }, select: { resolutionMinutes: true } }),
    prisma.ticket.groupBy({ by: ["toolBrand"], _count: true, orderBy: { _count: { toolBrand: "desc" } }, take: 6 }),
    prisma.ticket.groupBy({ by: ["vehicleBrand"], _count: true, orderBy: { _count: { vehicleBrand: "desc" } }, take: 6 }),
    prisma.garage.findMany({ orderBy: { autonomyScore: "desc" }, take: 8 }),
    garageId ? prisma.garage.findUnique({ where: { id: garageId } }) : null,
  ]);

  const times = resolved.map((r) => r.resolutionMinutes!).filter(Boolean);
  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
  const maxTool = Math.max(1, ...byTool.map((t) => t._count));
  const maxBrand = Math.max(1, ...byBrand.map((b) => b._count));

  return (
    <div>
      <h1 className="text-2xl font-bold">Statistiques</h1>
      <p className="mt-1 text-sm text-muted-foreground">Activité du réseau et Indice d&apos;Autonomie Profil+.</p>

      {myGarage && (
        <Card className="mt-5 overflow-hidden p-0">
          <div className="bg-gradient-to-r from-profil-blue to-profil-rose p-5 text-white">
            <p className="text-sm opacity-90">Indice d&apos;Autonomie Profil+</p>
            <div className="mt-1 flex items-end gap-3">
              <span className="text-4xl font-extrabold">{myGarage.autonomyScore}</span>
              <span className="mb-1 opacity-80">/ 100</span>
              <span className="mb-1 ml-auto flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-sm font-medium">
                {LEVEL_META[myGarage.level]?.emoji} {LEVEL_META[myGarage.level]?.label}
              </span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white" style={{ width: `${myGarage.autonomyScore}%` }} />
            </div>
          </div>
        </Card>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI icon={<TicketX className="h-5 w-5" />} label="Tickets ouverts" value={String(open)} />
        <KPI icon={<TicketCheck className="h-5 w-5" />} label="Tickets fermés" value={String(closed)} />
        <KPI icon={<Clock className="h-5 w-5" />} label="Temps moyen" value={formatMinutes(avg)} />
        <KPI icon={<Trophy className="h-5 w-5" />} label="Garages" value={String(garages.length)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><Wrench className="h-4 w-4" /> Valises les plus utilisées</p>
          {byTool.map((t) => (
            <Bar key={t.toolBrand} label={t.toolBrand} value={t._count} max={maxTool} color="bg-profil-blue" />
          ))}
        </Card>
        <Card className="p-4">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><Car className="h-4 w-4" /> Marques les plus problématiques</p>
          {byBrand.map((b) => (
            <Bar key={b.vehicleBrand} label={b.vehicleBrand} value={b._count} max={maxBrand} color="bg-profil-rose" />
          ))}
        </Card>
      </div>

      <Card className="mt-6 p-4">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold"><Trophy className="h-4 w-4" /> Garages les plus autonomes</p>
        <div className="space-y-2">
          {garages.map((g, i) => (
            <div key={g.id} className="flex items-center gap-3">
              <span className="w-5 text-center text-sm font-bold text-muted-foreground">{i + 1}</span>
              <span className="flex-1 text-sm font-medium">{g.name}</span>
              <span className="text-xs text-muted-foreground">{LEVEL_META[g.level]?.emoji} {LEVEL_META[g.level]?.label}</span>
              <span className="w-12 text-right text-sm font-bold text-profil-blue">{g.autonomyScore}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function KPI({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground">{icon}</div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs"><span>{label}</span><span className="text-muted-foreground">{value}</span></div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  );
}
