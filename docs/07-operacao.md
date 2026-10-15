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
| Lint, types, unit tests, knip, audit | `npm ci`, lint, `tsc`, testes unitários, knip, `npm audit --omit=dev` |
| Integration and authorization tests | Testes de integração contra um PostgreSQL 17 de serviço |
| Docker image, migrations and OWASP ZAP | Build da imagem, arranque contra uma base vazia (migrations + seed), verificação de que o seed de produção não cria dados de demonstração, varrimento ZAP |

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

## Deploy

O destino previsto é o Cloudflare. Seja qual for o produto, a app precisa de três coisas fora do servidor:

| Precisa de | Hoje | No Cloudflare |
|---|---|---|
| PostgreSQL | Contentor local | O Cloudflare não aloja PostgreSQL: uma base gerida (por exemplo Neon ou Supabase), ligada direta ou através do Hyperdrive |
| Ficheiros enviados | Disco local (`UPLOADS_DIR`) | O disco não persiste: os uploads têm de passar para o R2 (`lib/storage/localStorage.ts` é o único ponto a trocar) |
| Rate limit | Memória do processo | Só vale por instância; aceitável para um grupo pequeno |

Há dois caminhos possíveis:

- **Cloudflare Containers** corre a imagem Docker que a CI já constrói e testa. É o caminho com menos alterações ao código.
- **Cloudflare Workers** com o adaptador OpenNext corre o Next.js sem contentor. Exige o Prisma com driver adapter, e vale a pena confirmar o suporte ao Next 16 antes de escolher.

Antes de abrir ao público falta também a Content-Security-Policy (ver [08-lacunas.md](08-lacunas.md)).
