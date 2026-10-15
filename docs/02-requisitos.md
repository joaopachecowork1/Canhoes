# 2. Requisitos

Os requisitos descrevem o comportamento atual da aplicação. Cada um aponta para o código que o implementa e, quando existe, para o teste que o garante. O que ainda falta ou está errado está em [08-lacunas.md](08-lacunas.md).

## Requisitos funcionais

### Acesso e contas

| ID | Requisito | Código | Teste |
|---|---|---|---|
| RF-01 | O portal é privado: sem sessão, qualquer página em `/canhoes/*` redireciona para o login, exceto `/canhoes/login` e `/canhoes/register`. | `proxy.ts` | `proxy.test.ts` |
| RF-02 | Login com Google, só para admins, membros de um evento, quem já aceitou um convite, ou quem tem um convite aberto para esse email (aceite nesse login). | `lib/domains/auth/services/signInAccess.ts` | `signInAccess.test.ts`, `tests/integration/signIn.int.test.ts` |
| RF-03 | Login com email e password, para contas criadas por convite. | `lib/domains/auth/services/auth.ts` (provider `credentials`) | |
| RF-04 | O admin convida um email e recebe um link `/canhoes/register?token=…` para partilhar; não há envio de email. Convidar de novo o mesmo email substitui o link anterior. | `lib/domains/auth/services/invitations.ts` (`createInvitation`) | `authorization.int.test.ts` |
| RF-05 | Com o link, o convidado escolhe nome e password (mínimo 8 caracteres) e fica membro do evento do convite. | `invitations.ts` (`registerWithInvitation`), `app/api/auth/register/route.ts` | |
| RF-06 | Fora de produção, com `DEV_AUTH_BYPASS_ENABLED=true`, a app entra sozinha como admin de desenvolvimento. | `lib/domains/auth/services/developmentAuth.ts` | `developmentAuth.test.ts` |

### Evento e fases

| ID | Requisito | Código | Teste |
|---|---|---|---|
| RF-10 | Só um evento está ativo de cada vez; o admin pode ativar outro. | `lib/domains/admin/services/state.ts` (`activateEvent`) | |
| RF-11 | O admin muda a fase ativa do evento (DRAW, PROPOSALS, VOTING, RESULTS). Uma fase que o evento ainda não tem é criada nesse momento, aberta durante um ano. | `state.ts` (`updateAdminPhase`) | `adminWorkflow.int.test.ts` |
| RF-12 | O admin liga e desliga cada módulo para os membros. | `state.ts` (`updateEventModules`, `updateAdminState`) | |
| RF-13 | O overview diz a cada utilizador que módulos e ações tem disponíveis agora. | `lib/domains/event/services/event.ts` (`getEventOverview`) | |

### Amigo secreto e wishlist

| ID | Requisito | Código | Teste |
|---|---|---|---|
| RF-20 | Cada membro gere a sua wishlist (título, link, notas, imagem). Todos os membros do evento veem as wishlists do evento. | `lib/domains/members/services/members.ts` | `ownership.int.test.ts` |
| RF-21 | O admin sorteia o amigo secreto entre os membros do evento e pode repetir o sorteio enquanto não o revelar. | `lib/domains/admin/services/secretSanta.ts` | `secretSanta.int.test.ts` |
| RF-22 | O admin revela o sorteio; a partir daí cada membro vê a quem dá o presente e quantos itens tem a wishlist dessa pessoa. | `secretSanta.ts` (`revealSecretSantaDraw`), `lib/domains/secretSanta/services/secretSanta.ts` | `secretSanta.int.test.ts` |

### Propostas, nomeações e medidas

| ID | Requisito | Código | Teste |
|---|---|---|---|
| RF-30 | Os membros propõem categorias novas (nome, descrição, tipo). | `lib/domains/voting/services/voting.ts` (`createProposal`) | `eventRules.int.test.ts` |
| RF-31 | Os membros nomeiam candidatos para uma categoria, ou submetem stickers (`kind: "stickers"`), com imagem opcional. | `members.ts` (`createNomination`, `replaceNomineeImage`) | |
| RF-32 | Os membros propõem medidas para a gala. | `members.ts` (`createMeasureProposal`) | |
| RF-33 | O admin aprova, rejeita, edita ou apaga propostas de categoria e de medida. Aprovar cria a categoria ou a medida da gala, uma só vez mesmo que se aprove de novo. | `lib/domains/admin/services/proposals.ts` | `adminWorkflow.int.test.ts` |
| RF-34 | O admin aprova ou rejeita nomeações e muda a categoria de uma nomeação. | `lib/domains/admin/services/nominations.ts` | |
| RF-35 | O admin cria, edita, ordena, desativa e apaga categorias. | `lib/domains/admin/services/categories.ts` | |

### Votação e gala

| ID | Requisito | Código | Teste |
|---|---|---|---|
| RF-40 | O boletim mostra, por categoria ativa, as opções e o voto atual do membro. Em categorias de nomeação as opções são as nomeações aprovadas; em categorias de pessoa são os membros não admin. | `voting.ts` (`getVotingBoard`) | |
| RF-41 | Cada membro tem um voto por categoria e pode mudá-lo enquanto a votação estiver aberta; conta o último. | `voting.ts` (`castVote`) | `eventRules.int.test.ts` |
| RF-42 | A gala mostra, por categoria ativa, o top 5 com nome, imagem e número de votos, e o total de votos da categoria. | `lib/domains/voting/services/results.ts` | `results.test.ts`, `eventRules.int.test.ts` |
| RF-43 | O admin consulta todos os votos e os resultados oficiais a qualquer momento. | `lib/domains/admin/services/votes.ts` | |

### Mural

| ID | Requisito | Código | Teste |
|---|---|---|---|
| RF-50 | Os membros publicam posts com texto (até 4000 caracteres), até 4 imagens e, opcionalmente, uma sondagem com 2 a 6 opções distintas. | `lib/domains/feed/services/feed.ts`, `lib/zod/feed.ts` | `feed.test.ts` |
| RF-51 | Os membros comentam (com respostas a comentários), reagem com emoji a posts e comentários, dão like ou downvote e votam nas sondagens (um voto por sondagem). | `feed.ts` | `ownership.int.test.ts` |
| RF-52 | Cada um apaga os seus comentários; o admin apaga qualquer post ou comentário. | `feed.ts` (`deleteComment`, `deleteFeedPost`) | `ownership.int.test.ts` |
| RF-53 | O admin fixa posts no topo do mural e ordena os fixados. | `feed.ts` (`togglePin`, `movePinnedPost`) | |

## Regras de negócio

As regras de fase vivem em funções puras em `lib/domains/event/services/eventRules.ts`. A UI (overview) e o servidor (guards em `lib/api/guards.ts`) usam as mesmas funções, por isso o que a UI mostra e o que o servidor aceita não podem divergir.

| ID | Regra | Código | Teste |
|---|---|---|---|
| RN-01 | Admins passam todas as regras de fase e de módulo. | `guards.ts`, `event.ts` | `authorization.int.test.ts` |
| RN-02 | Só membros do evento (ou admins) usam as rotas desse evento; outro utilizador recebe 403 `NOT_A_MEMBER`. | `guards.ts` (`requireEventAccess`) | `authorization.int.test.ts` |
| RN-03 | Um módulo desligado pelo admin, ou fechado na fase atual, desaparece da navegação dos membros. No servidor, a votação e a gala respondem 403 `MODULE_DISABLED` nesse caso; os outros módulos só exigem ser membro (ver [08-lacunas.md](08-lacunas.md)). Um módulo sem valor guardado conta como ligado. | `eventRules.ts` (`resolveMemberModules`), `guards.ts` (`requireModule`) | `eventRules.int.test.ts` |
| RN-04 | Módulos por fase, para membros: | `eventRules.ts` | `eventRules.int.test.ts` |

| Módulo | DRAW | PROPOSALS | VOTING | RESULTS |
|---|---|---|---|---|
| feed, wishlist | sim | sim | sim | sim |
| secretSanta | sim | só se o sorteio já foi revelado | sim | sim |
| categories | não | sim | sim | sim |
| stickers, measures | não | se as nomeações estiverem visíveis | não | não |
| nominees | se as nomeações estiverem visíveis | se as nomeações estiverem visíveis | se as nomeações estiverem visíveis | sim |
| voting | não | não | sim | não |
| gala | não | não | não | sim |

| ID | Regra | Código | Teste |
|---|---|---|---|
| RN-05 | Propostas de categoria, nomeações, stickers e medidas só são aceites na fase PROPOSALS com as nomeações visíveis (409 `PROPOSALS_CLOSED`). | `eventRules.ts` (`canSubmitProposals`), `guards.ts` (`requireProposalsOpen`) | `eventRules.int.test.ts` |
| RN-06 | Um voto só conta dentro das datas da fase VOTING ativa (409 `VOTING_CLOSED`). | `eventRules.ts` (`isVotingOpen`), `voting.ts` | `eventRules.int.test.ts` |
| RN-07 | Um voto só aceita opções do boletim: nomeação aprovada da mesma categoria e evento, ou membro não admin do evento em categorias de pessoa (400 `INVALID_SELECTION`). | `voting.ts` (`castVote`) | `eventRules.int.test.ts` |
| RN-08 | Os resultados só são visíveis a membros na fase RESULTS. | `app/api/v1/events/[eventId]/results/route.ts` (`requireModule(..., "gala")`) | `eventRules.int.test.ts` |
| RN-09 | Empates nos resultados mantêm a ordem em que as opções apareceram nos votos; votos em opções que já não existem contam no total mas não no ranking. | `results.ts` (`rankCategory`) | `results.test.ts` |
| RN-10 | O sorteio forma um único ciclo: ninguém se sorteia a si próprio, cada pessoa dá e recebe exatamente um presente, e não há subgrupos fechados. Usa um gerador aleatório criptográfico. | `lib/domains/secretSanta/services/draw.ts` | `draw.test.ts` |
| RN-11 | O sorteio precisa de pelo menos 2 membros. Repetir apaga o anterior; depois de revelado não pode ser repetido (409 `DRAW_REVEALED`). | `admin/services/secretSanta.ts` | `secretSanta.int.test.ts` |
| RN-12 | Os membros só veem o seu par depois de o admin revelar o sorteio. | `secretSanta/services/secretSanta.ts` (`getOverview`) | `secretSanta.int.test.ts` |
| RN-13 | Um convite expira ao fim de 7 dias e só pode ser usado uma vez. Não se convida um email que já tem conta. | `invitations.ts` | `signIn.int.test.ts` |
| RN-14 | Tem de existir sempre pelo menos um admin; um admin que se retira a si próprio tem de o confirmar. | `lib/domains/admin/services/adminRolePolicy.ts` | `adminRolePolicy.test.ts` |
| RN-15 | Cada ação sobre um post, comentário, opção de sondagem ou item de wishlist confirma que pertence ao evento do URL (404 caso contrário). | `feed.ts` (`assertPostInEvent`), `members.ts` | `ownership.int.test.ts` |
| RN-16 | Só o dono (ou um admin) apaga um comentário, um item de wishlist, ou troca a imagem de uma nomeação ou item. | `feed.ts`, `members.ts` | `ownership.int.test.ts` |

## Requisitos não funcionais

| ID | Requisito | Como é cumprido |
|---|---|---|
| RNF-01 | **Segurança.** Toda a rota de API exige sessão, exceto login, registo, health, telemetria e ficheiros enviados. | Guards em cada route handler; matriz em `tests/integration/authorization.int.test.ts`, que descobre todas as rotas e falha se uma nova ficar sem cobertura |
| RNF-02 | **Segurança.** Uploads só de JPEG, PNG, GIF e WebP até 10 MB, com nomes gerados no servidor e caminhos validados contra path traversal. | `lib/storage/localStorage.ts`; `localStorage.test.ts`, `ownership.int.test.ts` |
| RNF-03 | **Segurança.** Votos e likes têm limite de pedidos por IP (5 e 20 por 10 s). | `lib/middleware/rateLimit.ts` |
| RNF-04 | **Segurança.** Cabeçalhos `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` e `Permissions-Policy` em todas as respostas. | `next.config.mjs`; varrimento OWASP ZAP na CI |
| RNF-05 | **Segurança.** Passwords com bcrypt; sessões JWT de 24 h; o utilizador e o `isAdmin` são relidos da base de dados em cada pedido. | `auth.ts`, `invitations.ts` |
| RNF-06 | **Usabilidade.** Mobile-first (375 px de base), alvos de toque de 44 px, texto de conteúdo de 16 px, bottom sheets em vez de modais. | Convenções em `CLAUDE.md` |
| RNF-07 | **Idioma.** Interface em português de Portugal; código, nomes e commits em inglês. | Convenções em `CLAUDE.md` |
| RNF-08 | **Manutenção.** Lint, tipos, testes unitários e de integração, código morto (knip) e audit de dependências passam em cada PR. | `.github/workflows/ci.yml` |
| RNF-09 | **Operação.** Uma imagem Docker que aplica as migrations, faz o seed mínimo e responde em `/api/health` (503 sem base de dados). | `Dockerfile`, `scripts/docker-start.sh` |
| RNF-10 | **Escala.** Um grupo de dezenas de pessoas numa só instância; o rate limit e os uploads em disco assumem uma única instância. | Ver [08-lacunas.md](08-lacunas.md) e [09-deploy.md](09-deploy.md) |
| RNF-11 | **Operação.** Um merge para `main` chega à produção sem passos manuais, com backup da base de dados antes de cada deploy; um build falhado deixa a versão anterior a correr. | `scripts/update-server.sh`, `deploy/systemd/`; job "Home server deploy" da CI |
