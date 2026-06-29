import Link from "next/link";
import { Paperclip, MessageSquare, Plus, Car, Wrench } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/utils";

export default async function TicketsPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role ?? "GARAGE";
  const where = role === "GARAGE" ? { creatorId: session!.user.id } : {};
  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { attachments: true, messages: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mes demandes</h1>
          <p className="mt-1 text-sm text-muted-foreground">{tickets.length} demande(s)</p>
        </div>
        <Button asChild><Link href="/tickets/new"><Plus className="h-4 w-4" /> Nouvelle</Link></Button>
      </div>

      <div className="mt-6 space-y-3">
        {tickets.length === 0 && (
          <Card className="p-10 text-center text-muted-foreground">
            Aucune demande pour le moment. <Link href="/tickets/new" className="text-primary hover:underline">Créez-en une</Link>.
          </Card>
        )}
        {tickets.map((t) => (
          <Link key={t.id} href={`/tickets/${t.id}`}>
            <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{t.reference}</span>
                  <StatusBadge status={t.status} />
                  {t.immobilized && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">Immobilisé</span>}
                </div>
                <p className="mt-1 line-clamp-1 font-medium">{t.description}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Car className="h-3.5 w-3.5" /> {t.vehicleBrand} {t.vehicleModel}</span>
                  <span className="flex items-center gap-1"><Wrench className="h-3.5 w-3.5" /> {t.toolBrand}</span>
                  <span>{t.garageName}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" /> {t._count.attachments}</span>
                <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {t._count.messages}</span>
                <span className="hidden sm:block">{formatDate(t.createdAt)}</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
