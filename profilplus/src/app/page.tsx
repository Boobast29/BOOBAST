import Link from "next/link";
import { Wrench, ListChecks, BookOpen, BarChart3, ArrowRight, Search } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const ACTIONS = [
  { href: "/tickets/new", icon: Wrench, title: "Nouvelle demande", desc: "Créez une demande en moins de 2 minutes.", emoji: "🔧" },
  { href: "/tickets", icon: ListChecks, title: "Mes demandes", desc: "Suivez vos tickets et conversations.", emoji: "📋" },
  { href: "/knowledge", icon: BookOpen, title: "Base de connaissances", desc: "Cas connus, astuces et procédures.", emoji: "📚" },
  { href: "/stats", icon: BarChart3, title: "Mon activité", desc: "Indice d'Autonomie et statistiques.", emoji: "📊" },
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-profil-light dark:bg-background">
      {/* fond degrade */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-profil-blue/15 blur-3xl" />
        <div className="absolute -right-40 top-40 h-96 w-96 rounded-full bg-profil-rose/15 blur-3xl" />
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="outline">
            <Link href="/login">Connexion</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        <section className="animate-fade-in pt-16 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-profil-rose" />
            Réseau Profil+ · Support technique national
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
            Support Diagnostic{" "}
            <span className="bg-gradient-to-r from-profil-blue to-profil-rose bg-clip-text text-transparent">
              Profil+
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Plateforme de support technique pour le réseau Profil+. Valises, VCI, ADAS,
            programmations, codages et mises à jour — résolus plus vite, ensemble.
          </p>

          <div className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-2xl border bg-card p-2 shadow-sm">
            <Search className="ml-2 h-5 w-5 text-muted-foreground" />
            <span className="flex-1 text-left text-sm text-muted-foreground">
              Rechercher un code défaut, ex. « P2002 »…
            </span>
            <Button asChild size="sm">
              <Link href="/search">Rechercher</Link>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/tickets/new">
                🔧 Nouvelle demande <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="rose">
              <Link href="/knowledge">📚 Base de connaissances</Link>
            </Button>
          </div>
        </section>

        <section className="mt-20 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ACTIONS.map((a, i) => (
            <Link key={a.href} href={a.href} className="group animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
              <Card className="h-full p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-profil-blue/10 text-2xl">
                  {a.emoji}
                </div>
                <h3 className="flex items-center gap-1 font-semibold">
                  {a.title}
                  <ArrowRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{a.desc}</p>
              </Card>
            </Link>
          ))}
        </section>
      </main>

      <footer className="border-t bg-card/50 py-6 text-center text-sm text-muted-foreground">
        PROFIL+ Support Diagnostic — Mémoire technique nationale du réseau Profil+
      </footer>
    </div>
  );
}
