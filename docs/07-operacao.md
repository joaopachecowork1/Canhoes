# 7. Operação

## Configuração

Todas as variáveis estão em `.env.example`, que é o modelo para o `.env`.

| Variável | Obrigatória | Para quê |
|---|---|---|
| `DATABASE_URL` | sim | Ligação ao PostgreSQL |
| `NEXTAUTH_URL` | sim | URL público da app (callbacks de login) |
| `NEXTAUTH_SECRET` | sim | Assina os JWT de sessão (`openssl rand -base64 32`) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | para login Google | Redirect URI `<NEXTAUTH_URL>/api/auth/callback/google` |
| `ADMIN_EMAILS` | recomendado | Emails que o seed cria como admins, separados por vírgulas |
| `SEED_DEMO_DATA` | não | `true` para criar membros, categorias e posts falsos; por omissão só fora de produção |
| `UPLOADS_DIR` | não | Pasta dos uploads (por omissão `.data/uploads`) |
| `AUTH_TRUST_HOST` | atrás de proxy | Constrói os URLs de auth a partir do host reencaminhado |
| `CANHOES_INTERNAL_URL` | atrás de proxy | URL com que as páginas de servidor chamam a própria API (por omissão `http://localhost:3000`) |
| `DEV_AUTH_BYPASS_ENABLED`, `DEV_AUTH_EMAIL`, `DEV_AUTH_NAME` | só em desenvolvimento | Login automático como admin; ignorado em produção |

## Comandos

```bash
npm run dev                # app em http://localhost:3000/canhoes
npm run lint               # ESLint
npx tsc --noEmit           # tipos
npm test                   # testes unitários (Vitest)
npm run test:integration   # route handlers contra PostgreSQL (base canhoes_test)
npm run knip               # exports, ficheiros e dependências mortos
npm run build              # build de produção (output standalone)
```

## Testes

| Tipo | Onde | O que cobre |
|---|---|---|
| Unitários | `**/*.test.ts` ao lado do código | Regras puras: sorteio, resultados, política de admins, quem entra com Google, validação, uploads, proxy |
| Integração | `tests/integration/*.int.test.ts` | Route handlers reais contra PostgreSQL: autorização de todas as rotas, regras de fase e voto, posse de recursos, sorteio, login Google |
| Segurança | CI, job Docker | OWASP ZAP baseline contra a imagem a correr; `npm audit` das dependências de produção |

Os testes de integração exigem uma base de dados cujo nome termina em `_test`, porque cada ficheiro a esvazia (`tests/integration/setup/globalSetup.ts`).

## CI

`.github/workflows/ci.yml` corre em cada PR e em cada push para `main`:

| Job | Passos |
|---|---|
| Lint, types, unit tests, knip, audit | `npm ci`, lint, `tsc`, testes unitários, knip, `shellcheck` dos scripts, `npm audit --omit=dev` |
| Integration and authorization tests | Testes de integração contra um PostgreSQL 17 de serviço |
| Docker image, migrations and OWASP ZAP | Build da imagem, arranque contra uma base vazia (migrations + seed), verificação de que o seed de produção não cria dados de demonstração, varrimento ZAP |
| Home server deploy | Corre `scripts/update-server.sh` duas vezes com `compose.server.yml`: instalação limpa e redeploy, com backup e dados preservados |

O ZAP falha o build com qualquer alerta que não esteja triado em `.zap/rules.tsv`. O Dependabot (`.github/dependabot.yml`) propõe todas as semanas atualizações de npm, das GitHub Actions e da imagem base.

## Docker

```bash
docker compose up -d --build   # app em :3000 e PostgreSQL em :5433
```

O arranque do contentor (`scripts/docker-start.sh`):

1. `prisma migrate deploy` aplica as migrations pendentes. Uma base antiga criada com `db push` é marcada como baseline uma única vez.
2. `node prisma/seed.mjs` garante os admins de `ADMIN_EMAILS` e o evento; nunca muda a fase de um evento que já existe.
3. `node server.js` arranca o servidor standalone do Next.js.

A imagem tem um `HEALTHCHECK` em `/api/health`, que responde 503 quando a base de dados não responde.

## Logs e debugging

A app escreve tudo para o stdout do contentor através de `lib/logger.ts`, uma entrada por linha:

```
<hora UTC> <NÍVEL> <mensagem> {contexto em JSON}
```

| O que aparece | Nível |
|---|---|
| Pedidos que escrevem (POST, PUT, PATCH, DELETE) e qualquer resposta 4xx | `INFO` |
| Leituras com sucesso (feed, imagens) | `DEBUG` |
| Erros 500, com a mensagem, a stack e o `requestId` | `ERROR` |
| Erros do browser em produção (via `/api/telemetry/log`), com o prefixo `Browser:` | `WARN` / `ERROR` |
| Falhas do NextAuth, com o prefixo `NextAuth` (por exemplo `NextAuth OAUTH_CALLBACK_ERROR`) | `ERROR` |
| Migrations e seed, no arranque do contentor | texto simples |

`LOG_LEVEL` (`debug`, `info`, `warn`, `error`) define o nível mínimo; por omissão é `info` em produção e `debug` em desenvolvimento. Cada resposta da API tem um header `X-Request-Id`, e um erro 500 traz o mesmo `requestId` no corpo: é por ele que se encontra no log o erro que um utilizador viu.

Comandos, em desenvolvimento (`docker-compose.yml`). Com Podman, troca `docker` por `podman`:

```bash
docker compose ps                                  # estado e health de cada contentor
docker compose logs -f web                         # seguir os logs da app
docker compose logs --since 1h web | grep ERROR    # só os erros da última hora
docker compose logs web | grep a1b2c3d4            # tudo o que aconteceu num pedido
docker compose logs postgres                       # logs da base de dados
curl -s localhost:3000/api/health                  # app e base de dados a responder?
docker compose exec postgres psql -U canhoes       # consola SQL
```

No servidor (`compose.server.yml`), os contentores chamam-se `canhoes-server-*`:

```bash
docker logs -f canhoes-server-web                  # app
docker logs canhoes-server-tunnel                  # túnel do Cloudflare (erros 1033 e 502)
journalctl --user -u canhoes-update -f             # cada deploy: backup, build, health
curl -s 127.0.0.1:3100/api/health
```

Para ver mais detalhe temporariamente, põe `LOG_LEVEL=debug` no `.env` (ou `.env.server`) e recria o contentor (`docker compose up -d web`, ou `scripts/update-server.sh --force` no servidor).

## Deploy

O site corre num PC (ou num servidor alugado) com `compose.server.yml`, publicado no domínio através de um Cloudflare Tunnel. Cada merge para `main` é instalado automaticamente por `scripts/update-server.sh`. O guia completo, do domínio aos backups, está em [09-deploy.md](09-deploy.md).

Para correr numa plataforma gerida, sem servidor próprio, a app precisaria de três coisas fora do contentor:

| Precisa de | Hoje | Numa plataforma gerida |
|---|---|---|
| PostgreSQL | Contentor ao lado da app | Uma base gerida, como Neon ou Supabase |
| Ficheiros enviados | Volume em disco (`UPLOADS_DIR`) | Armazenamento de objetos, como o R2; `lib/storage/localStorage.ts` é o único ponto a trocar |
| Rate limit | Memória do processo | Só vale por instância; aceitável para um grupo pequeno |

Antes de abrir ao público falta também a Content-Security-Policy (ver [08-lacunas.md](08-lacunas.md)).
