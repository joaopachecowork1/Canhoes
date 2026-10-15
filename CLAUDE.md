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
npm test               # vitest (testes unitários de lógica pura)
npm run build
docker compose up -d --build   # stack completa; com Podman: podman compose up -d --build --force-recreate
```

Antes de dar algo por terminado: `npm run lint`, `npx tsc --noEmit` e `npm test`.

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
- **Route handlers:** finos e todos iguais — `apiRoute` + `requireUser`/`requireAdmin`/`requireEventAccess` (`lib/api/guards.ts`) + `readJson(schema)`/`readPaging` (`lib/api/route.ts`) + uma chamada ao serviço. Para parar com um erro, lança um `HttpError` (`lib/api/httpError.ts`); erros de domínio que o cliente pode tratar estendem-no. O resto vira um 500 com log.
- **Auth:** NextAuth com Google, credenciais (email + password com bcrypt, para contas criadas por convite em `/api/admin/invites` → `/canhoes/register`) e, só fora de produção, o provider `development` (`DEV_AUTH_BYPASS_ENABLED=true`). O callback `jwt` relê o `User` da BD em cada pedido; o admin é só `User.isAdmin`. `requireEventAccess` só exige que o evento tenha `CanhoesEventState` (admins passam sempre): a visibilidade por módulo vem do overview e é aplicada na UI.
- **Schema:** alterações ao `prisma/schema.prisma` precisam de uma migration em `prisma/migrations` (`npx prisma migrate dev --name <nome>`). Atenção: a imagem Docker arranca com `prisma db push --accept-data-loss`, não com `migrate deploy`.
- **Uploads:** em disco, em `UPLOADS_DIR` (por defeito `.data/uploads`), servidos por `app/api/uploads/[...path]`; `/uploads/*` é reescrito para lá em `next.config.mjs`.
- **Tailwind 4:** configurado em CSS (`@import "tailwindcss"` no `app/globals.css`, via `@tailwindcss/postcss`); o `tailwind.config.js` ainda é carregado com `@config`.
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
