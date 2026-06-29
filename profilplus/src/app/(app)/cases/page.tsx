import { Database, Clock, Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { KNOWLEDGE_TYPE_META } from "@/lib/constants";
import { formatMinutes } from "@/lib/utils";

// Base de pannes nationale - memoire technique Profil+
export default async function CasesPage() {
  const cases = await prisma.knowledgeArticle.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const totalMin = cases.map((c) => c.resolutionMinutes).filter((n): n is number => !!n);
  const avg = totalMin.length ? Math.round(totalMin.reduce((a, b) => a + b, 0) / totalMin.length) : null;

  return (
    <div>
      <div className="flex items-center gap-2">
        <Database className="h-6 w-6 text-profil-rose" />
        <h1 className="text-2xl font-bold">Base de pannes nationale</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">La mémoire technique du réseau Profil+.</p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Cas enregistrés" value={String(cases.length)} />
        <Stat label="Temps moyen" value={formatMinutes(avg)} />
        <Stat label="Vues cumulées" value={String(cases.reduce((s, c) => s + c.views, 0))} />
      </div>

      <div className="mt-6 space-y-3">
        {cases.length === 0 && (
          <Card className="p-10 text-center text-muted-foreground">
            Aucun cas pour l&apos;instant. Résolvez des tickets et transformez-les en cas connus.
          </Card>
        )}
        {cases.map((c) => {
          const tm = KNOWLEDGE_TYPE_META[c.type];
          return (
            <Card key={c.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-profil-blue/10 px-2 py-0.5 font-medium text-profil-blue">{tm?.emoji} {tm?.label}</span>
                {c.errorCode && <span className="rounded-full bg-profil-rose/10 px-2 py-0.5 font-mono font-medium text-profil-rose">{c.errorCode}</span>}
                {c.toolBrand && <span className="rounded-full bg-muted px-2 py-0.5">{c.toolBrand}</span>}
                {c.vehicleBrand && <span className="rounded-full bg-muted px-2 py-0.5">{c.vehicleBrand} {c.vehicleModel ?? ""}</span>}
              </div>
              <h3 className="mt-2 font-semibold">{c.title}</h3>
              {c.symptoms && <p className="mt-1 text-sm text-muted-foreground"><b>Symptômes :</b> {c.symptoms}</p>}
              {c.cause && <p className="mt-0.5 text-sm"><b>Cause :</b> {c.cause}</p>}
              <p className="mt-0.5 text-sm"><b>Solution :</b> {c.solution}</p>
              <div className="mt-2 flex gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatMinutes(c.resolutionMinutes)}</span>
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{c.views}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-2xl font-bold text-profil-blue">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}
