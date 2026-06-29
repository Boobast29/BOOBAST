# Déploiement — PROFIL+ Support Diagnostic

## 1. Docker (production simple)

```bash
cp .env.example .env   # définir NEXTAUTH_SECRET (openssl rand -base64 32)
docker compose up --build -d
```

Le service `app` exécute automatiquement `prisma migrate deploy`, le seed puis
démarre Next.js. Données PostgreSQL et fichiers uploadés sont persistés dans des
volumes Docker (`pgdata`, `uploads`).

## 2. Plateforme managée (Vercel + base externe)

1. Base PostgreSQL managée (Neon, Supabase, RDS…). Récupérer `DATABASE_URL`.
2. Variables d'environnement sur Vercel : `DATABASE_URL`, `NEXTAUTH_URL`,
   `NEXTAUTH_SECRET`, et si besoin `AZURE_AD_*`, `ANTHROPIC_API_KEY`.
3. `npx prisma migrate deploy` au build (déjà inclus dans `npm run build` via
   `prisma generate` ; lancer la migration depuis le pipeline).
4. ⚠️ L'upload local (`/public/uploads`) n'est pas persistant en serverless :
   brancher un stockage objet (S3, Azure Blob, UploadThing) dans
   `src/app/api/upload/route.ts`.

## 3. Variables d'environnement

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | connexion PostgreSQL |
| `NEXTAUTH_URL` | URL publique de l'app |
| `NEXTAUTH_SECRET` | secret de signature JWT |
| `AZURE_AD_CLIENT_ID` / `_SECRET` / `_TENANT_ID` | SSO Microsoft 365 (optionnel) |
| `ANTHROPIC_API_KEY` | IA via API Claude (optionnel) |

## 4. Migrations

```bash
npx prisma migrate dev --name <nom>   # développement
npx prisma migrate deploy             # production
npm run db:seed                       # données initiales
```

## 5. Sauvegardes

- Base : `pg_dump` planifié sur le volume `pgdata`.
- Fichiers : sauvegarder le volume `uploads` (ou le bucket objet).

## 6. Observabilité

Le journal d'audit applicatif est consultable dans **Administration**. Brancher
un APM (Sentry, Datadog) pour les erreurs et les performances.
