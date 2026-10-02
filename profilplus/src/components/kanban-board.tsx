"use client";

import * as React from "react";
import Link from "next/link";
import { Car, Wrench, Paperclip, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { STATUS_META } from "@/lib/constants";
import { cn, formatDateShort } from "@/lib/utils";

const COLS = ["CRITIQUE", "PRIORITAIRE", "EN_COURS", "RESOLU"];

interface T {
  id: string; reference: string; status: string; garageName: string;
  toolBrand: string; vehicleBrand: string; vehicleModel: string; urgence: string;
  immobilized: boolean; createdAt: string; _count: { attachments: number };
}

export function KanbanBoard({ initial }: { initial: T[] }) {
  const [tickets, setTickets] = React.useState<T[]>(initial);
  const [drag, setDrag] = React.useState<string | null>(null);

  async function move(id: string, status: string) {
    setTickets((ts) => ts.map((t) => (t.id === id ? { ...t, status } : t)));
    await fetch(`/api/tickets/${id}`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }),
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {COLS.map((col) => {
        const m = STATUS_META[col];
        const list = tickets.filter((t) => t.status === col);
        return (
          <div key={col}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (drag) move(drag, col); setDrag(null); }}
            className={cn("flex flex-col rounded-2xl border p-3", m.bg)}>
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-semibold">{m.emoji} {m.label}</span>
              <span className="rounded-full bg-card px-2 py-0.5 text-xs font-medium">{list.length}</span>
            </div>
            <div className="space-y-2">
              {list.map((t) => (
                <Link key={t.id} href={`/tickets/${t.id}`} draggable
                  onDragStart={() => setDrag(t.id)} onDragEnd={() => setDrag(null)}>
                  <Card className={cn("cursor-grab p-3 active:cursor-grabbing", drag === t.id && "opacity-50")}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-muted-foreground">{t.reference}</span>
                      {t.immobilized && <span className="rounded bg-destructive/10 px-1.5 text-[10px] font-medium text-destructive">Immo.</span>}
                    </div>
                    <p className="mt-1 text-sm font-medium">{t.vehicleBrand} {t.vehicleModel}</p>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Wrench className="h-3 w-3" />{t.toolBrand}</span>
                      <span>{t.garageName}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" />{t._count.attachments}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDateShort(t.createdAt)}</span>
                    </div>
                  </Card>
                </Link>
              ))}
              {list.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">—</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
