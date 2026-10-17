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

## Stack completa em contentores

Corre a app e o PostgreSQL em contentores, como em produção:

```bash
podman compose --env-file .env.server up -d --build --force-recreate # app em https://localhost:3000, PostgreSQL em localhost:5433
docker compose --env-file .env.server up -d --build                 # o mesmo com Docker
```

Pára antes o `npm run dev`, porque os dois usam a porta 3000. Esta stack arranca a app, o HTTPS local e o Cloudflare Tunnel para a mesma instância `web`: podes entrar por `https://localhost:3000/canhoes` ou por `https://cachyos-x8664.tail2e04db.ts.net/canhoes`. O contentor `https` termina o TLS local com um certificado interno do Caddy e o túnel encaminha o endereço público para `web:3000`. O token do túnel é lido de `.env.server`.

Não arranques ao mesmo tempo o túnel de `compose.server.yml`: o token do Cloudflare só deve ter uma instância ativa neste PC. Se a stack antiga estiver a correr, pára-a antes:

```bash
docker compose -p canhoes-server -f compose.server.yml --env-file .env.server down
docker compose -p canhoesfe --env-file .env.server up -d --build
```

O contentor `web` lê o `.env`, aplica as migrations com `prisma migrate deploy` (`scripts/docker-start.sh`), corre o seed e arranca o servidor. Em produção o seed só cria os admins de `ADMIN_EMAILS` e o evento, e nunca mexe na fase de um evento que já existe; os dados de demonstração só entram com `SEED_DEMO_DATA=true`. As imagens enviadas ficam no volume `canhoes_uploads`. Dentro do contentor não há login de desenvolvimento: usa Google ou uma conta por convite. Para testar funcionalidades no dia a dia, usa o arranque local acima.

## Produção

O site corre num PC (ou servidor) com `compose.server.yml` e fica público no teu domínio através de um Cloudflare Tunnel, sem abrir portas no router. Cada merge para `main` é instalado sozinho por `scripts/update-server.sh`, com backup da base de dados antes. Guia passo a passo: [`docs/09-deploy.md`](docs/09-deploy.md).

## Fluxo para alterar o projeto e atualizar o Docker

Usa este fluxo sempre que alterares qualquer ficheiro do projeto, incluindo ficheiros `.md`. O Docker público só recebe alterações depois de a versão nova ser enviada para `main` e a imagem ser reconstruída.

### 1. Trabalhar e testar localmente

```bash
cd ~/canhoes-server
npm run dev
```

Abre `https://localhost:3000/canhoes`. O HTTPS local usa um certificado autoassinado; aceita o aviso do browser na primeira visita.

Para alterações de código, corre os testes relevantes. Antes de publicar uma alteração normal:

```bash
npm run lint
npx tsc --noEmit
npm test
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

### 3. Enviar para o GitHub

```bash
git push origin main
```

O `push` não altera o Docker sozinho se o timer de deploy não estiver configurado. O servidor precisa de executar o passo seguinte.

### 4. Atualizar o Docker público

No PC/servidor que corre o site:

```bash
cd ~/canhoes-server
scripts/update-server.sh
```

O script faz backup da base de dados, atualiza para `origin/main`, reconstrói a imagem, recria os containers, aplica migrations e verifica `/api/health`.

Se o checkout já estiver no commit certo, mas quiseres reconstruir na mesma:

```bash
scripts/update-server.sh --force
```

Para acompanhar:

```bash
docker compose -p canhoes-server -f compose.server.yml --env-file .env.server ps
docker logs --tail 100 canhoes-server-web
curl -fsS https://cachyos-x8664.tail2e04db.ts.net/api/health
```

O deploy não apaga posts, votos ou uploads: a base de dados e o volume de uploads são persistentes. Antes de cada deploy o script cria um backup PostgreSQL em `backups/`.

### 5. Confirmar no browser

Depois de o health check passar, abre:

```text
https://cachyos-x8664.tail2e04db.ts.net/canhoes
```

Faz `Ctrl+Shift+R` se o browser ainda mostrar assets antigos. Para alterações de autenticação, confirma também que o `.env.server` continua com o `NEXTAUTH_URL` público correto.

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

## Pastas

| Pasta | O que tem |
|---|---|
| `app/` | Páginas (`app/canhoes`) e API (`app/api`) |
| `components/` | Interface partilhada: `chrome` (navegação), `modules` (páginas de cada módulo), `providers` (sessão e TanStack Query) e `ui` (componentes base) |
| `hooks/` | Hooks React usados por várias páginas |
| `lib/` | Lógica: `domains/<área>` (componentes e serviços de cada área), `api` (cliente, guards, rotas, rate limit), `repositories`, `zod`, `storage` e `logger.ts` |
| `prisma/` | Schema, migrations e seed |
| `scripts/` | Base de dados local (`db.mjs`), arranque do contentor e deploy no servidor |
| `tests/integration/` | Testes dos route handlers contra PostgreSQL |
| `deploy/systemd/` | Timer que instala cada merge no servidor |
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
npm run knip
npm run build
```

`npm run test:coverage` corre os três tipos de teste com cobertura (`coverage/lcov.info`) e precisa do PostgreSQL de testes. Falha se a cobertura descer abaixo dos mínimos em `vitest.config.mjs`.
O CI envia-a ao [SonarQube Cloud](https://sonarcloud.io/project/overview?id=joaopachecowork1_Canhoes),
que mostra code smells, duplicação e cobertura em cada push e PR. As regras de arquitetura, tamanho
e textos estão em `docs/03-arquitetura.md`.

Os testes de integração chamam os route handlers contra uma base de dados real, que é limpa antes de cada teste; por isso só correm numa base de dados cujo nome acaba em `_test` (`TEST_DATABASE_URL`, por omissão `canhoes_test` em localhost:5433). O `npm run db:up` cria-a.

O CI (`.github/workflows/ci.yml`) corre tudo isto em cada push e PR, mais `shellcheck` aos scripts, `npm audit` às dependências de produção, um scan OWASP ZAP à app a correr e um deploy de teste com `compose.server.yml`.
