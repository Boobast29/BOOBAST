"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatMinutes } from "@/lib/utils";

export default function SearchPage() {
  const [q, setQ] = React.useState("");
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    setData(await res.json());
    setLoading(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Recherche technique</h1>
      <p className="mt-1 text-sm text-muted-foreground">Code défaut, message d&apos;erreur, modèle, valise, solution…</p>

      <form onSubmit={run} className="mt-5 flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border bg-card px-3 shadow-sm">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder='Exemple : "P2002"'
            className="h-11 flex-1 bg-transparent text-sm outline-none" />
        </div>
        <Button type="submit" disabled={loading}>Rechercher</Button>
      </form>

      {data?.stats && (
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Card className="p-4"><p className="text-2xl font-bold text-profil-blue">{data.stats.count}</p><p className="text-xs text-muted-foreground">Résultats</p></Card>
          <Card className="p-4"><p className="text-2xl font-bold text-profil-rose">{formatMinutes(data.stats.avgMinutes)}</p><p className="text-xs text-muted-foreground">Temps moyen</p></Card>
          <Card className="p-4"><p className="text-2xl font-bold">{data.articles.length}</p><p className="text-xs text-muted-foreground">Cas connus</p></Card>
        </div>
      )}

      {data && (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="mb-2 text-sm font-semibold">Base de connaissances</h2>
            <div className="space-y-2">
              {data.articles.length === 0 && <p className="text-sm text-muted-foreground">Aucun cas connu.</p>}
              {data.articles.map((a: any) => (
                <Card key={a.id} className="p-3">
                  <p className="font-medium">{a.title}</p>
                  {a.errorCode && <span className="font-mono text-xs text-profil-rose">{a.errorCode}</span>}
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.solution}</p>
                </Card>
              ))}
            </div>
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold">Tickets associés</h2>
            <div className="space-y-2">
              {data.tickets.length === 0 && <p className="text-sm text-muted-foreground">Aucun ticket.</p>}
              {data.tickets.map((t: any) => (
                <Link key={t.id} href={`/tickets/${t.id}`}>
                  <Card className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{t.reference}</span>
                      <StatusBadge status={t.status} />
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm">{t.vehicleBrand} {t.vehicleModel} — {t.description}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
