# Canhões do Ano

App full-stack em Next.js para o ritual anual dos Canhões: mural social, propostas e nomeações, votação oficial, amigo secreto com wishlist e gala de resultados. O browser, a API (`app/api`), a autenticação (NextAuth) e a base de dados (Prisma + PostgreSQL) vivem todos neste projeto.

A documentação do negócio, dos requisitos e da arquitetura, com diagramas UML, está em [`docs/`](docs/README.md).

## Stack

Next.js 16 (App Router) com React 19 e TypeScript 6, Tailwind CSS 4, Prisma 7 (adaptador `pg`) + PostgreSQL, NextAuth v4 e TanStack Query. Qualidade com ESLint 9 em flat config (`eslint-config-next`) e Vitest.

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
npm run dev                              # https://localhost:3000/canhoes (certificado local do Next)
```

Os scripts usam o `docker` se existir e senão o `podman`; `CONTAINER_ENGINE=podman npm run db:up` força o Podman. Se o `podman compose` disser que não consegue ligar ao "Docker daemon", está a usar o plugin do docker-compose: `export PODMAN_COMPOSE_PROVIDER=podman-compose` (os scripts `db:*` já o fazem). A CI corre exatamente estes passos com Docker e com Podman (job "Local setup").

Com `DEV_AUTH_BYPASS_ENABLED=true` (o valor do `.env.example`), a app entra sozinha como o admin definido em `DEV_AUTH_EMAIL`/`DEV_AUTH_NAME`. Este modo nunca funciona com `NODE_ENV=production`.

O login Google precisa de `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`, com o redirect URI `https://localhost:3000/api/auth/callback/google` registado na Google. O `npm run dev` usa HTTPS local com um certificado autoassinado; na primeira visita, aceita o aviso do browser. Também há contas com password, criadas por convite de um admin.

### Ligar à base de dados

| Campo | Valor |
| --- | --- |
| Host e porta | `localhost:5433` |
| Base de dados | `canhoes` (testes: `canhoes_test`) |
| Utilizador / password | `canhoes` / `canhoes_local` (os valores `POSTGRES_*` do `.env`) |
| URL | `postgresql://canhoes:canhoes_local@localhost:5433/canhoes` |

Serve para o DBeaver, pgAdmin ou o `psql`. Sem instalar nada: `npm run db:studio` (Prisma Studio no browser) ou `podman exec -it canhoes-postgres psql -U canhoes` (troca `podman` por `docker` se for o caso).

## Produção (Vercel + Neon)

O projeto está configurado para deploy contínuo na [Vercel](https://vercel.com) com PostgreSQL gerido no [Neon Serverless](https://neon.tech) e envio de emails transacionais via [Resend](https://resend.com) no domínio `canhoes.lol`.

- Cada merge ou push para `main` dispara automaticamente o build e deploy na Vercel.
- As migrações **não** correm no deploy: aplicam-se à mão, antes de fundir, com `npx prisma migrate deploy` (ver [`docs/09-deploy.md`](docs/09-deploy.md) §4).
- Guia detalhado de configuração de DNS, variáveis de ambiente e produção: [`docs/09-deploy.md`](docs/09-deploy.md).

## Fluxo de Desenvolvimento e Validação

Antes de propor ou submeter alterações para `main`, executa a validação de qualidade:

### 1. Trabalhar e testar localmente

```bash
npm run dev
```

Abre `https://localhost:3000/canhoes`. O HTTPS local usa um certificado autoassinado; aceita o aviso do browser na primeira visita.

### 2. Portão de Qualidade

Antes de publicar qualquer alteração:

```bash
npm run format:check
npm run lint
npx tsc --noEmit
npm test
npm run test:component
npm run knip
npm run build
```

Para uma alteração apenas de documentação, não é necessário correr a suite completa; confirma o diff e os links/caminhos alterados:

```bash
git diff --check
git diff -- README.md docs/
```

### 2. Rever e guardar a alteração no Git

```bash
git status --short
git diff --check
git diff
```

Adiciona apenas os ficheiros pretendidos:

```bash
git add <ficheiros-alterados>
git diff --cached --check
git diff --cached --stat
```

Nunca adiciones estes ficheiros:

```text
.env
.env.server
backups/
.data/
```

Faz o commit com uma mensagem em inglês:

```bash
git commit -m "Describe the change briefly

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### 3. Enviar para o GitHub e Deploy

```bash
git push origin <tua-branch>
```

Ao abrir e fundir o Pull Request em `main`:
- A Vercel deteta a alteração e executa o build de produção (`npm run build`).
- As migrações já têm de estar aplicadas na base de dados Neon (à mão, `npx prisma migrate deploy`, antes de fundir; ver [`docs/09-deploy.md`](docs/09-deploy.md) §4).
- A aplicação fica disponível em `https://canhoes.lol`.

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

O Prisma 7 gera o client em TypeScript para `lib/generated/prisma` (fora do Git). O `npm install` gera-o; depois de mudar o schema, corre `npx prisma generate`. A configuração (schema, migrations, seed e `DATABASE_URL`) está em `prisma.config.ts`, e o seed corre com `tsx`.

Numa base de dados que já existia antes das migrations Prisma, corre `npm run db:baseline -- --existing-database` uma única vez antes de `db:migrate`, e só depois de fazer e verificar um backup.

## Uploads

Por omissão os ficheiros ficam em `.data/uploads`, fora do Git; `UPLOADS_DIR` muda o diretório. Os nomes são gerados no servidor, a escrita é atómica, os caminhos são validados e só são aceites JPEG, PNG, GIF e WebP até 10 MB.

As stories (imagens que desaparecem ao fim de 24 horas) aceitam só JPEG, PNG e WebP até 4 MB, guardam-se em `stories/<eventId>/` e não se servem por `/uploads`: vêm da rota autenticada do evento, sem cache. Um cron diário apaga as expiradas (ver `docs/09-deploy.md`, que também diz como configurar `CRON_SECRET` e a lifecycle do R2).

## Pastas

| Pasta | O que tem |
|---|---|
| `app/` | Páginas (`app/canhoes`) e API (`app/api`) |
| `components/` | Interface partilhada: `chrome` (cabeçalho, dock e menu), `animations`, `providers` (sessão e TanStack Query) e `ui` (componentes base) |
| `lib/` | Lógica: `domains/<área>` (componentes, hooks, regras e serviços de cada área), `api` (cliente, guards, rotas, rate limit), `repositories`, `zod`, `storage` e `logger.ts` |
| `prisma/` | Schema, migrations e seed |
| `scripts/` | Base de dados local (`db.mjs`), scripts de seed e utilitários de limpeza |
| `tests/` | `integration/` (route handlers contra PostgreSQL) e `component/` (fixtures, MSW e mocks dos testes de componentes) |
| `docs/` | Negócio, requisitos, arquitetura e operação |
| `public/` | Ícone e imagem de partilha |
| `.github/`, `.zap/` | CI, Dependabot e as regras do scan de segurança |

Tudo o resto que aparece na pasta é local e não vai para o Git. Para ver o que é, corre `git status --short --ignored`:

- **Podes apagar sempre:** `node_modules/` (volta com `npm install`), `.next/` e `next-env.d.ts` (voltam com `npm run dev` ou `npm run build`), `coverage/` e `tsconfig.tsbuildinfo`.
- **Não apagues:** `.env` e `.env.server` (as tuas configurações), `.data/` (imagens enviadas em desenvolvimento) e `backups/` (dumps da base de dados).
- `.claude/`, `.agents/` e `skills/` são de ferramentas de IA locais.

## Qualidade

```bash
npm run lint
npx tsc --noEmit
npm test
npm run test:component     # componentes e hooks em jsdom
npm run test:integration   # precisa de PostgreSQL com uma base de dados canhoes_test
npm run test:e2e           # browser (Playwright): precisa de DATABASE_URL com seed
npm run knip
npm run build
```

Antes de cada push corre `scripts/quality-gate.sh` (ativa o hook com `git config core.hooksPath scripts/git-hooks`; ver `docs/07-operacao.md`).

`npm run test:coverage` corre os três tipos de teste com cobertura (`coverage/lcov.info`) e precisa do PostgreSQL de testes. Falha se a cobertura descer abaixo dos mínimos em `vitest.config.mjs`.
As regras de arquitetura, tamanho e textos estão em `docs/03-arquitetura.md`.

### Onde ver code smells, bugs e vulnerabilidades

O projeto não usa SonarQube (foi removido por nunca ter sido configurado). As mesmas regras correm no ESLint, através do `eslint-plugin-sonarjs`:

| O quê | Onde ver |
| --- | --- |
| Code smells, bugs prováveis, complexidade e tamanho | `npm run lint` no terminal, ou sublinhado no editor com a extensão ESLint. Regras em `eslint.config.mjs` |
| Erros de tipos | `npx tsc --noEmit` |
| Código, exports e dependências mortos | `npm run knip` |
| Cobertura de testes | `npm run test:coverage`: resumo no terminal e `coverage/lcov.info` (abre-se com a extensão Coverage Gutters ou similar) |
| Dependências com vulnerabilidades | `npm audit --omit=dev` |
| Vulnerabilidades da app a correr (OWASP ZAP) | No GitHub: separador **Actions** → corrida do CI → job "Docker image, migrations and OWASP ZAP baseline" → passo "OWASP ZAP baseline scan". Alertas aceites em `.zap/rules.tsv` |

No GitHub, cada push mostra no separador **Actions** qual destas verificações falhou; abre o job e o passo vermelho para ver o detalhe.

Os testes de integração chamam os route handlers contra uma base de dados real, que é limpa antes de cada teste; por isso só correm numa base de dados cujo nome acaba em `_test` (`TEST_DATABASE_URL`, por omissão `canhoes_test` em localhost:5433). O `npm run db:up` cria-a. Se mudaste `POSTGRES_PASSWORD` no `.env`, define também `TEST_DATABASE_URL` com essa password.

O CI (`.github/workflows/ci.yml`) corre tudo isto em cada push e PR, mais `shellcheck` aos scripts, `npm audit` às dependências de produção e um scan OWASP ZAP à app.
