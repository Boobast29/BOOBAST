# PROFIL+ SUPPORT DIAGNOSTIC

Plateforme interne de support technique du réseau **Profil+** : valises de
diagnostic, interfaces VCI, outils ADAS, logiciels, programmations, codages,
mises à jour, communication véhicule et équipements atelier connectés.

> Objectif : permettre à un mécanicien en atelier de créer une demande en
> **moins de 2 minutes**, suivre la résolution dans une conversation style
> Teams, et enrichir la **mémoire technique nationale** Profil+.

## ✨ Fonctionnalités

- **Création de demande ultra-simple** (assistant en étapes, < 2 min)
- **Pièces jointes** : photos, captures, vidéos, PDF, rapports (drag & drop +
  prise de photo smartphone)
- **Questions intelligentes** (jamais plus de 5, facultatives)
- **Conversation temps réel** par ticket (style Microsoft Teams)
- **Dashboard technicien Kanban** (Critique / Prioritaire / En cours / Résolu)
  avec drag & drop
- **Rappel garage** historisé (date, heure, durée, compte rendu)
- **Base de connaissances** classée par valise et par marque, recherche
  instantanée
- **Base de pannes nationale** : transformation des tickets résolus en cas
  connus / astuces / procédures / fiches techniques
- **Recherche technique globale** (code défaut, message d'erreur, modèle…)
- **Scoring garage** — *Indice d'Autonomie Profil+* (0 à 100, 5 niveaux)
- **Parc matériel** par garage (valises, versions, n° série, licences)
- **Alertes nationales** automatiques
- **Statistiques** réseau
- **IA intégrée** (résumé, cas similaires, suggestions, procédures)
- **Sécurité** : RBAC, JWT, audit complet, protections CSRF/XSS/SQLi (Prisma)
- **Mode clair / sombre**, responsive desktop / tablette / mobile

## 🧱 Stack technique

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Shadcn UI (Radix) ·
Prisma · PostgreSQL · NextAuth (Credentials + Azure AD / Microsoft 365) ·
Framer Motion · Docker.

## 🎨 Identité visuelle

| Couleur | Hex |
| --- | --- |
| Bleu principal | `#18479C` |
| Rose principal | `#E0006D` |
| Blanc | `#FFFFFF` |
| Gris clair | `#F8FAFC` |
| Gris foncé | `#1E293B` |

## 🚀 Démarrage rapide

### Avec Docker (recommandé)

```bash
cp .env.example .env
docker compose up --build
```

App sur http://localhost:3000 (la base est migrée et alimentée automatiquement).

### En local

```bash
npm install
cp .env.example .env          # renseigner DATABASE_URL + NEXTAUTH_SECRET
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

### Comptes de démonstration (après seed)

| Rôle | Email | Mot de passe |
| --- | --- | --- |
| Administrateur | `admin@profilplus.fr` | `profilplus` |
| Technicien | `tech@profilplus.fr` | `profilplus` |
| Garage | `garage@profilplus.fr` | `profilplus` |

## 📚 Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — architecture, modèle de
  données, arborescence
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — déploiement & exploitation

## 🔐 Microsoft 365

Renseigner `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`
dans `.env` : le bouton « Continuer avec Microsoft 365 » s'active
automatiquement.

## 🤖 IA

Renseigner `ANTHROPIC_API_KEY` pour activer les résumés et suggestions par
l'API Claude. Sans clé, un mode heuristique local prend le relais.
