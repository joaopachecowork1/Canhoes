# Migrations

O nome de cada pasta fica para sempre. O Prisma regista esse nome na tabela `_prisma_migrations`
de cada base de dados. Se mudares o nome, ele trata a pasta como uma migration nova e volta a
aplicá-la, e em produção isso falha (testado: `column "PinnedOrder" already exists`).

Também não edites um `migration.sql` que já foi aplicado. O `prisma migrate deploy` (produção e
Docker) ignora a alteração, mas o `prisma migrate dev` deteta-a e pede para apagar a base de dados
local. Para mudar o schema, cria uma migration nova com `npx prisma migrate dev --name <nome>`.

Por isso, os nomes sugestivos e a explicação de cada migration ficam neste ficheiro:

| Pasta | Nome sugestivo | O que faz | Porquê |
|---|---|---|---|
| `00000000000000_baseline` | Schema inicial | Cria as 25 tabelas que existiam antes de haver migrations: utilizadores, eventos e fases, categorias, nomeações, propostas, medidas, votos, wishlist, amigo secreto e o mural (posts, comentários, reações, sondagens, media). | Ponto de partida. As bases de dados criadas com `prisma db push` são marcadas como já tendo esta migration (ver `scripts/docker-start.sh`). |
| `20260727150500_event_state_sequence` | Ids automáticos no estado do evento | Cria a sequência `CanhoesEventState_Id_seq`, acerta-a com o maior `Id` existente e passa a usá-la como valor por defeito do `Id`. | Inserir uma linha em `CanhoesEventState` sem dar o `Id` falhava, porque a coluna não tinha valor por defeito. |
| `20260727173000_hub_post_pinned_order` | Ordem dos posts fixados | Acrescenta `HubPosts.PinnedOrder`, numera os posts já fixados de cada evento pela data de criação e cria o índice `(EventId, IsPinned, PinnedOrder)`. | Os admins passaram a poder reordenar os posts fixados no mural. |
| `20261003000000_invitations_passwords_comment_replies` | Convites, palavras-passe e respostas a comentários | Acrescenta `Users.PasswordHash`, `CategoryProposals.Kind`, `HubPostComments.ReplyToId` (com chave estrangeira para o próprio comentário) e a tabela `UserInvitations` (email, token único, validade). Tudo com `IF NOT EXISTS`. | Estas colunas chegaram ao `schema.prisma` sem migration. É idempotente porque as bases de dados criadas com `db push` já as tinham. |
| `20261025000000_unify_votes_and_clean_event_state` | Unificação de votos e limpeza de estado | Adiciona `TargetUserId` a `Votes`, migra dados de `UserVotes`, remove `UserVotes` e remove `Phase` e `ResultsVisible` de `CanhoesEventState`. | Elimina a duplicação histórica de tabelas de votos do backend .NET e remove campos obsoletos não utilizados. |
| `20261025010000_native_prisma_enums` | Enums nativos Prisma e PostgreSQL | Converte colunas com strings livres (`Role`, `Type`, `Status`, `SubmissionKind`) em ENUMs nativos (`EventMemberRole`, `PhaseType`, `ProposalStatus`, `NomineeSubmissionKind`) com normalização prévia de dados. | Garante integridade referencial e validação estrita ao nível do motor de base de dados PostgreSQL. |
| `20261026230000_user_foreign_keys` | Chaves estrangeiras dos utilizadores | Apaga as linhas órfãs (utilizadores que já não existem) e acrescenta 23 chaves estrangeiras para `Users` e `Events`: `CASCADE` na participação, `RESTRICT` no que o utilizador escreveu e nos votos que recebeu, `SET NULL` no autor de um upload. | Membros órfãos faziam a lista de membros contar mais do que mostrava. **Irreversível**: apaga conteúdo de autores inexistentes (posts, nomeações, propostas, sorteios), por isso faz um backup ou uma branch do Neon antes de aplicar. |
