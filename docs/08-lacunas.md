# 8. Lacunas conhecidas

O que a aplicação ainda não faz como devia, por prioridade. Cada linha diz onde está o problema e o que o resolve. Quando uma lacuna for resolvida, sai daqui e o requisito correspondente em [02-requisitos.md](02-requisitos.md) passa a descrever o novo comportamento.

## Bloqueiam o uso numa base de dados nova

| Lacuna | Onde | Como resolver |
|---|---|---|
| Só existe a fase PROPOSALS. O seed cria apenas essa `EventPhase` e nenhum ecrã cria as outras, por isso mudar para DRAW, VOTING ou RESULTS deixa o evento sem fase ativa. | `prisma/seed.mjs`, `lib/domains/admin/services/state.ts` (`updateAdminPhase`) | Criar as quatro fases quando o evento é criado, ou criar a fase em falta ao ativá-la. Decidir junto o que fazer às datas da fase VOTING (hoje são a janela em que os votos contam, e não há ecrã para as mudar). |
| Aprovar uma proposta de medida não cria a `GalaMeasure`; nenhum código a cria, por isso a página de medidas fica sempre vazia. | `lib/domains/admin/services/proposals.ts` (`updateMeasureProposal`) | Ao aprovar, criar a medida, como já acontece com as propostas de categoria. |

## Segurança

| Lacuna | Onde | Como resolver |
|---|---|---|
| Não há Content-Security-Policy. O ZAP regista-a como alerta triado (10038). | `next.config.mjs` | Definir a CSP com nonces no `proxy.ts`, com o domínio final do deploy. |
| Os módulos fechados só são bloqueados no servidor para a votação e a gala; o mural, a wishlist, as categorias e as nomeações respondem a qualquer membro mesmo com o módulo desligado. | `app/api/v1/events/[eventId]/**/route.ts` | Trocar `requireEventAccess` por `requireModule` nessas rotas e acrescentar os casos à matriz de autorização. |
| As páginas de servidor chamam a própria API com `fetch(..., { next: { revalidate: 60 } })` e os cookies do utilizador. É preciso confirmar que a cache de dados do Next.js não partilha respostas entre utilizadores. | `lib/api/canhoesServerClient.ts` | Chamar os serviços diretamente nas páginas de servidor (sem HTTP nem cache partilhada), o que também remove `CANHOES_INTERNAL_URL`. |
| Os ficheiros enviados são públicos para quem tiver o URL (os nomes são aleatórios e impossíveis de adivinhar). | `app/api/uploads/[...path]/route.ts` | Aceitável para o grupo; exigir sessão se as fotos passarem a ser sensíveis. |

## Dados e regras

| Lacuna | Onde | Como resolver |
|---|---|---|
| Aprovar duas vezes a mesma proposta de categoria cria duas categorias. | `proposals.ts` (`updateCategoryProposal`) | Criar a categoria só na transição de `pending` para `approved`. |
| `CanhoesEventState.phase` e `resultsVisible` são escritos mas nenhuma regra os lê. | `state.ts`, `eventRules.ts` | Fase 3 do plano: uma só fonte para a fase do evento. |
| Estados e tipos são strings e números sem enum, e a maior parte das tabelas liga-se por IDs sem chave estrangeira. | `prisma/schema.prisma` | Fase 3 do plano: enums e relações com migrations. |
| O contador de votos do bootstrap do admin só conta votos em nomeações, não em pessoas. | `state.ts` (`getAdminListCounts`) | Somar também `UserVote`. |

## Organização do código

| Lacuna | Onde | Como resolver |
|---|---|---|
| O mesmo domínio vive em `components/`, `lib/domains/*/components` e `hooks/`, e há componentes com mais de 500 linhas (admin e mural). | `lib/domains/admin/components`, `lib/domains/feed` | Fase 2 do plano: `features/<nome>/` com UI, hooks e serviços juntos, e componentes partidos por responsabilidade. |
| A configuração do Prisma está em `package.json#prisma`, que o Prisma 7 remove. | `package.json` | Passar para `prisma.config.ts` na atualização para o Prisma 7. |
