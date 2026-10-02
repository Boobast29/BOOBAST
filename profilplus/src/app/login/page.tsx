"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) setError("Identifiants invalides.");
    else router.push("/tickets");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-profil-light p-6 dark:bg-background">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="items-center text-center">
          <Logo className="mb-2" />
          <CardTitle className="text-2xl">Connexion sécurisée</CardTitle>
          <CardDescription>Accédez au support diagnostic Profil+</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@garage.fr" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Mot de passe</label>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Connexion…" : "Se connecter"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> OU <div className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={() => signIn("azure-ad", { callbackUrl: "/tickets" })}>
            Continuer avec Microsoft 365
          </Button>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Comptes de démo (après seed) : garage@profilplus.fr / tech@profilplus.fr / admin@profilplus.fr — mot de passe <b>profilplus</b>
          </p>
          <p className="mt-2 text-center text-sm">
            <Link href="/" className="text-primary hover:underline">← Retour à l&apos;accueil</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
