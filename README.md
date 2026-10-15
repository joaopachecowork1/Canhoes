# Canhões do Ano

App full-stack em Next.js para o ritual anual dos Canhões: mural social, propostas e nomeações, votação oficial, amigo secreto com wishlist e gala de resultados. O browser, a API (`app/api`), a autenticação (NextAuth) e a base de dados (Prisma + PostgreSQL) vivem todos neste projeto.

## Stack

Next.js 16 (App Router) com React 18 e TypeScript, Tailwind CSS 4, Prisma 6 + PostgreSQL, NextAuth v4 e TanStack Query. Qualidade com ESLint 9 em flat config (`eslint-config-next`) e Vitest.

## Requisitos

- Node.js 20+ e npm
- Docker ou Podman. Com Podman, o `podman compose` precisa de um provider: `pip install --user podman-compose` (ou `sudo dnf install podman-compose`).

## Arranque local (desenvolvimento)

```bash
cp .env.example .env     # preencher NEXTAUTH_SECRET: openssl rand -base64 32
npm install
npm run db:up            # PostgreSQL em localhost:5433
npm run db:migrate
npm run db:seed          # admins + dados de demonstração
npm run dev              # http://localhost:3000/canhoes
```

Com `DEV_AUTH_BYPASS_ENABLED=true` (o valor do `.env.example`), a app entra sozinha como o admin definido em `DEV_AUTH_EMAIL`/`DEV_AUTH_NAME`. Este modo nunca funciona com `NODE_ENV=production`.

O login Google precisa de `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`, com o redirect URI `http://localhost:3000/api/auth/callback/google` registado na Google. Também há contas com password, criadas por convite de um admin.

## Stack completa em contentores

```bash
docker compose up -d --build                        # app em http://localhost:3000, PostgreSQL em localhost:5433
podman compose up -d --build --force-recreate       # o mesmo com Podman
docker compose --profile tunnel up -d               # + túnel público ngrok (precisa de NGROK_AUTHTOKEN)
```

O contentor `web` lê o `.env`, aplica o schema com `prisma db push`, corre o seed e arranca o servidor. As imagens enviadas ficam no volume `canhoes_uploads`. Dentro do contentor não há login de desenvolvimento: usa Google ou uma conta por convite.

## Base de dados

O PostgreSQL é definido no `docker-compose.yml` e guarda os dados no volume `canhoes_postgres_data`. Os scripts funcionam com Docker ou Podman (`CONTAINER_ENGINE` força um deles).

```bash
npm run db:up                       # iniciar PostgreSQL e esperar que aceite ligações
npm run db:migrate                  # aplicar as migrations Prisma
npm run db:seed                     # seed idempotente
npm run db:backup                   # pg_dump para backups/
npm run db:restore -- <ficheiro>    # restaurar um dump (apaga os objetos existentes)
npm run db:studio                   # Prisma Studio
npm run db:down                     # parar os contentores (os dados ficam no volume)
```

Alterações ao `prisma/schema.prisma` precisam de uma migration: `npx prisma migrate dev --name <nome>`.

Numa base de dados que já existia antes das migrations Prisma, corre `npm run db:baseline -- --existing-database` uma única vez antes de `db:migrate`, e só depois de fazer e verificar um backup.

## Uploads

Por omissão os ficheiros ficam em `.data/uploads`, fora do Git; `UPLOADS_DIR` muda o diretório. Os nomes são gerados no servidor, a escrita é atómica, os caminhos são validados e só são aceites JPEG, PNG, GIF e WebP até 10 MB.

## Qualidade

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```
