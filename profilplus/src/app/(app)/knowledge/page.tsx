"use client";

import * as React from "react";
import { Search, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TOOL_BRANDS, VEHICLE_BRANDS, KNOWLEDGE_TYPE_META } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function KnowledgePage() {
  const [q, setQ] = React.useState("");
  const [tool, setTool] = React.useState<string>("");
  const [brand, setBrand] = React.useState<string>("");
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (tool) sp.set("tool", tool);
    if (brand) sp.set("brand", brand);
    const res = await fetch(`/api/knowledge?${sp}`);
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }, [q, tool, brand]);

  React.useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Base de connaissances</h1>
      <p className="mt-1 text-sm text-muted-foreground">Bibliothèque technique centralisée — recherche instantanée.</p>

      <div className="mt-5 flex items-center gap-2 rounded-xl border bg-card px-3 shadow-sm">
        <Search className="h-5 w-5 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (code, symptôme, solution)…"
          className="h-11 flex-1 bg-transparent text-sm outline-none" />
      </div>

      <div className="mt-3 space-y-2">
        <Chips label="Valise" options={["", ...TOOL_BRANDS]} value={tool} onChange={setTool} />
        <Chips label="Marque" options={["", ...VEHICLE_BRANDS]} value={brand} onChange={setBrand} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {!loading && items.length === 0 && (
          <Card className="col-span-full p-10 text-center text-muted-foreground">
            <BookOpen className="mx-auto mb-2 h-8 w-8 opacity-50" /> Aucun article trouvé.
          </Card>
        )}
        {items.map((a) => {
          const tm = KNOWLEDGE_TYPE_META[a.type];
          return (
            <Card key={a.id} className="p-4">
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-profil-blue/10 px-2 py-0.5 font-medium text-profil-blue">{tm?.emoji} {tm?.label}</span>
                {a.errorCode && <span className="rounded-full bg-profil-rose/10 px-2 py-0.5 font-mono font-medium text-profil-rose">{a.errorCode}</span>}
              </div>
              <h3 className="mt-2 font-semibold">{a.title}</h3>
              {a.symptoms && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.symptoms}</p>}
              <p className="mt-2 line-clamp-3 text-sm">{a.solution}</p>
              <div className="mt-2 flex gap-2 text-[11px] text-muted-foreground">
                {a.toolBrand && <span>{a.toolBrand}</span>}
                {a.vehicleBrand && <span>· {a.vehicleBrand} {a.vehicleModel ?? ""}</span>}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Chips({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}:</span>
      {options.map((o) => (
        <button key={o || "all"} onClick={() => onChange(o)}
          className={cn("rounded-full border px-2.5 py-1 text-xs transition-colors", value === o ? "border-profil-blue bg-profil-blue/10 text-profil-blue" : "hover:bg-accent")}>
          {o || "Tous"}
        </button>
      ))}
    </div>
  );
}
