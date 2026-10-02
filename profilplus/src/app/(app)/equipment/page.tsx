import { Boxes, Trophy } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { LEVEL_META } from "@/lib/constants";

// Parc materiel : fiche par garage (valises, versions, n de serie, licences)
export default async function EquipmentPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  const garageId = (session?.user as any)?.garageId;

  const garages = await prisma.garage.findMany({
    where: role === "GARAGE" && garageId ? { id: garageId } : {},
    include: { equipment: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="flex items-center gap-2">
        <Boxes className="h-6 w-6 text-profil-blue" />
        <h1 className="text-2xl font-bold">Parc matériel</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Valises, versions, numéros de série, licences.</p>

      <div className="mt-6 space-y-4">
        {garages.map((g) => {
          const lvl = LEVEL_META[g.level];
          return (
            <Card key={g.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{g.name}</h3>
                  <p className="text-xs text-muted-foreground">{g.city ?? ""} {g.region ? `· ${g.region}` : ""}</p>
                </div>
                <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  {lvl?.emoji} {lvl?.label} · {g.autonomyScore}/100
                </span>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr><th className="py-1 pr-4">Valise</th><th className="pr-4">Modèle</th><th className="pr-4">Version</th><th className="pr-4">N° série</th><th>Licence</th></tr>
                  </thead>
                  <tbody>
                    {g.equipment.length === 0 && <tr><td colSpan={5} className="py-2 text-muted-foreground">Aucun matériel renseigné.</td></tr>}
                    {g.equipment.map((e) => (
                      <tr key={e.id} className="border-t">
                        <td className="py-1.5 pr-4 font-medium">{e.brand}</td>
                        <td className="pr-4">{e.model ?? "-"}</td>
                        <td className="pr-4">{e.version ?? "-"}</td>
                        <td className="pr-4 font-mono text-xs">{e.serialNumber ?? "-"}</td>
                        <td className="text-xs">{e.license ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
