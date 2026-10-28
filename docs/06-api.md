# 6. API

Todas as rotas vivem em `app/api` e devolvem JSON. Os erros têm sempre a forma `{ code, message, details? }` (ver `lib/api/route.ts`). As listas paginadas aceitam `?skip=&take=` e devolvem `{ items, total, skip, take, hasMore }`.

Legenda da coluna "Quem":

| Guard | Significado |
|---|---|
| público | Sem sessão |
| sessão | `requireUser`: qualquer utilizador com sessão |
| membro | `requireUser` + `requireEventAccess`: membro do evento ou admin |
| membro + módulo X | `requireModule`: membro, e o módulo X aberto na fase atual (admins passam) |
| membro + propostas | `requireProposalsOpen`: membro, e a fase PROPOSALS com "Aceitar propostas" ligado (`nominationsVisible`; admins passam) |
| admin | `requireAdmin` |
| segredo do cron | `requireCronSecret`: `Authorization: Bearer $CRON_SECRET`, em tempo constante; sem `CRON_SECRET` configurado recusa tudo (401) |

## Públicas e de conta

| Método | Rota | Quem | Serviço |
|---|---|---|---|
| GET, POST | `/api/auth/[...nextauth]` | público | NextAuth (`lib/domains/auth/services/auth.ts`) |
| POST | `/api/auth/register` | público | `registerWithInvitation` |
| GET, POST | `/api/admin/invites` | admin | `listInvitations`, `createInvitation` (com envio de email Resend) |
| DELETE | `/api/admin/invites/[inviteId]` | admin | `cancelInvitation` |
| GET | `/api/health` | público | Estado da base de dados (200 ou 503) |
| GET | `/api/cron/stories-cleanup` | segredo do cron | `cleanupExpiredStories`: apaga as stories expiradas, ficheiro primeiro e linha depois, por lotes até não haver mais, ao fim de 45 s ou de 1000 (uma story com a chave estragada perde só a linha); `maxDuration` 60 s; devolve `{ deleted, failed }` (500 se `failed > 0`, para a falha aparecer nos registos do cron). Chamada pela Vercel todos os dias (`vercel.json`) |
| POST | `/api/telemetry/log` | público | Erros do browser em produção, para o log do servidor |
| GET | `/api/uploads/[...path]` | público | `readUpload` (também servido em `/uploads/*`); devolve 404 para `stories/…`, que só se veem pelas rotas autenticadas do evento |
| GET | `/api/v1/events/active/context` | sessão | `getActiveEventContext` |
| PUT | `/api/v1/me/color` | sessão | `setUserColor` (a cor da pessoa, uma das 8 de `lib/personColors.ts`) |

## Evento (`/api/v1/events/[eventId]/…`)

| Método | Rota | Quem | Serviço |
|---|---|---|---|
| GET | `overview` | membro | `getEventOverview` |
| GET | `members` | membro | `getMembers` |
| GET | `categories` | membro | `getActiveCategories` |
| POST | `proposals` | membro + propostas | `createProposal` |
| POST | `nominations` | membro + propostas | `createNomination` |
| GET | `nominations/approved` | membro | `getApprovedNominees` |
| GET | `nominations/my-status` | membro | `getMyNominations`: as minhas nomeações, a mais recente por categoria |
| POST | `nominations/[nomineeId]/upload` | membro (dono ou admin) | `replaceNomineeImage` |
| GET | `measures` | membro | `getMeasures` |
| POST | `measures` | membro + propostas | `createMeasureProposal` |
| GET | `voting` | membro | `getVotingBoard` |
| POST | `votes` | membro + módulo `voting` | `castVote` (rate limit estrito) |
| GET | `results` | membro + módulo `gala` | `getResults` |
| GET | `secret-santa/overview` | membro | `getOverview` |
| GET, POST | `wishlist` | membro | `getWishlistItems`, `createWishlistItem` |
| DELETE | `wishlist/[itemId]` | membro (dono ou admin) | `deleteWishlistItem` |
| POST | `wishlist/[itemId]/image` | membro (dono ou admin) | `replaceWishlistImage` |
| PATCH | `modules` | admin | `updateEventModules` |
| GET, POST | `stories` | membro + módulo `feed` | `listActiveStories` (as stories ativas agrupadas por membro, o mais recente primeiro; só de quem ainda está no evento, ou é admin), `createStory`: multipart com o campo `file` (JPEG, PNG ou WebP até 4 MB; 411 se o pedido não declarar o tamanho, 413 se passar o limite, 409 `STORY_LIMIT_REACHED` à 11.ª story ativa; rate limit estrito). Devolve `201 { id, createdAtUtc, expiresAtUtc }`, nunca a chave do ficheiro |
| GET | `stories/[storyId]/media` | membro + módulo `feed` | `readStoryMedia`: a imagem, com `Cache-Control: private, no-store`; 404 se a story expirou, é de outro evento, o autor saiu ou o ficheiro já não existe |
| DELETE | `stories/[storyId]` | membro (autor ou admin) | `deleteStory`: apaga primeiro o ficheiro e depois a linha, por isso uma falha do armazenamento pode repetir-se; 204. Só exige acesso ao evento, não o mural aberto, para o autor poder sempre retirar a sua story |

## Mural (`/api/v1/events/[eventId]/feed/…`)

| Método | Rota | Quem | Serviço |
|---|---|---|---|
| GET, POST | `posts` | membro | `getFeedPosts` (fixados primeiro, depois do mais novo para o mais antigo; cada post traz `postNumber`, o lugar por data de criação), `createFeedPost` |
| DELETE | `posts/[postId]` | admin | `deleteFeedPost` |
| POST, PATCH | `posts/[postId]/pin` | admin | `togglePin`, `movePinnedPost` |
| POST | `posts/[postId]/like` | membro | `toggleLike` (rate limit normal) |
| POST | `posts/[postId]/downvote` | membro | `toggleDownvote` |
| POST | `posts/[postId]/reactions` | membro | `toggleReaction` |
| POST | `posts/[postId]/poll/vote` | membro | `votePoll` |
| GET, POST | `posts/[postId]/comments` | membro | `getPostComments`, `createComment` |
| DELETE | `posts/[postId]/comments/[commentId]` | membro (autor ou admin) | `deleteComment` |
| POST | `posts/[postId]/comments/[commentId]/reactions` | membro | `toggleCommentReaction` |
| POST | `uploads` | membro | `saveFeedImages` (multipart, campo `files`, até 4) |

Os limites de pedidos (429 `RATE_LIMIT_EXCEEDED`) e os filtros `?status=` (400 se não for `pending`, `approved` ou `rejected`) estão descritos em [02-requisitos.md](02-requisitos.md) (RNF-03).


## Admin (`/api/v1/events/[eventId]/admin/…`)

Todas exigem admin.

| Método | Rota | Serviço |
|---|---|---|
| GET | `bootstrap` | `getAdminBootstrap` (eventos, estado, contadores) |
| PUT | `activate` | `activateEvent` |
| PUT | `phase` | `updateAdminPhase` |
| PUT | `state` | `updateAdminState` (visibilidade de nomeações, resultados e módulos) |
| GET, POST | `categories` | `getAdminCategories`, `createCategory` |
| PUT, DELETE | `categories/[categoryId]` | `updateCategory`, `deleteCategory` |
| GET | `category-proposals` | `getCategoryProposals` |
| PUT, DELETE | `category-proposals/[proposalId]` | `updateCategoryProposal`, `deleteCategoryProposal` |
| GET | `measure-proposals` | `getMeasureProposals` |
| PUT, DELETE | `measure-proposals/[proposalId]` | `updateMeasureProposal`, `deleteMeasureProposal` |
| GET | `nominations/paged` | `getAdminNominationsPaged` |
| POST | `nominations/[nomineeId]/approve` | `approveNomination` |
| POST | `nominations/[nomineeId]/reject` | `rejectNomination` |
| POST | `nominations/[nomineeId]/set-category` | `setNominationCategory` |
| GET | `members/paged` | `getAdminMembersPaged` |
| PATCH | `members/[userId]/role` | `setAdminRole` |
| DELETE | `members/[userId]` | `removeEventMember` (tira o membro do evento, a conta mantém-se; recusa admins e o próprio) |
| GET | `votes/paged` | `getAdminVotesPaged` |
| GET | `official-results/paged` | `getAdminOfficialResultsPaged` |
| GET | `secret-santa/state` | `getAdminSecretSantaState` |
| POST | `secret-santa/draw` | `executeSecretSantaDraw` |
| POST | `secret-santa/reveal` | `revealSecretSantaDraw` |

## Códigos de erro

| Status | `code` | Quando |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Corpo inválido (Zod) ou upload rejeitado |
| 400 | `INVALID_SELECTION` | Voto numa opção que não é do boletim |
| 400 | `INVALID_INVITATION`, `INVITATION_USED`, `INVITATION_EXPIRED`, `USER_ALREADY_EXISTS` | Convites |
| 400 | `NOT_ENOUGH_PARTICIPANTS` | Sorteio com menos de 2 membros |
| 401 | `UNAUTHORIZED` | Sem sessão |
| 403 | `FORBIDDEN` | Rota de admin |
| 403 | `NOT_A_MEMBER` | Não é membro do evento |
| 403 | `MODULE_DISABLED` | Módulo fechado para membros |
| 404 | `NOT_FOUND`, `CATEGORY_NOT_FOUND`, `MEMBER_NOT_FOUND` | Recurso inexistente ou de outro evento |
| 409 | `PROPOSALS_CLOSED` | Proposta fora da fase PROPOSALS |
| 409 | `VOTING_CLOSED` | Voto fora da janela de votação |
| 409 | `DRAW_REVEALED`, `NO_DRAW` | Sorteio já revelado, ou nada para revelar |
| 409 | `LAST_ADMIN_REQUIRED`, `SELF_DEMOTION_CONFIRMATION_REQUIRED` | Mudança de papel de admin |
| 429 | `RATE_LIMIT_EXCEEDED` | Demasiados pedidos do mesmo IP |
| 500 | `UNHANDLED_SERVER_ERROR` | Erro inesperado (fica no log) |
