# Architecture — PROFIL+ Support Diagnostic

## Vue d'ensemble

Application **Next.js 14 (App Router)** full-stack : le rendu (Server
Components) et l'API (Route Handlers) vivent dans le même projet. Les données
sont stockées dans **PostgreSQL** via **Prisma**. L'authentification est gérée
par **NextAuth** (JWT) avec deux providers : Credentials (email/mot de passe)
et Azure AD (Microsoft 365).

```
Navigateur (mécanicien / technicien / admin)
        │  HTTPS
        ▼
Next.js (App Router)
 ├── Server Components  → lecture directe via Prisma
 ├── Client Components  → assistant ticket, conversation, kanban
 └── Route Handlers /api → tickets, messages, calls, upload, knowledge, search, ai
        │
        ▼
Prisma ORM ──► PostgreSQL
        ▼
Stockage fichiers : /public/uploads (volume Docker)
        ▼
IA : API Claude (optionnelle) — fallback heuristique local
```

## Rôles (RBAC)

| Rôle | Accès |
| --- | --- |
| `GARAGE` | crée des demandes, suit ses tickets, base de connaissances, parc, son score |
| `TECHNICIEN` | tous les tickets, Kanban, rappels, base de pannes, alertes |
| `ADMIN` | tout + administration (utilisateurs, audit) |

La protection est assurée à trois niveaux : middleware (routes), layout serveur
`(app)` (redirection si non connecté), et vérifications de rôle dans chaque
Route Handler.

## Modèle de données (Prisma)

- **User** — utilisateur (rôle, garage, auth).
- **Garage** — fiche garage + `autonomyScore` / `level` (Indice d'Autonomie).
- **Equipment** — parc matériel (valise, version, n° série, licence).
- **Ticket** — la demande (garage, valise, véhicule, immobilisation,
  description, réponses aux questions intelligentes, résumé IA, statut, urgence).
- **Attachment** — pièce jointe (liée à un ticket ou à un message).
- **Message** — messagerie temps réel par ticket.
- **CallLog** — rappel garage historisé.
- **KnowledgeArticle** — base de connaissances + base de pannes nationale.
- **NationalAlert** — alertes nationales.
- **AuditLog** — journal d'audit.
- **Account / Session** — tables NextAuth.

Voir [`prisma/schema.prisma`](../prisma/schema.prisma).

## Arborescence

```
profilplus/
├── prisma/
│   ├── schema.prisma          # modèle de données
│   └── seed.ts                # données de démo
├── src/
│   ├── app/
│   │   ├── page.tsx           # accueil
│   │   ├── login/             # connexion
│   │   ├── (app)/             # zone authentifiée (sidebar)
│   │   │   ├── tickets/       # liste, création (assistant), détail (conversation)
│   │   │   ├── board/         # Kanban technicien
│   │   │   ├── knowledge/     # base de connaissances
│   │   │   ├── cases/         # base de pannes nationale
│   │   │   ├── search/        # recherche technique
│   │   │   ├── equipment/     # parc matériel
│   │   │   ├── alerts/        # alertes nationales
│   │   │   ├── stats/         # statistiques + scoring
│   │   │   └── admin/         # administration
│   │   └── api/               # tickets, messages, calls, upload, knowledge, search, ai, auth
│   ├── components/            # UI (shadcn), sidebar, logo, conversation, kanban…
│   ├── lib/                   # prisma, auth, ai, scoring, constants, utils
│   └── types/                 # types NextAuth
├── Dockerfile
├── docker-compose.yml
└── docs/
```

## Scoring — Indice d'Autonomie Profil+

Calculé dans [`src/lib/scoring.ts`](../src/lib/scoring.ts). Chaque ticket
applique un delta (photos, qualité de description, complétude, réactivité ;
malus pour tickets incomplets/inutiles). Le score (0–100) détermine le niveau :
Débutant → Intermédiaire → Confirmé → Avancé → Expert. **Analyse interne
uniquement, aucune sanction.**

## Temps réel

La conversation utilise un polling léger (5 s) côté client. Pour du vrai temps
réel, brancher un canal WebSocket/SSE (Pusher, Ably ou socket.io) sur les mêmes
Route Handlers.

## Sécurité

- **RBAC** + **JWT** (NextAuth).
- **SQL Injection** : requêtes paramétrées via Prisma.
- **XSS** : échappement par défaut de React, pas de `dangerouslySetInnerHTML`.
- **CSRF** : protection intégrée NextAuth + cookies SameSite.
- **Audit** : `AuditLog` sur les actions sensibles.
- **Validation** des entrées API via Zod.
