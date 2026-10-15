# Auditoria técnica e de UX — Canhões do Ano

> Data: 2026-10-06 · Âmbito: todo o repositório (289 ficheiros versionados, sem `public/` nem migrations).
> As referências `ficheiro:linha` dizem respeito à **working tree atual**, que inclui a migração ainda não commitada para Next 16.3 + Tailwind 4.3 (`package.json`, `postcss.config.cjs`, `app/globals.css`, `eslint.config.mjs`, `tsconfig.json`).
> Nenhum código foi alterado.

**Estado das verificações no momento da auditoria**

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ sem erros |
| `npm run lint` | ✅ sem erros, mas as regras de React Hooks e de Next deixaram de correr (ver §4.6) |
| `npm test` | ❌ 1 falha (63/64): o Vitest corre as cópias antigas dos testes em `.next/standalone/**` (ver §4.6) |

---

## 0. Resumo executivo

O projeto tem uma base de servidor sólida e consistente: route handlers finos, `apiRoute`/guards, Zod e serviços Prisma por domínio. Os maiores problemas estão **à volta** dessa base:

1. **O SSR não serve para nada no primeiro paint.** O layout `(app)` é um componente cliente que mostra um skeleton até o `useSession` resolver, e no servidor o `useSession` está sempre em `loading`. O HTML inicial é por isso sempre um skeleton, e todo o trabalho de `canhoesServerFetch` nas páginas é deitado fora (§3.1).
2. **Há bugs reais escondidos por casts genéricos e chaves de cache inconsistentes.** A votação rebenta no primeiro refetch (§1.1), as contagens do admin ficam cortadas em 200 (§1.3) e as invalidações não acertam nas queries (§1.4).
3. **Há ~110 usos de classes CSS que já não existem** (`editorial-kicker`, `canhoes-tap`, `canhoes-bits-*`, `blurfade-in`, `leaf-fall`…), além de todas as animações `animate-in`/`slide-in-*` de Radix, que precisam de um plugin que não está instalado. Uma parte grande do "flashy" que o código promete não chega ao ecrã (§1.5).
4. **O design system está fragmentado.** Há ~80 tokens com aliases circulares e nomes que mentem, 768 usos de `[var(--…)]` e 282 literais `rgba(...)` nos componentes. O Tailwind 4 resolve isto com `@theme` (§4.1).
5. **Há três implementações diferentes de bottom sheet** (Radix Dialog, `vaul`, e uma feita à mão com drag manual) e os diálogos de confirmação aparecem centrados no ecrã, contra a regra mobile-first do projeto (§2.3, §3.4).

### Top 10 por impacto / esforço

| # | Ação | Secção | Impacto | Esforço |
|---|---|---|---|---|
| 1 | Corrigir o formato do quadro de votação no cliente | §1.1 | 🔴 crash | S |
| 2 | Criar o `QueryClient` por pedido (`useState`) | §1.2 | 🔴 fuga de dados entre utilizadores no SSR | S |
| 3 | Passar a sessão do servidor ao `SessionProvider` e tirar o gate cliente do layout | §3.1 | 🔴 LCP / SSR | M |
| 4 | Páginas a chamar serviços diretamente em vez de `fetch` HTTP a si próprias | §3.2 | 🟠 latência e carga na BD | M |
| 5 | Fábrica de query keys + agregados no servidor para o admin | §1.3, §1.4, §4.3 | 🟠 dados errados | M |
| 6 | Repor ou apagar as classes CSS fantasma; definir keyframes de entrada/saída | §1.5, §2.1 | 🟠 UI partida em silêncio | M |
| 7 | Migrar tokens para `@theme` (Tailwind 4) e consolidar | §4.1 | 🟠 DRY e legibilidade | L |
| 8 | Um único `BottomSheet` baseado em `vaul` | §2.3, §4.4 | 🟡 UX e DRY | M |
| 9 | Polling do feed: refetch só da 1.ª página + pill de "novos posts" | §3.3 | 🟡 carga na BD | S |
| 10 | Vitest a excluir `.next`; restaurar as regras de React Hooks no ESLint | §4.6 | 🟡 qualidade | S |

---

## 1. Bugs e riscos encontrados durante a auditoria

Não foram pedidos explicitamente, mas bloqueiam as restantes melhorias e devem ser tratados primeiro.

### 1.1 🔴 O quadro de votação rebenta no primeiro refetch

- `app/canhoes/(app)/votacao/page.tsx:5-26`: no servidor, converte `EventVotingBoardDto` (`options`, `myOptionId`) para `OfficialVotingBoardDto` (`nominees`, `myNomineeId`).
- `lib/repositories/awardsRepo.ts:30`: `getVotingBoard` declara `canhoesFetch<T.OfficialVotingBoardDto>`, mas a rota `app/api/v1/events/[eventId]/voting/route.ts` devolve o `EventVotingBoardDto` **cru**.
- `lib/domains/voting/components/CanhoesOfficialVotingModule.tsx:45-55` faz refetch a cada 20 s (`refetchInterval`). A partir daí, `category.nominees.map` (linha 200) recebe `undefined` e lança `TypeError`. O mesmo acontece em qualquer navegação cliente sem `initialData`.
- **Correção:** mover o mapeamento para o serviço (ou para o repo) e usar um único DTO. Mais genericamente, `canhoesFetch<T>` é um cast sem validação. Para respostas críticas, vale a pena um `schema.parse` em dev ou testes de contrato por rota.

### 1.2 🔴 `QueryClient` partilhado entre pedidos no servidor

- `components/providers/AppProviders.tsx:10`: `const client = new QueryClient(...)` está ao nível do módulo. O componente é `"use client"` mas é renderizado no servidor (SSR), por isso essa instância é **partilhada por todos os pedidos do processo Node**.
- Os `useQuery({ initialData })` das páginas (por exemplo `hooks/useEventOverview.ts:10-13`, com a chave fixa `["eventOverview"]`) escrevem dados por utilizador nesse cache partilhado. É o anti-padrão que a documentação do TanStack Query proíbe explicitamente.
- **Correção:** `const [client] = useState(() => new QueryClient(...))`.

### 1.3 🟠 O admin "lê tudo" com `take=1000`, mas a API corta em 200

- `lib/api/route.ts:85` define `readPaging` com `maxTake = 200` por omissão. Só `wishlist` e `categories` sobem o limite para 1000.
- Por isso ficam truncados em silêncio a 200 linhas:
  - `lib/domains/admin/components/hooks/useCategoriesAdmin.ts:178`: nomeações para contar uso por categoria;
  - `lib/domains/admin/components/hooks/useCategoriesAdmin.ts:186`: votos;
  - `lib/domains/admin/components/VotesAudit.tsx:30`: auditoria de votos.
- **Correção:** um endpoint de resumo com `prisma.nominee.groupBy` e `prisma.vote.groupBy` por `categoryId`, em vez de transferir linhas para contar no cliente. Para a auditoria, paginação real (`useInfiniteQuery`) + `VirtualizedList`.

### 1.4 🟠 Invalidações que não acertam na query

- `useCategoriesAdmin.ts:240,256,267` invalida `["admin","categories",id]`, mas a query é `["canhoes","admin","categories",id]` (linha 171). Hoje funciona por acaso, porque o `onUpdate()` do pai invalida a chave certa (`CanhoesAdminModule.tsx:289`).
- `CanhoesAdminModule.tsx:290` invalida `["canhoes","admin","votes","audit",id]`, mas `VotesAudit.tsx:31` usa `["canhoes","admin","votes-audit",id]`, que nunca é invalidada.
- Os mesmos dados aparecem em cache sob chaves diferentes, por isso não há partilha e as invalidações falham:
  - categorias: `["categories",id]` (`CanhoesCategoriesModule.tsx:57`), `["stickerCategories",id]` (`CanhoesStickerSubmitModule.tsx:89`), `["nominations",id,"categories"]` (`CanhoesNominationsModule.tsx:56`), `["canhoes","admin","categories",id]`;
  - wishlist: `["wishlistItems",id]` (`CanhoesWishlistModule.tsx:96`) e `["wishlist",id,0,1000]` (`hooks/useSecretSanta.ts:24`);
  - nomeados aprovados: `["approvedNominees",id]` e `["nominations",id,"approved"]`.
- **Correção:** ver §4.3 (fábrica de query keys).

### 1.5 🟠 Classes CSS fantasma (a UI está partida em silêncio)

O commit `a58ce43` removeu do `globals.css` as definições destas classes, mas os componentes continuam a usá-las:

| Classe | Usos | Efeito atual |
|---|---|---|
| `editorial-kicker` | 24 | kickers sem estilo |
| `canhoes-tap` | 15 | sem feedback de toque |
| `canhoes-field-label`, `canhoes-helper-text`, `canhoes-list-item`, `canhoes-link`, `canhoes-shell-chip`, `canhoes-section-title`, `canhoes-neon-border` | ~30 | formulários e listas sem estilo próprio |
| `canhoes-bits-panel*`, `canhoes-bits-backdrop*`, `canhoes-bits-divider*` | ~20 | `CanhoesGlowBackdrop` e `CanhoesDecorativeDivider` (`components/ui/canhoes-bits.tsx`) renderizam **nós vazios**; `EmptyState` aplica tons que não existem (`components/ui/empty-state.tsx:105-108`) |
| `blurfade-in` | 2 | `components/animations/BlurFade.tsx:57` só alterna a opacidade 0→1, sem animação; o `delay` não faz nada |
| `leaf-fall` (keyframe) | 1 | `components/animations/LeafRain.tsx:102`: as folhas ficam paradas fora do ecrã (`-top-8`) |
| `bg-circuit`, `zone-feed`, `zone-admin`, `post-title`, `post-body`, `motion-safe-smooth`, `canhoes-sheet`, `surface-popover`, `editorial-shell` | ~15 | sem efeito; `canhoes-sheet` era o fundo do `Sheet` bottom (`components/ui/sheet.tsx:57`) e `surface-popover` o do `AlertDialogContent` (`components/ui/alert-dialog.tsx:38`) — confirmar que não ficaram transparentes |

Há ainda as classes do plugin `tailwindcss-animate` (`animate-in`, `fade-in-0`, `zoom-in-95`, `slide-in-from-bottom`…) em `components/ui/sheet.tsx:37,57`, `components/ui/alert-dialog.tsx:20,38` e `lib/domains/feed/components/PollBox.tsx:62`. O plugin **não está instalado** (`tailwind.config.js` tem `plugins: []`), por isso nenhum Sheet ou AlertDialog tem animação de entrada ou saída.

**Decisão a tomar:** repor um conjunto mínimo destas classes como `@utility` do Tailwind 4, ou substituí-las por utilitários e apagá-las. Ver §2.1 e §4.2.

### 1.6 🟡 Contagem "restantes" sempre a 0

`lib/domains/feed/components/hooks/useHubFeed.ts:70-71` define `allPostsCount = posts.length`, e `HubFeedList.tsx:178` calcula `remainingCount = allPostsCount - posts.length`, que é sempre 0. O botão diz sempre "Carregar mais (0 restantes)". O `total` da API (`feed.ts:212`) é descartado em `useHubFeed.ts:47-53`.

---

## 2. UI/UX — moderna e com "wow" usando a stack existente

Regras do projeto a respeitar: animações só com `transform`/`opacity`, ≤ 200 ms em interações, e `prefers-reduced-motion` (já existe um reset global em `app/globals.css:153`).

### 2.1 Base de motion (pré-requisito)

- Definir **um** conjunto de keyframes no `@theme` do Tailwind 4 (`--animate-enter`, `--animate-exit`, `--animate-sheet-up`, `--animate-pop`) e usá-los via `data-[state=open]:animate-enter` nos primitivos Radix. Assim não é preciso a dependência `tw-animate-css`. Se se preferir a paridade com shadcn, `tw-animate-css` é a única dependência justificável.
- Alinhar as durações com a regra dos 200 ms:
  - `components/ui/button.tsx:12` (`transition-all duration-300`) → `transition-[transform,opacity,background-color] duration-150`;
  - `PollBox.tsx:39` (`duration-300`) e `PollBox.tsx:47` (`duration-700`, a animar `width`) → barra com `scale-x` + `origin-left`;
  - `HubPostCard.tsx:236` (`transition-all` em `grid-rows`) → `opacity` + `translate-y` no conteúdo;
  - `sheet.tsx:57` (`duration-300`).
- `components/animations/BlurFade.tsx`: o `filter: blur()` não é `transform`/`opacity`. Trocar por fade + `translate-y-2`, limitar o atraso (`Math.min(index, 5) * 40ms`) e **não** o usar dentro da lista virtualizada. Cada remount ao voltar a fazer scroll reinicia com `opacity: 0` e causa um flash (`HubPostCard.tsx:119`).
- Remover o overlay `body::after` (`app/globals.css:138`). Tem opacidade 0.006, é invisível e cria uma camada de composição fixa com z-index 9999 por cima de toda a app.

### 2.2 Micro-interações com retorno imediato

| Onde | Proposta |
|---|---|
| Upvote / downvote (`HubPostCard.tsx:174-213`) | "pop" do ícone (`scale-125 → 100`, 150 ms), contador com *tick* vertical (`translate-y` do número antigo para fora e do novo para dentro), `navigator.vibrate?.(8)` em Android. Trocar `green-500`/`red-500`/`zinc-*` por tokens. |
| Sondagem (`PollBox.tsx`) | barras com `scale-x`; ao votar, a opção escolhida faz um *pulse* (anel de `opacity`); percentagens em `tabular-nums`. |
| Bottom tabs (`components/ui/dock-two.tsx:47-57`) | substituir o sublinhado por um indicador "pill" partilhado que desliza com `translate-x` entre tabs (uma só `<span>` absoluta, posição calculada pelo índice ativo); `active:scale-95` real. |
| Botão "Post" central (`CanhoesBottomTabs.tsx:32-45`) | destacá-lo como FAB elevado (círculo musgo, ícone `Plus` que roda 45° quando o sheet está aberto). Hoje é igual às outras tabs. |
| Listas que mudam | aplicar `useAutoAnimate` (hoje só em `PendingProposals.tsx` e `AdminNominationsSection.tsx`) à lista de comentários (`HubPostComments.tsx`), à wishlist (`CanhoesWishlistModule.tsx`), às medidas e às nomeações do utilizador. Custo: uma linha por lista, e já respeita reduced motion. |
| Toasts (`components/ui/sonner.tsx`) | `offset` para ficarem acima da bottom bar (~6 rem + safe area), `richColors` com os tokens de sucesso/perigo, e ícones do Lucide. |
| Feed com polling | em vez de reordenar a lista sob o dedo a cada 15 s, mostrar uma pill flutuante "↑ 3 novos posts" que faz scroll ao topo e aplica os dados (ver §3.3). |

### 2.3 Sheets, diálogos e menus

- **Um só primitivo de bottom sheet com `vaul`** (já instalado e usado em `lib/domains/admin/components/layout/AdminDrawer.tsx`). Dá arrastar para fechar, snap points, *scale background* e focus trap. Migrar:
  - `components/chrome/canhoes/CanhoesComposeSheet.tsx:209` (Radix `Sheet side="bottom"` com um *grabber* falso nas linhas 214-216);
  - `components/chrome/canhoes/CanhoesFloatingActionMenu.tsx:62-87`, um drag implementado à mão com listeners em `document`. Não tem focus trap, scroll lock nem animação de saída, e o `onUp` da linha 79 fecha também com arrasto para cima (`Math.abs`);
  - os `AlertDialog` centrados (`components/ui/confirm-delete.tsx`, `CategoriesAdmin.tsx`, `PendingProposals.tsx`, `AdminNominationsSection.tsx`). No mobile passam a bottom sheet; a partir de `md:` podem continuar centrados.
- Lightbox (`lib/domains/feed/components/ImageLightbox.tsx`): acrescentar arrastar para baixo para fechar (`translate-y` + `opacity` do backdrop), à semelhança do Instagram e do Photos.

### 2.4 Empty states, loading e erros

- `components/ui/empty-state.tsx`: depois de corrigir §1.5, tornar o empty state **acionável** em todos os módulos:
  - feed vazio → "Publica o primeiro post" (abre o compose);
  - wishlist vazia → "Adicionar primeiro desejo";
  - votação sem categorias → explicar a fase atual e quando abre.
  Hoje só o feed passa `tone` e nenhum módulo passa `action`.
- O `nextPhase` já é calculado no servidor (`lib/domains/event/services/event.ts:42`) mas nunca é usado na UI. Um **countdown para a próxima fase** no `CanhoesPhaseHud` é um ganho de "wow" quase gratuito.
- Os skeletons repetem estruturas diferentes por módulo. Ver §4.4 sobre o skeleton do layout (`app/canhoes/(app)/layout.tsx:11-48`), que deixa de ser preciso depois de §3.1.
- Gala (`components/modules/canhoes/gala/CanhoesGalaModule.tsx`): é o momento-chave da app. Proposta de *reveal* encenado por categoria: cartão fechado → toque → `rotateY` ou `scale` + `opacity` para revelar o vencedor, com a ordem controlada pelo utilizador e um *burst* CSS curto. Tudo com `transform`/`opacity`, e com reveal imediato em `prefers-reduced-motion`.

### 2.5 Copy e acessibilidade

- O texto de UI tem acentos em falta, contra a regra de português de Portugal do projeto. Há ~34 ocorrências, por exemplo:
  - "Votacao", "Nomeacoes" (`hooks/useEventModuleAccess.ts:21-27`);
  - "Premios da edicao" (`CanhoesChrome.tsx:147`);
  - "nao", "esta disponivel" (`EventModuleGate.tsx:31-60`);
  - "Esta conta nao tem acesso" (`hooks/useAdminNavigation.ts:27`);
  - "Navegacao principal" (`CanhoesBottomTabs.tsx:55`);
  - "Canhoes do Ano" no OpenGraph (`app/layout.tsx:44-52`).
  Centralizar tudo em `lib/canhoesCopy.ts`.
- Controlos que só aparecem com hover ficam **invisíveis em ecrãs táteis**:
  - apagar comentário (`HubPostComments.tsx:226`, `opacity-0 group-hover:opacity-100`);
  - setas do carrossel (`MediaCarousel.tsx:197,212`);
  - remover imagem no compose (`ComposeMediaGrid.tsx:55,80`).
  Usar `opacity-100 md:opacity-0 md:group-hover:opacity-100`, ou um menu "⋯".
- O `document.title` é definido num `useEffect` (`CanhoesChrome.tsx:128-133`). Usar `export const metadata` / `generateMetadata` em cada `page.tsx`.

---

## 3. Responsividade e mobile-first

### 3.1 🔴 Layout `(app)` como gate cliente

- `app/canhoes/(app)/layout.tsx:1,55-67` é `"use client"` e devolve `AuthLoadingState` enquanto `loading`. O `loading` (`contexts/AuthContext.tsx:207-210`) espera por:
  1. `/api/auth/session` (via `useSession`);
  2. `/api/auth/providers` (`getProviders`, linha 83), só para saber se há login de dev;
  3. o auto-login de dev.
- No servidor, o `useSession` sem a prop `session` está sempre em `loading`, por isso **o HTML enviado é sempre o skeleton**. Os dados que as páginas foram buscar ao servidor só aparecem depois de dois round-trips no cliente.
- O `middleware.ts` já garante a autenticação. O gate cliente é redundante, exceto no modo de dev.
- **Correção:** um layout servidor que faz `getServerSession(authOptions)`, redireciona se não houver sessão, e passa `session` a `<SessionProvider session={…}>`. O login de dev resolve-se no servidor (redirect para o sign-in de dev quando `isDevelopmentAuthEnabled()`), e o `getProviders` sai do caminho crítico.
- O mesmo acontece com o `EventModuleGate` (`lib/domains/event/components/EventModuleGate.tsx:27`). Usa `useEventOverview()` **sem** `initialContext`, por isso no SSR (com o `QueryClient` corrigido em §1.2) mostra sempre "A validar acesso…". Fazer o gate no servidor, com o contexto que a página já tem.

### 3.2 Header pesado no mobile

`components/chrome/canhoes/CanhoesChrome.tsx:136-227`: o header sticky tem marca, badge de tom, título, descrição, chip de utilizador e HUD de fase, em dois níveis de cartão (`border` + `rounded` dentro de `border-b`). Mais o divisor "✦" (linhas 230-234), ocupa ~150 px de 667 px num iPhone SE, mais de 20% do viewport, sempre.

- Proposta: uma linha de 56 px (marca compacta + título da página + menu). O chip de utilizador e o HUD de fase vão para o menu "Mais", ou para um header que colapsa com o scroll (`translate-y` ao descer, aparece ao subir).
- O botão de logout no header (linhas 180-195) é uma ação destrutiva a um toque de distância. Mover para o menu.

### 3.3 Grids e larguras

- `grid-cols-3` sem breakpoint a 375 px:
  - `lib/domains/admin/components/CanhoesAdminModule.tsx:93`: 6 métricas em 3 colunas de ~100 px;
  - `app/canhoes/(public)/login/page.tsx:140`;
  - `components/chrome/canhoes/compose/ComposeMediaGrid.tsx:37`.
  Começar com `grid-cols-2` e expandir com `sm:grid-cols-3`.
- Gutters duplicados: `HubFeedModule.tsx:106` (`px-3 sm:px-0`) dentro de `PageShell` (`px-4`) dá 28 px de margem lateral no mobile, contra 16 px nos outros módulos.
- `CanhoesChrome.tsx:241` (`max-w-[60rem]`) repete o `PageShell` sem `wide` (`components/ui/page-shell.tsx:15`). Basta um dos dois.
- `components/ui/sheet.tsx:57`: os sheets laterais com `w-[85vw]` ficam bem; os de topo e de baixo vão ser substituídos por `vaul` (§2.3).
- `AdminMembersDataTable.tsx:96`: tabela com scroll horizontal no mobile. Abaixo de `md:` renderizar cartões (nome, papel, toggle), mantendo o `@tanstack/react-table` para ordenação e filtro.

### 3.4 Touch targets e tipografia

- A regra global `button, [role="button"] { min-height: 44px; min-width: 44px; }` (`app/globals.css:149`) faz com que **as classes mintam**: `h-8 w-8` (`PostHeader.tsx:451-485`), `h-9 w-9` (`HubPostCard.tsx:178,205`) e `h-10 w-10` (`CanhoesChrome.tsx:184`) são todos 44×44 na prática. Também infla botões de texto inline como "Responder" e chips. Proposta: remover a regra global e garantir 44 px no `Button` (já tem `min-h-[44px]`) e num utilitário `tap-target` (área de toque com pseudo-elemento, sem mexer no visual).
- `size="sm"` do `Button` (`components/ui/button.tsx:29`) tem `h-11`, igual ao `default`. Os tamanhos não se distinguem.
- Texto abaixo de 16 px: 70 × `text-xs`, 26 × `text-[10px]`, 13 × `text-[11px]`, 2 × `text-[9px]`. É aceitável em *labels* e metadados, mas há **conteúdo** abaixo de 16 px:
  - corpo dos comentários (`HubPostComments.tsx`);
  - descrições do menu (`CanhoesFloatingActionMenu.tsx:220`, `text-[13px]`);
  - texto de empty states (`empty-state.tsx:46,55`, `text-sm`);
  - nomes nos posts (`PostHeader.tsx:62`, `text-sm`).
  Definir uma escala tipográfica no `@theme` (§4.1) e proibir `text-[Npx]` no lint, ou pelo menos em revisão.
- `<input>` com `font-size: 1rem` global (`globals.css:146`) evita o zoom do iOS. Garantir que nenhum `className` o baixa (`CanhoesComposeSheet.tsx:239` usa `sm:text-sm`, o que está bem por ser só a partir de `sm:`).

---

## 4. Performance

### 4.1 Renderização Next.js (servidor vs cliente)

- **`fetch` HTTP para si próprio:** `lib/api/canhoesServerClient.ts:8-24`. Cada página faz `fetch("http://localhost:3000/api/v1/…")` com os cookies reencaminhados. Cada pedido:
  1. volta a passar pelo NextAuth, cujo callback `jwt` faz `prisma.user.findUnique` (`lib/domains/auth/services/auth.ts:104-109`);
  2. serializa e desserializa JSON;
  3. usa `next.revalidate: 60` com cookies no cache key, o que guarda respostas **por utilizador** na Data Cache durante 60 s (dados velhos depois de uma escrita e churn quando o token roda).
  
  **Correção:** as páginas chamam os serviços diretamente (`getActiveEventContext`, `getFeedPosts`…) com um `getSessionUser()` envolto em `React.cache()`.
- **Waterfall por página:** todas as páginas fazem primeiro `events/active/context` e só depois os dados do módulo (`app/canhoes/(app)/page.tsx:21-26`, `votacao/page.tsx:30-33`, `gala/page.tsx:7-10`, etc.). Com acesso direto aos serviços, um helper `getActiveEventId()` em `cache()` pode ser partilhado entre layout e página.
- **`getActiveEventContext`** (`lib/domains/event/services/event.ts:94-104`) faz 4 round-trips sequenciais:
  1. `event.findFirst`;
  2. `event.findUnique` (o mesmo evento outra vez, linha 32);
  3. `Promise.all` de 3 queries;
  4. `Promise.all` de 4 contagens.
  Juntar 3 e 4 num só `Promise.all` e reutilizar o evento.
  Além disso, `feedPostCount`, `nextPhase`, `myProposalCount`, `myVoteCount`, `votingCategoryCount` e `hasSecretSantaAssignment` estão hardcoded a 0/false ou não são lidos em lado nenhum da UI. Remover os campos e as contagens inúteis (corre em **cada** navegação).
- **`getVotingBoard`** (`lib/domains/voting/services/voting.ts:18-41`): 6 awaits sequenciais independentes (evento, fase, categorias, nomeados, membros, utilizadores). Agrupar em `Promise.all`.
- `key={pathname}` em `CanhoesChrome.tsx:239` remonta a árvore inteira da página a cada navegação, só para correr `animate-fade-in`. Usar `app/canhoes/(app)/template.tsx`, que é a forma idiomática, ou (depois de React 19) `<ViewTransition>`.
- `CanhoesChrome.tsx` tem 5 `useEffect`, dos quais 3 sincronizam estado:
  - linhas 76-79: fechar ao mudar de rota → fechar no `onNavigate`;
  - linhas 81-85: `!canCompose` → derivar `isComposeOpen && canCompose`;
  - linhas 87-95: listener de `OPEN_COMPOSE_SHEET_EVENT`, um evento que **ninguém dispara**, por isso é código morto.
- `next.config.mjs:15-17`: `remotePatterns: [{ hostname: "**" }]` transforma o otimizador de imagens num proxy aberto para qualquer host HTTPS (custo de CPU e abuso). Os uploads são locais, por isso basta restringir a lista ou removê-la.
- `app/api/uploads/[...path]/route.ts:11`: lê o ficheiro inteiro para memória. Fazer stream (`fs.createReadStream` → `ReadableStream`) e, como os nomes são únicos, usar `max-age=31536000, immutable`.

### 4.2 React Query

- **Polling do feed:** `useHubFeed.ts:61-62` usa `useInfiniteQuery` com `refetchInterval` de 15 s. Um refetch de uma infinite query volta a pedir **todas as páginas carregadas**. Com 5 páginas são 5 pedidos × ~7 queries Prisma, por utilizador, a cada 15 s.
  Proposta: um endpoint leve `GET feed/posts/latest?after=<createdAt>` (ou só a 1.ª página) para a pill de "novos posts" (§2.2), e refetch completo apenas por ação do utilizador.
- Votação: `refetchInterval` de 20 s (`CanhoesOfficialVotingModule.tsx:53`) para um quadro que só muda quando o próprio utilizador vota. Remover. A mutação já invalida.
- Admin de nomeações: `refetchInterval` dinâmico (`AdminNominationsSection.tsx:115`). Confirmar se é mesmo preciso.
- `hub:postCreated` via `window.dispatchEvent` (`CanhoesComposeSheet.tsx:185`, `useHubFeed.ts:100-104`) contraria a regra do projeto ("invalida as queries"). Chamar `queryClient.invalidateQueries({ queryKey: queryKeys.feed(eventId) })` no compose.
- `CanhoesAdminModule.tsx:285-292` invalida 8 chaves à mão. Com a fábrica de chaves de §4.3, basta `invalidateQueries({ queryKey: queryKeys.admin.all(eventId) })`.
- `AuthContext`: o `/api/me` (linha 119) duplica a sessão, porque o callback `jwt` já relê `isAdmin` da BD em cada pedido. Com a sessão do servidor (§3.1), o `/api/me` e o `getProviders` saem do caminho crítico. `useIsAdmin` (`AuthContext.tsx:251`) e `useAdminStatus` (`hooks/useAdminStatus.ts`) são duas fontes para o mesmo booleano.
- `canhoesFetch` tem um *dedupe* manual de GETs (`lib/api/canhoesClient.ts:18,37-38`) que o React Query já faz. É uma camada a menos se for removido.

### 4.3 Listas grandes (`@tanstack/react-virtual`)

`components/ui/virtualized-list.tsx`:

- `useWindowVirtualizer` (linha 92) **sem `scrollMargin`**. A lista começa depois do header e do `CanhoesModuleHeader`, por isso o virtualizador calcula mal o que está visível (itens aparecem e desaparecem antes do tempo). Medir `offsetTop` do contentor, passar `scrollMargin` e subtrair em `translateY(start - scrollMargin)`.
- `getKey` é usado na `key` do React (linha 132) mas **não** é passado ao virtualizador (`getItemKey`). A cache de medições fica indexada por índice: quando entra um post novo no topo, as alturas ficam deslocadas e há saltos visíveis.
- `estimateSize = 220` (`HubFeedList.tsx:44`) para posts que com imagem têm ~500 px. Melhor estimar por tipo (`post.mediaUrls.length ? 520 : post.poll ? 360 : 200`).
- Candidatos à `VirtualizedList`: `VotesAudit` (até centenas de linhas, hoje sem virtualização) e os comentários de posts muito comentados.
- Prop drilling com ~20 callbacks em 4 níveis (`HubFeedModule` → `HubFeedList` → `HubFeedListItem` → `HubPostCard` → `HubPostComments`). O `renderItem` inline (`HubFeedList.tsx:139`) e os records `openComments`/`commentDrafts`/`replyingTo` passados inteiros anulam parte do `memo`. Proposta: um `FeedActionsContext` com ações estáveis, e o estado de comentários *dentro* do `HubPostCard` (rascunho e reply são estado local do cartão).

### 4.4 Prisma e base de dados

- `getFeedPosts` (`lib/domains/feed/services/feed.ts:121-213`):
  - traz **todas** as reações, downvotes e votos de sondagem dos posts da página e depois filtra com `.filter` por post (linhas 169-170, 186), o que é O(posts × linhas). Usar `groupBy({ by: ["postId","emoji"], _count })` para contagens + `findMany({ where: { userId } })` só para "as minhas";
  - `count()` total em cada página (linha 129) também corre em cada refetch de 15 s. Com paginação por cursor (`createdAtUtc`, `id`) o `count` deixa de ser preciso.
- `createFeedPost` → `enrichPost` (`feed.ts:81-119`) faz 7 queries para um post acabado de criar, que por definição tem 0 reações, 0 comentários e 0 votos. Montar o DTO diretamente.
- Upserts escritos como "find + create/update" sem transação:
  - votos (`voting.ts:136-165`) → `prisma.vote.upsert` sobre `@@unique([categoryId, userId])`;
  - sondagem (`feed.ts:473-490`) → `upsert` sobre `@@unique([postId, userId])`;
  - like/downvote (`feed.ts:267-313`): o `deleteMany` + `create` devia estar num `$transaction`.
- Índices redundantes em `prisma/schema.prisma` (custo de escrita sem benefício de leitura):
  - `IX_HubPostDownvotes_PostId`, `IX_HubPostReactions_PostId`, `IX_HubPostLikes_PostId` e `IX_HubPostCommentReactions_CommentId` são prefixos de índices únicos compostos;
  - `IX_HubPostComments_PostId` é prefixo de `(postId, createdAtUtc)`;
  - `IX_UserInvitations_TokenIdx` duplica o `@unique` de `token`;
  - índices de baixa seletividade isolados: `IX_Users_IsAdmin`, `IX_HubPosts_IsPinned`, `IX_AwardCategories_IsActive`, `IX_*Proposals_Status`.
- O modelo `HubPostLike` (`prisma/schema.prisma:377`) **não é usado** (os likes são reações `heart`). Remover modelo e tabela numa migration.
- Não há relações Prisma para `User` (os autores são juntados à mão em `feed.ts:145`, `voting.ts:39`, `members.ts:42`). Não é urgente, mas relações `author User @relation(...)` permitiriam `select: { author: { select: { displayName } } }` numa só query.
- `jwt` callback: uma query à BD por pedido autenticado (incluindo cada `fetch` interno de §4.1). Aceitável com o volume atual. Remover o fetch interno já corta pelo menos metade destas queries.

### 4.5 Bundle

- `@tanstack/react-query-devtools` é importado estaticamente em `AppProviders.tsx:7`. Usar `next/dynamic` para não depender do *tree-shaking* do pacote.
- `CanhoesChrome.tsx:97-109` pré-carrega o compose e o menu com `setTimeout(1200)`. Com o `next/dynamic` já existente, chega `onPointerEnter`/`onFocus` no botão (pré-carregamento por intenção).
- Correr `ANALYZE=true npm run build` (o `@next/bundle-analyzer` já está configurado) depois da migração para Next 16, para confirmar o peso de `lucide-react` (imports nomeados estão ok) e das três bibliotecas de sheet.

### 4.6 Tooling (qualidade que protege a performance)

- `vitest.config.js`: falta `exclude: [...configDefaults.exclude, ".next/**"]`. Hoje o Vitest corre testes de `.next/standalone/**`, e daí vem a falha atual. Renomear para `.mjs` remove também o aviso de ESM.
- `eslint.config.mjs` (working tree): com a saída de `eslint-config-next` deixaram de correr `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps` e as regras `@next/next/*`. As linhas `"react-hooks/…": "off"` referem um plugin que já não está registado. Repor `eslint-plugin-react-hooks` e `@next/eslint-plugin-next` em flat config.
- Next 16: confirmar o aviso de deprecação de `middleware.ts` (renomeado para `proxy.ts` no Next 16) e migrar `middleware.ts` + `middleware.test.ts`.
- `autoprefixer` (`postcss.config.cjs`) é redundante no Tailwind 4, que já trata prefixos via Lightning CSS. Remover a dependência.
- `CLAUDE.md` e `README.md` ainda dizem Next 15 / Tailwind 3. Atualizar quando a migração for commitada.
- React 18.2 com Next 16: o App Router usa o React interno (canary), mas `@types/react@18` e `react@18.2` no `package.json` impedem `useOptimistic`, `<ViewTransition>` e o React Compiler de forma tipada. Ponderar React 19 como passo separado.

---

## 5. Refactoring — limpo e DRY

### 5.1 Design tokens → Tailwind 4 `@theme`

- `app/globals.css:6-84` tem ~80 variáveis, muitas delas aliases em cadeia:
  - `--color-bg-surface` → `--bg-surface` → `--color-bg-elevated`, e `--bg-deep` → `--color-bg-surface`, por isso `--bg-deep` e `--bg-surface` são **o mesmo valor**;
  - nomes que mentem: `--neon-green` é musgo `#4F6336` (linha 43) enquanto o Tailwind `neon-green` é `#00FF88` (`tailwind.config.js:15`); `--border-moss` é amarelo (linha 55); `--glow-green-sm` é amarelo.
- Há 768 usos de `[var(--…)]` e 282 literais `rgba(...)` em `.tsx`. Os mais repetidos são `rgba(255,255,255,0.12)` ×18, `0.08` ×14 e `0.14` ×11, que correspondem aos tokens `--border-paper*` já existentes mas não usados.
- **Proposta:** substituir `@config "../tailwind.config.js"` por um bloco `@theme` com ~25 tokens semânticos:
  - `--color-surface`, `--color-surface-raised`, `--color-ink`, `--color-ink-muted`, `--color-moss`, `--color-amber`, `--color-danger`, `--color-line`, `--color-line-strong`;
  - `--radius-*`, `--shadow-*`, `--animate-*` e a escala tipográfica.
  
  Isto dá `bg-surface border-line text-ink-muted` em vez de `bg-[var(--bg-surface)] border-[rgba(255,255,255,0.12)] text-[var(--text-muted)]`, e permite apagar `tailwind.config.js`. Migrar por ficheiro com codemods simples (sed por padrão).
- Ficheiros com mais cores hardcoded, a migrar primeiro:
  - `CanhoesBrandIcon.tsx` (20);
  - `CanhoesFloatingActionMenu.tsx` (16), com paleta roxa (`rgba(177,140,255,…)`) fora do design system descrito no CLAUDE.md;
  - `HubPostCard.tsx` (13, `zinc-*`, `green-500`, `red-500`);
  - `CategoriesAdmin.tsx` (13), `CanhoesChrome.tsx` (10), `error-alert.tsx` (9), `button.tsx` (8, incluindo `#4F6336`/`#677f46` hardcoded na variante `primary`).

### 5.2 CSS fantasma e componentes mortos

- Resolver §1.5: para cada classe fantasma, **ou** repor como `@utility` (as que dão identidade: `canhoes-tap`, `editorial-kicker`, `canhoes-field-label`), **ou** substituir pelos utilitários e apagar.
- `CanhoesGlowBackdrop` e `CanhoesDecorativeDivider` (`components/ui/canhoes-bits.tsx`) estão em 7 ficheiros e hoje renderizam divs vazias. Reimplementar com utilitários (o backdrop pode ser um único `radial-gradient` no `::before`) ou apagar.
- `LeafRain` (`components/animations/LeafRain.tsx`): definir o keyframe `leaf-fall` com `transform` ou apagar. Além disso gera posições aleatórias num `useEffect` + `useState` (linhas 16-25), quando um `useMemo`/`useState(() => …)` chega.
- Código morto confirmado:
  - listener `OPEN_COMPOSE_SHEET_EVENT` (`CanhoesChrome.tsx:87-95`, `lib/canhoesEvent.ts`);
  - `showParticles`/`setShowParticles` (`useHubFeedPostActions.ts:154`), devolvido mas nunca renderizado;
  - parâmetro `_currentUserId` (`useHubFeed.ts:34`);
  - alias `sortedDisplayedPosts = allSanitizedPosts` (`useHubFeed.ts:70`);
  - `HubPostLike` no schema;
  - campos placeholder do `EventOverviewDto` (§4.1).
- `components/ui/dock-two.tsx`: o nome não diz o que exporta (`Dock`) e só tem um consumidor (`CanhoesBottomTabs.tsx`). Fundir ou renomear para `dock.tsx`.

### 5.3 Fábrica de query keys

Criar `lib/queryKeys.ts`:

```ts
export const queryKeys = {
  eventContext: () => ["event", "context"] as const,
  categories: (eventId: string) => ["event", eventId, "categories"] as const,
  approvedNominees: (eventId: string) => ["event", eventId, "nominees", "approved"] as const,
  wishlist: (eventId: string) => ["event", eventId, "wishlist"] as const,
  feed: (eventId: string) => ["event", eventId, "feed"] as const,
  comments: (eventId: string, postId: string) => ["event", eventId, "feed", postId, "comments"] as const,
  voting: (eventId: string) => ["event", eventId, "voting"] as const,
  admin: {
    all: (eventId: string) => ["event", eventId, "admin"] as const,
    categories: (eventId: string) => ["event", eventId, "admin", "categories"] as const,
    // …
  },
};
```

Resolve §1.4, partilha o cache entre módulos (categorias carregadas no feed servem às nomeações, aos stickers e ao admin) e permite invalidação hierárquica. Juntar `queryOptions()` do TanStack v5 para colar chave + `queryFn` + `staleTime` num só sítio, o que elimina os `staleTime` divergentes (30 s, 1 min, 2 min, 3 min, 5 min).

### 5.4 Duplicação a centralizar

| Padrão duplicado | Onde | Centralizar em |
|---|---|---|
| "buscar contexto ativo → buscar dados do módulo → `EventModuleGate`" | as 8 `page.tsx` em `app/canhoes/(app)/*` | helper servidor `withActiveEvent(moduleKey, load)` ou layout por segmento |
| Mapeamento post → DTO (contagens de reações, sondagem) | `feed.ts:31-119` **e** `feed.ts:168-210` | uma função `toFeedPostDto(row, aggregates, userId)` |
| Contagem de reações por emoji + "as minhas" | `feed.ts:65-79`, `feed.ts:171-176`, `feed.ts:360-365` | `summarizeReactions(rows, userId)` |
| Tipos `FeedPageData` / `FeedApiResponse` | `app/canhoes/(app)/page.tsx:12`, `HubFeedModule.tsx:18-23`, `useHubFeed.ts:13-24`, `useHubFeedPostActions.ts:16` | `PagedResult<EventFeedPostFullDto>` de `lib/api/types.ts` |
| Bottom sheet / drawer | Radix `Sheet`, `vaul` `Drawer`, menu manual | `components/ui/bottom-sheet.tsx` (vaul) |
| Classe "painel" (`border-white/[0.06] bg-white/[0.03] rounded-[26px] shadow-[…]`) | `card.tsx:10`, `empty-state.tsx:27`; variante `border-white/5 bg-white/[0.025] rounded-[1.25rem]` em `PollBox.tsx:11`, `FeedLoadMore.tsx:24,40` | `Card` com `variant` (cva) ou `@utility surface-panel` |
| Botão de ícone redondo do header | `CanhoesChrome.tsx:184,197`, `PostHeader.tsx:451-485` (4×) | `Button size="icon" variant="ghost-round"` |
| "Invalidar várias chaves admin" | `CanhoesAdminModule.tsx:285-292`, `AdminNominationsSection.tsx:162-242` (4 blocos) | `invalidateQueries(queryKeys.admin.all(id))` |
| Skeletons por módulo | `layout.tsx:11-48`, `FeedSkeleton.tsx`, `SecretSantaLoadingState.tsx`, `AsyncStatusCard` | `loading.tsx` por segmento (streaming do App Router) |
| Fonte de "é admin?" | `useIsAdmin`, `useAdminStatus`, `overview.permissions.isAdmin` | uma só, vinda da sessão do servidor |

### 5.5 Estrutura de ficheiros

- Os módulos estão divididos entre `components/modules/canhoes/*` (wishlist, gala, categorias, medidas, stickers, secret santa) e `lib/domains/*/components` (feed, votação, nomeações, admin). Escolher **uma** casa. A sugestão é `lib/domains/<domínio>/components`, que já tem os serviços ao lado, e mover os 7 módulos restantes.
- `hooks/` na raiz mistura hooks globais (`useEventOverview`) com hooks de admin (`useAdminBootstrap`, `usePendingProposals`, `useModuleVisibility`, `useSecretSanta`), que pertencem a `lib/domains/admin/components/hooks/` (onde já existe outro `usePendingProposals`, com 261 linhas, diferente do de `hooks/usePendingProposals.ts`). Há dois hooks com o mesmo nome.
- `lib/domains/admin/components/` tem helpers não-UI (`dateUtils.ts`, `moderationUtils.ts`, `proposalConstants.ts`, `proposalTypes.ts`) misturados com componentes.
- Ficheiros grandes a partir: `PendingProposals.tsx` (554), `AdminNominationsSection.tsx` (524), `CategoriesAdmin.tsx` (521), `AdminControlCenterPanels.tsx` (408), `CanhoesWishlistModule.tsx` (386), `useHubFeedPostActions.ts` (385, com 9 blocos `setQueryData` quase iguais → um helper `updatePost(eventId, postId, patch)`).

### 5.6 Dependências

| Dependência | Estado | Ação |
|---|---|---|
| `autoprefixer` | redundante com Tailwind 4 | remover |
| `@formkit/auto-animate` | usado em 2 ficheiros | **expandir** o uso (§2.2) |
| `vaul` | usado em 1 ficheiro | tornar o primitivo único de sheet (§2.3) |
| `@radix-ui/react-dialog` | só para o `Sheet` | pode sair depois de §2.3, se os sheets laterais não forem precisos |
| `@tanstack/react-table` | 1 tabela (membros) | manter se se mantiver ordenação/filtros; senão, uma lista simples chega |
| `@radix-ui/react-avatar`, `react-progress`, `react-separator` | 1 consumidor cada | ok (são pequenos), mas confirmar que os wrappers são usados |
| `eslint-config-next` → removido | perdeu regras | repor plugins (§4.6) |

---

## 6. Next Steps — roadmap faseado

Cada fase é um conjunto de PRs pequenos. Cada PR termina com `npm run lint`, `npx tsc --noEmit` e `npm test`, conforme o CLAUDE.md.

### Fase 0 — Estabilizar (1–2 dias)

1. `vitest.config` a excluir `.next/**`, para os testes voltarem a verde.
2. Repor `eslint-plugin-react-hooks` + `@next/eslint-plugin-next`.
3. §1.1: corrigir o DTO da votação e acrescentar um teste ao mapeamento.
4. §1.2: `QueryClient` em `useState`.
5. §1.6: usar o `total` da API no "Carregar mais".
6. Commitar a migração Next 16 / Tailwind 4 e atualizar `CLAUDE.md`/`README.md`; `middleware.ts` → `proxy.ts` se o Next 16 o exigir.

### Fase 1 — Dados e SSR (3–5 dias)

1. §3.1: layout `(app)` como componente servidor com `getServerSession` → `SessionProvider session={…}`; remover `getProviders`/`/api/me` do caminho crítico.
2. §4.1: páginas a chamar serviços diretamente + `React.cache()` para utilizador e evento ativo; apagar `canhoesServerClient.ts`.
3. `EventModuleGate` no servidor; `loading.tsx` por segmento no lugar dos skeletons de cliente.
4. §5.3: `lib/queryKeys.ts` + `queryOptions`; migrar todas as queries e invalidações.
5. §1.3: endpoint de resumo do admin com `groupBy`.

### Fase 2 — Base de design (3–5 dias)

1. §5.1: bloco `@theme` com tokens semânticos, keyframes (§2.1) e escala tipográfica; apagar `tailwind.config.js`.
2. §1.5 / §5.2: resolver as classes fantasma (repor como `@utility` ou substituir) e apagar código morto.
3. Codemod de `[var(--…)]` e `rgba(...)` → classes semânticas, ficheiro a ficheiro, começando pelos da tabela de §5.1.
4. §3.4: remover a regra global de 44 px; criar o utilitário `tap-target`.

### Fase 3 — UX e "wow" (4–6 dias)

1. §2.3: `BottomSheet` com `vaul`; migrar o compose, o menu "Mais" e as confirmações no mobile.
2. §3.2: header compacto / colapsável.
3. §2.2: micro-interações (votos, sondagem, tabs com indicador deslizante, FAB de post), `useAutoAnimate` nas listas e toasts acima da bottom bar.
4. §2.4: empty states acionáveis, countdown de fase e *reveal* da Gala.
5. §2.5: copy com acentos, centralizada em `canhoesCopy.ts`; controlos visíveis em touch.

### Fase 4 — Performance fina (2–4 dias)

1. §4.2: polling leve "novos posts" no lugar do refetch de todas as páginas; remover o polling da votação.
2. §4.3: `scrollMargin` + `getItemKey` + estimativas por tipo no virtualizador; estado de comentários local ao cartão + `FeedActionsContext`.
3. §4.4: agregados com `groupBy`, upserts, paginação por cursor no feed, limpeza de índices e de `HubPostLike` (migration).
4. §4.1: restringir `images.remotePatterns`; stream nos uploads.
5. `ANALYZE=true npm run build` para medir antes e depois.

### Fase 5 — Estrutura (contínua)

1. §5.5: módulos todos em `lib/domains/<domínio>/components`; hooks de admin para o domínio; partir os ficheiros com mais de 400 linhas.
2. Opcional: React 19, para `useOptimistic` (substitui os `setQueryData` otimistas manuais), `<ViewTransition>` nas mudanças de rota e o React Compiler.

---

### Anexo — método

- Leitura integral de: layout, providers, auth, clientes de API, repositórios, guards, `route.ts`, serviço do feed, schema Prisma, todo o fluxo do feed, a chrome (header, tabs, menu, compose), `ui/*` partilhados e serviços de evento e votação.
- Varrimentos com `grep` para: classes usadas vs. definidas em `globals.css`, cores hardcoded, tamanhos de texto, larguras fixas, `grid-cols` sem breakpoint, controlos só com hover, query keys e invalidações, `take=1000` vs. `maxTake`, awaits sequenciais em serviços, campos de DTO não usados.
- `git log -S` para confirmar a origem das classes removidas (`a58ce43`).
- Verificações executadas: `eslint`, `tsc --noEmit`, `vitest run`.
