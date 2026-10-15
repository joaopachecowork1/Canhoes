# Canhões do Ano

App full-stack em Next.js para o ritual anual dos Canhões: mural social, propostas e nomeações, votação oficial, amigo secreto com wishlist e gala de resultados. O browser, a API (`app/api`), a autenticação (NextAuth) e a base de dados (Prisma + PostgreSQL) vivem todos neste projeto.

A documentação do negócio, dos requisitos e da arquitetura, com diagramas UML, está em [`docs/`](docs/README.md).

## Stack

Next.js 16 (App Router) com React 18 e TypeScript, Tailwind CSS 4, Prisma 6 + PostgreSQL, NextAuth v4 e TanStack Query. Qualidade com ESLint 9 em flat config (`eslint-config-next`) e Vitest.

## Requisitos

- Node.js 22+ e npm
- Docker ou Podman. Com Podman, o `podman compose` precisa do `podman-compose` instalado (ver abaixo).

## Arranque local (desenvolvimento)

A base de dados corre num contentor e a app corre no teu PC com `npm run dev`, que tem o login de desenvolvimento. Com Podman em Linux:

```bash
sudo dnf install podman podman-compose   # Ubuntu/Debian: sudo apt install podman podman-compose
cp .env.example .env                     # preencher NEXTAUTH_SECRET: openssl rand -base64 32
npm install
npm run db:up                            # PostgreSQL em localhost:5433, com as bases canhoes e canhoes_test
npm run db:migrate
npm run db:seed                          # admins + dados de demonstração
npm run dev                              # http://localhost:3000/canhoes
```

Os scripts usam o `docker` se existir e senão o `podman`; `CONTAINER_ENGINE=podman npm run db:up` força o Podman. A CI corre exatamente estes passos com Docker e com Podman (job "Local setup").

Com `DEV_AUTH_BYPASS_ENABLED=true` (o valor do `.env.example`), a app entra sozinha como o admin definido em `DEV_AUTH_EMAIL`/`DEV_AUTH_NAME`. Este modo nunca funciona com `NODE_ENV=production`.

O login Google precisa de `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`, com o redirect URI `http://localhost:3000/api/auth/callback/google` registado na Google. Também há contas com password, criadas por convite de um admin.

### Ligar à base de dados

| Campo | Valor |
| --- | --- |
| Host e porta | `localhost:5433` |
| Base de dados | `canhoes` (testes: `canhoes_test`) |
| Utilizador / password | `canhoes` / `canhoes_local` (os valores `POSTGRES_*` do `.env`) |
| URL | `postgresql://canhoes:canhoes_local@localhost:5433/canhoes` |

Serve para o DBeaver, pgAdmin ou o `psql`. Sem instalar nada: `npm run db:studio` (Prisma Studio no browser) ou `podman exec -it canhoes-postgres psql -U canhoes` (troca `podman` por `docker` se for o caso).

## Stack completa em contentores

```bash
podman compose up -d --build --force-recreate       # app em http://localhost:3000, PostgreSQL em localhost:5433
docker compose up -d --build                        # o mesmo com Docker
```

Pára antes o `npm run dev`, porque os dois usam a porta 3000. O contentor `web` lê o `.env`, aplica as migrations com `prisma migrate deploy` (`scripts/docker-start.sh`), corre o seed e arranca o servidor. Em produção o seed só cria os admins de `ADMIN_EMAILS` e o evento, e nunca mexe na fase de um evento que já existe; os dados de demonstração só entram com `SEED_DEMO_DATA=true`. As imagens enviadas ficam no volume `canhoes_uploads`. Dentro do contentor não há login de desenvolvimento: usa Google ou uma conta por convite. Para testar funcionalidades no dia a dia, usa o arranque local acima.

## Produção

O site corre num PC (ou servidor) com `compose.server.yml` e fica público no teu domínio através de um Cloudflare Tunnel, sem abrir portas no router. Cada merge para `main` é instalado sozinho por `scripts/update-server.sh`, com backup da base de dados antes. Guia passo a passo: [`docs/09-deploy.md`](docs/09-deploy.md).

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
npm run test:integration   # precisa de PostgreSQL com uma base de dados canhoes_test
npm run knip
npm run build
```

Os testes de integração chamam os route handlers contra uma base de dados real, que é limpa antes de cada teste; por isso só correm numa base de dados cujo nome acaba em `_test` (`TEST_DATABASE_URL`, por omissão `canhoes_test` em localhost:5433). O `npm run db:up` cria-a.

O CI (`.github/workflows/ci.yml`) corre tudo isto em cada push e PR, mais `shellcheck` aos scripts, `npm audit` às dependências de produção, um scan OWASP ZAP à app a correr e um deploy de teste com `compose.server.yml`.
