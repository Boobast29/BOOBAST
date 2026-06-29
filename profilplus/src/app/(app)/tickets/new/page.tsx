"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { FileDropzone, type UploadedFile } from "@/components/file-dropzone";
import { TOOL_BRANDS, VEHICLE_BRANDS, SMART_QUESTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STEPS = ["Garage", "Valise", "Véhicule", "Immobilisé", "Problème", "Pièces jointes", "Questions"];

export default function NewTicketPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [files, setFiles] = React.useState<UploadedFile[]>([]);
  const [smart, setSmart] = React.useState<Record<string, any>>({});

  const [form, setForm] = React.useState({
    garageName: "",
    userName: "",
    phone: "",
    toolBrand: "",
    vehicleBrand: "",
    vehicleModel: "",
    vehicleYear: "",
    plate: "",
    immobilized: false,
    description: "",
  });

  React.useEffect(() => {
    if (session?.user?.name) setForm((f) => ({ ...f, userName: f.userName || session.user!.name! }));
  }, [session]);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const canNext = () => {
    if (step === 0) return form.garageName && form.userName && form.phone;
    if (step === 1) return !!form.toolBrand;
    if (step === 2) return form.vehicleBrand && form.vehicleModel;
    if (step === 4) return form.description.length > 3;
    return true;
  };

  async function submit() {
    setSubmitting(true);
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, attachments: files, smartAnswers: smart }),
    });
    setSubmitting(false);
    if (res.ok) {
      const t = await res.json();
      router.push(`/tickets/${t.id}`);
    } else {
      alert("Erreur lors de la création.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Nouvelle demande</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Simple et rapide — créez votre demande en moins de 2 minutes.
      </p>

      {/* progression */}
      <div className="mt-6 flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 flex-col items-center gap-1">
            <div className={cn("h-1.5 w-full rounded-full transition-colors", i <= step ? "bg-profil-blue" : "bg-muted")} />
            <span className={cn("hidden text-[10px] font-medium sm:block", i === step ? "text-profil-blue" : "text-muted-foreground")}>{s}</span>
          </div>
        ))}
      </div>

      <Card className="mt-6 p-6">
        {step === 0 && (
          <div className="space-y-4">
            <Field label="Nom du garage">
              <Input value={form.garageName} onChange={(e) => set("garageName", e.target.value)} placeholder="Profil+ Quimper" />
            </Field>
            <Field label="Nom utilisateur">
              <Input value={form.userName} onChange={(e) => set("userName", e.target.value)} placeholder="Votre nom" />
            </Field>
            <Field label="Téléphone">
              <Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="06 12 34 56 78" />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div>
            <p className="mb-3 text-sm font-medium">Valise utilisée</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TOOL_BRANDS.map((b) => (
                <button key={b} onClick={() => set("toolBrand", b)}
                  className={cn("rounded-xl border-2 p-4 text-sm font-semibold transition-all",
                    form.toolBrand === b ? "border-profil-blue bg-profil-blue/10 text-profil-blue" : "border-input hover:border-profil-blue/50")}>
                  {b}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Field label="Marque">
              <div className="flex flex-wrap gap-2">
                {VEHICLE_BRANDS.map((b) => (
                  <button key={b} onClick={() => set("vehicleBrand", b)}
                    className={cn("rounded-full border px-3 py-1.5 text-sm transition-colors",
                      form.vehicleBrand === b ? "border-profil-rose bg-profil-rose/10 text-profil-rose" : "hover:bg-accent")}>
                    {b}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Modèle"><Input value={form.vehicleModel} onChange={(e) => set("vehicleModel", e.target.value)} placeholder="Clio V" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Année"><Input value={form.vehicleYear} onChange={(e) => set("vehicleYear", e.target.value)} placeholder="2021" /></Field>
              <Field label="Immatriculation"><Input value={form.plate} onChange={(e) => set("plate", e.target.value)} placeholder="AB-123-CD" /></Field>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="mb-3 text-sm font-medium">Le véhicule est-il immobilisé ?</p>
            <div className="grid grid-cols-2 gap-3">
              {[{ v: true, l: "OUI", d: "Véhicule à l'arrêt" }, { v: false, l: "NON", d: "Roule encore" }].map((o) => (
                <button key={o.l} onClick={() => set("immobilized", o.v)}
                  className={cn("rounded-xl border-2 p-6 text-center transition-all",
                    form.immobilized === o.v ? (o.v ? "border-destructive bg-destructive/10" : "border-green-500 bg-green-500/10") : "border-input hover:border-profil-blue/50")}>
                  <p className="text-xl font-bold">{o.l}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{o.d}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <Field label="Description du problème">
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)}
              className="min-h-[160px]" placeholder="Décrivez le problème rencontré : symptômes, code défaut, comportement de la valise…" />
          </Field>
        )}

        {step === 5 && (
          <div>
            <p className="mb-3 text-sm font-medium">Ajout des pièces jointes</p>
            <FileDropzone files={files} onChange={setFiles} />
          </div>
        )}

        {step === 6 && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">Quelques questions facultatives pour aider le support.</p>
            {SMART_QUESTIONS.map((q) => (
              <div key={q.id}>
                <p className="mb-2 text-sm font-medium">{q.label}</p>
                {q.type === "boolean" && (
                  <div className="flex gap-2">
                    {["Oui", "Non"].map((o) => (
                      <button key={o} onClick={() => setSmart((s) => ({ ...s, [q.id]: o }))}
                        className={cn("rounded-full border px-4 py-1.5 text-sm", smart[q.id] === o ? "border-profil-blue bg-profil-blue/10 text-profil-blue" : "hover:bg-accent")}>{o}</button>
                    ))}
                  </div>
                )}
                {(q.type === "single" || q.type === "multi") && (
                  <div className="flex flex-wrap gap-2">
                    {q.options!.map((o) => {
                      const selected = q.type === "multi" ? (smart[q.id] ?? []).includes(o) : smart[q.id] === o;
                      return (
                        <button key={o}
                          onClick={() => setSmart((s) => {
                            if (q.type === "multi") {
                              const arr: string[] = s[q.id] ?? [];
                              return { ...s, [q.id]: arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o] };
                            }
                            return { ...s, [q.id]: o };
                          })}
                          className={cn("rounded-full border px-3 py-1.5 text-sm", selected ? "border-profil-rose bg-profil-rose/10 text-profil-rose" : "hover:bg-accent")}>{o}</button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="mt-5 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ChevronLeft className="h-4 w-4" /> Retour
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
            Suivant <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="rose" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Envoyer la demande
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
