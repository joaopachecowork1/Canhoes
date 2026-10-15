# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Canhões do Ano

App full-stack em Next.js 16 (App Router, React 18, TypeScript, Tailwind 4), com Prisma + PostgreSQL e NextAuth v4. ESLint em flat config (`eslint-config-next`) e Vitest. Não há backend separado: a API vive em `app/api`. Setup local: ver `README.md`.

## Idioma

- Respostas e texto de UI em português de Portugal; código, nomes e commits em inglês.

## Comandos

```bash
npm run db:up          # PostgreSQL (Docker ou Podman) em localhost:5433
npm run db:migrate && npm run db:seed
npm run dev            # http://localhost:3000/canhoes (login de dev automático)
npm run lint
npx tsc --noEmit
npm test               # vitest, testes unitários de lógica pura
npm run test:integration  # route handlers contra PostgreSQL real (base de dados canhoes_test, ver tests/integration)
npm run knip           # exports, ficheiros e dependências mortos
npm run build
docker compose up -d --build   # stack completa; com Podman: podman compose up -d --build --force-recreate
```

Antes de dar algo por terminado: `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run test:integration` e `npm run knip` (o CI corre todos).

## Prioridades

1. **Sem commits automáticos** — nunca faças `git commit` sem indicação explícita. Apresenta o plano, propõe o código e aguarda sempre a minha aprovação.
2. **Legibilidade e escalabilidade** — escreve código limpo, modular e de fácil leitura. Evita aninhamento profundo e ficheiros gigantes; separa responsabilidades em funções ou componentes pequenos e bem definidos para que o projeto cresça de forma sustentável.
3. **Simplifica** — menos código, sem abstrações prematuras, sem código morto, sem dependências novas sem justificação.
4. **Mobile-first** — estilos base para 375px, breakpoints só para expandir (`flex-col md:flex-row`); touch targets ≥ 44px; texto de conteúdo ≥ 16px; bottom sheets em vez de modais centrados.
5. **Nomes honestos** — `handle<Ação>`, booleans `is/has/can/should`, hooks `use<Recurso>`; nada de `data`, `temp`, `item` genéricos. O nome de um ficheiro diz o que ele exporta.
6. **Refactoring não muda comportamento.** Se tiver de mudar, avisa.

## Arquitetura — o que não é óbvio

- **Camadas:** UI (`components/`, `lib/domains/*/components`) → repositórios de cliente (`lib/repositories/*`, via `canhoesFetch` em `lib/api/canhoesClient.ts`, que chama `/api/...`) → route handlers (`app/api/v1/events/[eventId]/…`) → serviços de servidor com Prisma (`lib/domains/*/services`). Tipos partilhados em `lib/api/types.ts`; validação de input com Zod em `lib/zod/`.
- **Estado no cliente:** TanStack Query. Depois de uma escrita, invalida as queries em vez de copiar estado à mão.
- **Route handlers:** finos e todos iguais — `apiRoute` + `requireUser`/`requireAdmin`/`requireEventAccess`/`requireModule`/`requireProposalsOpen` (`lib/api/guards.ts`) + `readJson(schema)`/`readPaging` (`lib/api/route.ts`) + uma chamada ao serviço. Para parar com um erro, lança um `HttpError` (`lib/api/httpError.ts`); erros de domínio que o cliente pode tratar estendem-no. O resto vira um 500 com log.
- **Auth:** NextAuth com Google, credenciais (email + password com bcrypt, para contas criadas por convite em `/api/admin/invites` → `/canhoes/register`) e, só fora de produção, o provider `development` (`DEV_AUTH_BYPASS_ENABLED=true`). O callback `jwt` relê o `User` da BD em cada pedido; o admin é só `User.isAdmin`. Google só deixa entrar admins, membros e quem tem um convite aberto para esse email (`signInAccess.ts`). `requireEventAccess` exige ser membro do evento; `requireModule` e `requireProposalsOpen` aplicam no servidor as mesmas regras de fase que o overview mostra na UI (`lib/domains/event/services/eventRules.ts`). Admins passam sempre. Toda a rota nova fica coberta pela matriz de autorização em `tests/integration/authorization.int.test.ts`.
- **Áreas (módulos):** o registo está em `lib/modules.ts`; a fase em que cada uma abre em `resolveMemberModules` (`eventRules.ts`). A navegação mostra só as áreas abertas, a admins e membros; o admin chega às fechadas em Admin › Evento.
- **Schema:** alterações ao `prisma/schema.prisma` precisam de uma migration em `prisma/migrations` (`npx prisma migrate dev --name <nome>`). A imagem Docker aplica-as no arranque com `prisma migrate deploy` (`scripts/docker-start.sh`); uma base de dados antiga criada com `db push` é marcada como baseline uma única vez.
- **Deploy:** `compose.server.yml` (PostgreSQL, app e Cloudflare Tunnel) num PC ou servidor; `scripts/update-server.sh` instala cada merge para `main` com backup antes. A CI testa-o no job "Home server deploy". Guia em `docs/09-deploy.md`.
- **Uploads:** em disco, em `UPLOADS_DIR` (por defeito `.data/uploads`), servidos por `app/api/uploads/[...path]`; `/uploads/*` é reescrito para lá em `next.config.mjs`.
- **Tailwind 4:** configurado só em CSS (`@import "tailwindcss"` e `@theme` no `app/globals.css`, via `@tailwindcss/postcss`); não há `tailwind.config.js`.
- **Logs:** usa `logger` (`lib/logger.ts`), nunca `console.*` na app. No servidor cada entrada é uma linha `<hora> <NÍVEL> <mensagem> {contexto JSON}`; `LOG_LEVEL` filtra. `apiRoute` já regista cada pedido com um `requestId`.
- **Design system:** tema escuro único (fundo verde-oliva quase preto, texto pergaminho, acentos musgo e amarelo). Os tokens vivem em `app/globals.css` (variáveis `--color-*`, `--bg-*`, `--text-*`, `--border-*`, `--shadow-*`). Usa-os; não metas cores hardcoded.

## Código

- Estado derivado em vez de `useEffect` a sincronizar estado; um estado `status` em vez de vários booleans.
- Sem `any`; narrowing em vez de `as`.
- Animações só com `transform`/`opacity`, ≤ 200 ms em interações, e respeitando `prefers-reduced-motion`.

## Skills

As skills (`npx skills`) são locais e não vão para o Git: `.agents/`, `.claude/` e `skills-lock.json` estão no `.gitignore`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
