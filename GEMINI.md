# AGENTS.md — Canhões do Ano

Orientações e padrões de engenharia para o assistente de programação Antigravity no projeto **Canhões do Ano**.

---

## 1. Stack e Infraestrutura

- **Framework**: Next.js 16 (App Router, Turbopack, React 19, TypeScript 6, Tailwind CSS 4).
- **Base de Dados & ORM**: PostgreSQL (Neon Serverless) + Prisma 7 com `@prisma/adapter-pg`.
- **Autenticação**: NextAuth v4 (Google OAuth + credenciais com bcrypt para membros convidados).
- **Alojamento & Deploy**: Vercel (produção) + Neon (database).
- **Sem backend separado**: Toda a API reside em `app/api/v1/events/[eventId]/...` com route handlers padronizados (`apiRoute` + guards + schemas Zod).

---

## 2. Idioma e Comunicação

- **Respostas ao utilizador e texto de UI**: Sempre em **português de Portugal (PT-PT)**.
- **Textos de UI**: Centralizados em [`messages/pt.json`](file:///home/joaopacheco/Projects/personal/Canhoes/messages/pt.json) (nunca colocar strings fixas soltas no JSX).
- **Código, commits e nomes de funções/ficheiros**: Sempre em **inglês**.

---

## 3. Padrões de Código e Skills Obrigatórias

Aplica ativamente as seguintes diretrizes em todas as tarefas:

### A. Clean Code (`.agents/skills/clean-code`)
- **Responsabilidade única**: Funções e componentes pequenos, focados e modulares.
- **Legibilidade > Esperteza**: Código claro que se explica a si próprio; controlo de fluxo linear sem aninhamentos profundos.
- **Complexidade ciclomática**: Máximo de 10 por função (exigência do ESLint `sonarjs/cognitive-complexity`).
- **Nomes honestos e reveladores**:
  - Manipuladores de eventos: `handle<Ação>`
  - Predicados booleanos: `is<Estado>`, `has<Recurso>`, `can<Ação>`, `should<Condição>`
  - Hooks: `use<Recurso>`
  - Evitar termos vagos como `data`, `item`, `temp`, `helper`, `manager`.
- **Sem código morto**: Manter exports estritamente necessários e verificar com `npm run knip`.

### B. Boas Práticas Vercel & React 19 (`.agents/skills/vercel-react-best-practices`)
- **Server Components por defeito**: Usar `"use client"` apenas nos componentes com estado interativo, hooks do navegador ou eventos.
- **Eliminar waterfalls assíncronos**: Disparar promessas em paralelo (`Promise.all`) sempre que operações forem independentes.
- **Estado de cliente reativo**: Utilizar **TanStack Query** para dados remotos. Após mutações, invalidar queries (`queryClient.invalidateQueries`) em vez de gerir estado manual duplicado.
- **Importações diretas**: Evitar barrel files pesados; importar diretamente dos módulos de origem.

### C. Padrões de Composição Vercel (`.agents/skills/vercel-composition-patterns`)
- **Evitar proliferação de boolean props**: Não criar componentes com `isSmall`, `isPrimary`, `isAlternative`, `isCompact`.
- **Preferir componentes compostos ou subcomponentes**: Separar partes especializadas com contratos claros.

### D. Design System & Acessibilidade (`.agents/skills/web-design-guidelines`)
- **Tema único escuro ("Caderneta de Cromos")**:
  - Usar tokens CSS de [`app/globals.css`](file:///home/joaopacheco/Projects/personal/Canhoes/app/globals.css) (`--color-*`, `--bg-*`, `--text-*`, `--border-*`, `--shadow-*`).
  - Cores por área (`--area-*`) e cores por membro (`--person-*`). Nunca usar cores hardcoded.
- **Mobile-first**: Layouts base pensados para 375px; touch targets mínimos de 44px (`min-h-[44px]` ou `size-11`).
- **Acessibilidade (WCAG)**:
  - Elementos interativos com foco visível (`focus-visible:ring-2 focus-visible:ring-[var(--moss-glow)]`).
  - Textos acessíveis com `sr-only`, `aria-label`, `aria-expanded` e `aria-controls`.
  - Respeitar `prefers-reduced-motion` em animações.

---

## 4. Portão de Qualidade e Verificação Antes de Concluir

Antes de propor a conclusão de qualquer tarefa, executa e valida o conjunto de testes:

```bash
npm run format:check      # Formatação com Prettier
npm run lint              # ESLint sem erros nem avisos
npx tsc --noEmit          # Verificação de tipos TypeScript
npm test                  # Testes unitários de regras de negócio
npm run test:component    # 360+ testes de componentes com jsdom + Testing Library
npm run knip              # Verificação de código morto
npm run build             # Build de produção Next.js (mesmo teste que a Vercel corre)
```

---

## 5. Regra de Ouro: Sem Commits Automáticos

- **Nunca fazer `git commit` sem autorização expressa do utilizador**.
- Apresentar o resumo das alterações e os resultados dos testes e aguardar a validação do utilizador.
