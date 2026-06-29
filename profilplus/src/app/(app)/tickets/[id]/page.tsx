import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { ChevronLeft, Car, Wrench, Phone, Sparkles, Clock } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { TicketConversation } from "@/components/ticket-conversation";
import { TicketTechPanel } from "@/components/ticket-tech-panel";
import { formatDate, formatMinutes } from "@/lib/utils";

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role ?? "GARAGE";
  const isSupport = role === "TECHNICIEN" || role === "ADMIN";

  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: {
      attachments: true,
      messages: { include: { author: true, attachments: true }, orderBy: { createdAt: "asc" } },
      callLogs: { include: { agent: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!ticket) notFound();

  const smart = (ticket.smartAnswers as Record<string, any>) ?? {};

  return (
    <div>
      <Link href="/tickets" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Mes demandes
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{ticket.vehicleBrand} {ticket.vehicleModel}</h1>
        <StatusBadge status={ticket.status} />
        {ticket.immobilized && <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">Véhicule immobilisé</span>}
      </div>
      <p className="mt-1 font-mono text-xs text-muted-foreground">{ticket.reference} · {formatDate(ticket.createdAt)}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {ticket.aiSummary && (
            <Card className="border-profil-rose/30 bg-profil-rose/5 p-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-profil-rose"><Sparkles className="h-4 w-4" /> Résumé IA</p>
              <p className="mt-1 text-sm">{ticket.aiSummary}</p>
            </Card>
          )}

          <Card className="p-4">
            <p className="text-sm font-semibold">Description du problème</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{ticket.description}</p>
            {ticket.attachments.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {ticket.attachments.map((a) =>
                  a.type === "PHOTO" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <a key={a.id} href={a.url} target="_blank" rel="noreferrer"><img src={a.url} alt={a.filename} className="h-20 w-full rounded-lg object-cover" /></a>
                  ) : (
                    <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="flex h-20 items-center justify-center rounded-lg border p-2 text-center text-xs underline">{a.filename}</a>
                  ),
                )}
              </div>
            )}
          </Card>

          <div>
            <p className="mb-2 text-sm font-semibold">Conversation</p>
            <TicketConversation ticketId={ticket.id} currentUserId={session!.user.id} initial={JSON.parse(JSON.stringify(ticket.messages))} />
          </div>
        </div>

        <div className="space-y-4">
          <Card className="space-y-2.5 p-4 text-sm">
            <Row icon={<Wrench className="h-4 w-4" />} label="Valise" value={ticket.toolBrand} />
            <Row icon={<Car className="h-4 w-4" />} label="Véhicule" value={`${ticket.vehicleBrand} ${ticket.vehicleModel} ${ticket.vehicleYear ?? ""}`} />
            <Row label="Immatriculation" value={ticket.plate ?? "-"} />
            <Row label="Garage" value={ticket.garageName} />
            <Row icon={<Phone className="h-4 w-4" />} label="Contact" value={`${ticket.userName} · ${ticket.phone}`} />
            {ticket.resolutionMinutes != null && <Row icon={<Clock className="h-4 w-4" />} label="Résolu en" value={formatMinutes(ticket.resolutionMinutes)} />}
          </Card>

          {Object.keys(smart).length > 0 && (
            <Card className="space-y-1.5 p-4 text-sm">
              <p className="font-semibold">Questions intelligentes</p>
              {Object.entries(smart).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="text-right font-medium">{Array.isArray(v) ? v.join(", ") : String(v)}</span>
                </div>
              ))}
            </Card>
          )}

          {ticket.callLogs.length > 0 && (
            <Card className="space-y-2 p-4 text-sm">
              <p className="font-semibold">Historique des rappels</p>
              {ticket.callLogs.map((c) => (
                <div key={c.id} className="rounded-lg bg-muted p-2 text-xs">
                  <p className="font-medium">{formatDate(c.calledAt)} · {formatMinutes(c.durationMinutes)}</p>
                  <p className="mt-0.5 text-muted-foreground">{c.report}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">par {c.agent.name}</p>
                </div>
              ))}
            </Card>
          )}

          {isSupport && <TicketTechPanel ticket={JSON.parse(JSON.stringify(ticket))} />}
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="flex items-center gap-1.5 text-muted-foreground">{icon}{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
