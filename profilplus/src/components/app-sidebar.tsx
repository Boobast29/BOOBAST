"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, Wrench, ListChecks, BookOpen, Database, Search,
  BarChart3, Boxes, Bell, ShieldCheck, LogOut, KanbanSquare,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { cn, initials } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/tickets/new", label: "Nouvelle demande", icon: Wrench, roles: ["GARAGE", "TECHNICIEN", "ADMIN"] },
  { href: "/tickets", label: "Mes demandes", icon: ListChecks, roles: ["GARAGE", "TECHNICIEN", "ADMIN"] },
  { href: "/board", label: "Kanban support", icon: KanbanSquare, roles: ["TECHNICIEN", "ADMIN"] },
  { href: "/knowledge", label: "Base de connaissances", icon: BookOpen, roles: ["GARAGE", "TECHNICIEN", "ADMIN"] },
  { href: "/cases", label: "Base de pannes", icon: Database, roles: ["GARAGE", "TECHNICIEN", "ADMIN"] },
  { href: "/search", label: "Recherche technique", icon: Search, roles: ["GARAGE", "TECHNICIEN", "ADMIN"] },
  { href: "/equipment", label: "Parc matériel", icon: Boxes, roles: ["GARAGE", "TECHNICIEN", "ADMIN"] },
  { href: "/alerts", label: "Alertes nationales", icon: Bell, roles: ["TECHNICIEN", "ADMIN"] },
  { href: "/stats", label: "Statistiques", icon: BarChart3, roles: ["GARAGE", "TECHNICIEN", "ADMIN"] },
  { href: "/admin", label: "Administration", icon: ShieldCheck, roles: ["ADMIN"] },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role ?? "GARAGE";

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-card/60 backdrop-blur lg:flex">
      <div className="flex h-16 items-center border-b px-5">
        <Link href="/"><Logo /></Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.filter((n) => n.roles.includes(role)).map((n) => {
          const active = pathname === n.href || (n.href !== "/tickets" && pathname.startsWith(n.href));
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-profil-blue text-white shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <n.icon className="h-[18px] w-[18px]" />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <div className="mb-2 flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-profil-rose text-sm font-semibold text-white">
            {initials(session?.user?.name ?? "PP")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{session?.user?.name ?? "Utilisateur"}</p>
            <p className="truncate text-xs text-muted-foreground">{role}</p>
          </div>
          <ThemeToggle />
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <LogOut className="h-[18px] w-[18px]" /> Déconnexion
        </button>
      </div>
    </aside>
  );
}
