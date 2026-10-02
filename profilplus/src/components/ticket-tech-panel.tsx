"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Phone, Sparkles, BookmarkPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function TicketTechPanel({ ticket }: { ticket: any }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [callOpen, setCallOpen] = React.useState(false);
  const [aiResult, setAiResult] = React.useState<string>("");
  const [call, setCall] = React.useState({ calledAt: new Date().toISOString().slice(0, 16), durationMinutes: 5, report: "" });

  async function setStatus(status: string) {
    setBusy(true);
    await fetch(`/api/tickets/${ticket.id}`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }),
    });
    setBusy(false);
    router.refresh();
  }

  async function saveCall() {
    setBusy(true);
    await fetch(`/api/tickets/${ticket.id}/calls`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ calledAt: new Date(call.calledAt).toISOString(), durationMinutes: Number(call.durationMinutes), report: call.report }),
    });
    setBusy(false); setCallOpen(false); setCall({ ...call, report: "" });
    router.refresh();
  }

  async function ai(action: string) {
    setBusy(true); setAiResult("Analyse en cours…");
    const res = await fetch("/api/ai", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ticketId: ticket.id }),
    });
    const data = await res.json();
    setAiResult(data.summary ?? data.suggestion ?? (data.cases ? `${data.cases.length} cas similaire(s) trouvé(s)` : "Aucun résultat"));
    setBusy(false);
    if (action === "summary") router.refresh();
  }

  async function toKnowledge() {
    setBusy(true);
    await fetch("/api/knowledge", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "CAS_CONNU",
        title: `${ticket.vehicleBrand} ${ticket.vehicleModel} — ${ticket.toolBrand}`,
        toolBrand: ticket.toolBrand, vehicleBrand: ticket.vehicleBrand, vehicleModel: ticket.vehicleModel,
        symptoms: ticket.description, solution: ticket.aiSummary ?? "À compléter",
        resolutionMinutes: ticket.resolutionMinutes, sourceTicketId: ticket.id,
      }),
    });
    setBusy(false);
    router.push("/cases");
  }

  return (
    <Card className="space-y-4 p-4">
      <div>
        <p className="mb-2 text-sm font-semibold">Statut</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(STATUS_META).map(([k, m]) => (
            <button key={k} onClick={() => setStatus(k)} disabled={busy}
              className={cn("rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                ticket.status === k ? "border-profil-blue bg-profil-blue/10" : "hover:bg-accent")}>
              {m.emoji} {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Button variant="rose" className="w-full" onClick={() => setCallOpen((o) => !o)}>
          <Phone className="h-4 w-4" /> 📞 Garage rappelé
        </Button>
        {callOpen && (
          <div className="mt-3 space-y-2 rounded-lg border p-3">
            <Input type="datetime-local" value={call.calledAt} onChange={(e) => setCall({ ...call, calledAt: e.target.value })} />
            <Input type="number" min={0} value={call.durationMinutes} onChange={(e) => setCall({ ...call, durationMinutes: Number(e.target.value) })} placeholder="Durée (min)" />
            <Textarea value={call.report} onChange={(e) => setCall({ ...call, report: e.target.value })} placeholder="Compte rendu de l'appel…" className="min-h-[80px]" />
            <Button onClick={saveCall} disabled={busy || !call.report} className="w-full" size="sm">Enregistrer le rappel</Button>
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Sparkles className="h-4 w-4 text-profil-rose" /> Assistant IA</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => ai("summary")} disabled={busy}>Résumé</Button>
          <Button variant="outline" size="sm" onClick={() => ai("similar")} disabled={busy}>Cas similaires</Button>
          <Button variant="outline" size="sm" onClick={() => ai("suggest")} disabled={busy}>Suggestions</Button>
        </div>
        {aiResult && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-muted p-2 text-xs">{aiResult}</p>}
      </div>

      <Button variant="default" className="w-full" onClick={toKnowledge} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookmarkPlus className="h-4 w-4" />} Transformer en cas connu
      </Button>
    </Card>
  );
}
