-- Integridade dos utilizadores: cada coluna que guarda um id de utilizador passa a ter chave estrangeira.
--  * CASCADE para participação (membro do evento, votos que deu, reações, RSVPs, lista de desejos);
--  * RESTRICT para o que o utilizador escreveu ou sorteou, e para os votos que recebeu (posts, comentários,
--    propostas, amigo secreto, histórico das votações);
--  * SET NULL no autor de um upload, que já era opcional.
-- Uma FK falha se existir uma linha órfã, por isso a limpeza vem primeiro. É irreversível: faz um
-- backup ou uma branch do Neon antes de aplicar em produção.

-- 1. Posts de autores que já não existem (comentários, reações, sondagens e média vão atrás por cascata).
DELETE FROM "HubPosts" p WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Id" = p."AuthorUserId");

-- 2. Comentários órfãos; as respostas de outros passam a comentários de topo para a FK de resposta não bloquear.
UPDATE "HubPostComments" c SET "ReplyToId" = NULL
WHERE c."ReplyToId" IN (
  SELECT o."Id" FROM "HubPostComments" o WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Id" = o."UserId")
);
DELETE FROM "HubPostComments" c WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Id" = c."UserId");

-- 3. Participação órfã.
DELETE FROM "EventMembers" m
WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Id" = m."UserId")
   OR NOT EXISTS (SELECT 1 FROM "Events" e WHERE e."Id" = m."EventId");
DELETE FROM "Votes" v
WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Id" = v."UserId")
   OR (v."TargetUserId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Id" = v."TargetUserId"));
DELETE FROM "WishlistItems" w WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Id" = w."UserId");
DELETE FROM "HubPostDownvotes" d WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Id" = d."UserId");
DELETE FROM "HubPostReactions" r WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Id" = r."UserId");
DELETE FROM "HubPostCommentReactions" r WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Id" = r."UserId");
DELETE FROM "HubPostPollVotes" v WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Id" = v."UserId");
DELETE FROM "HubPostLikes" l WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Id" = l."UserId");
DELETE FROM "EventGatheringDateVotes" v WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Id" = v."UserId");
DELETE FROM "EventGatheringRsvps" r WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Id" = r."UserId");

-- 4. Conteúdo órfão.
DELETE FROM "EventGatherings" g WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Id" = g."CreatedById");
-- Os votos nas nomeações que vão sair não ficam a apontar para o vazio (NomineeId não tem FK).
DELETE FROM "Votes" v
WHERE v."NomineeId" IN (
  SELECT n."Id" FROM "Nominees" n WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Id" = n."SubmittedByUserId")
);
DELETE FROM "Nominees" n WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Id" = n."SubmittedByUserId");
DELETE FROM "CategoryProposals" c WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Id" = c."ProposedByUserId");
DELETE FROM "MeasureProposals" m WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Id" = m."ProposedByUserId");
DELETE FROM "UserInvitations" i WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Id" = i."InvitedByUserId");

-- 5. Amigo secreto: um sorteio sem criador sai com as suas atribuições (a coluna DrawId não tem FK).
DELETE FROM "SecretSantaAssignments" a
WHERE a."DrawId" IN (
  SELECT d."Id" FROM "SecretSantaDraws" d WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Id" = d."CreatedByUserId")
);
DELETE FROM "SecretSantaDraws" d WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Id" = d."CreatedByUserId");
DELETE FROM "SecretSantaAssignments" a
WHERE NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Id" = a."GiverUserId")
   OR NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Id" = a."ReceiverUserId");

-- O estado do evento não pode dizer que há sorteio quando já não há nenhum.
UPDATE "CanhoesEventState" s SET "HasSecretSantaDraw" = false
WHERE s."HasSecretSantaDraw"
  AND NOT EXISTS (SELECT 1 FROM "SecretSantaDraws" d WHERE d."EventCode" = COALESCE(s."SecretSantaEventCode", s."EventId"));

-- 6. Uploads: o ficheiro fica, só se perde a referência ao autor.
UPDATE "HubPostMedia" m SET "UploadedByUserId" = NULL
WHERE m."UploadedByUserId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Users" u WHERE u."Id" = m."UploadedByUserId");

-- AddForeignKey
ALTER TABLE "UserInvitations" ADD CONSTRAINT "FK_UserInvitations_InvitedByUserId" FOREIGN KEY ("InvitedByUserId") REFERENCES "Users"("Id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMembers" ADD CONSTRAINT "FK_EventMembers_UserId" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMembers" ADD CONSTRAINT "FK_EventMembers_EventId" FOREIGN KEY ("EventId") REFERENCES "Events"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nominees" ADD CONSTRAINT "FK_Nominees_SubmittedByUserId" FOREIGN KEY ("SubmittedByUserId") REFERENCES "Users"("Id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryProposals" ADD CONSTRAINT "FK_CategoryProposals_ProposedByUserId" FOREIGN KEY ("ProposedByUserId") REFERENCES "Users"("Id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeasureProposals" ADD CONSTRAINT "FK_MeasureProposals_ProposedByUserId" FOREIGN KEY ("ProposedByUserId") REFERENCES "Users"("Id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Votes" ADD CONSTRAINT "FK_Votes_UserId" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Votes" ADD CONSTRAINT "FK_Votes_TargetUserId" FOREIGN KEY ("TargetUserId") REFERENCES "Users"("Id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItems" ADD CONSTRAINT "FK_WishlistItems_UserId" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretSantaDraws" ADD CONSTRAINT "FK_SecretSantaDraws_CreatedByUserId" FOREIGN KEY ("CreatedByUserId") REFERENCES "Users"("Id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretSantaAssignments" ADD CONSTRAINT "FK_SecretSantaAssignments_GiverUserId" FOREIGN KEY ("GiverUserId") REFERENCES "Users"("Id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecretSantaAssignments" ADD CONSTRAINT "FK_SecretSantaAssignments_ReceiverUserId" FOREIGN KEY ("ReceiverUserId") REFERENCES "Users"("Id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubPosts" ADD CONSTRAINT "FK_HubPosts_AuthorUserId" FOREIGN KEY ("AuthorUserId") REFERENCES "Users"("Id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubPostDownvotes" ADD CONSTRAINT "FK_HubPostDownvotes_UserId" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubPostComments" ADD CONSTRAINT "FK_HubPostComments_UserId" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubPostReactions" ADD CONSTRAINT "FK_HubPostReactions_UserId" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubPostCommentReactions" ADD CONSTRAINT "FK_HubPostCommentReactions_UserId" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubPostPollVotes" ADD CONSTRAINT "FK_HubPostPollVotes_UserId" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubPostMedia" ADD CONSTRAINT "FK_HubPostMedia_UploadedByUserId" FOREIGN KEY ("UploadedByUserId") REFERENCES "Users"("Id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubPostLikes" ADD CONSTRAINT "FK_HubPostLikes_UserId" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventGatherings" ADD CONSTRAINT "FK_EventGatherings_CreatedById" FOREIGN KEY ("CreatedById") REFERENCES "Users"("Id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventGatheringDateVotes" ADD CONSTRAINT "FK_EventGatheringDateVotes_UserId" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventGatheringRsvps" ADD CONSTRAINT "FK_EventGatheringRsvps_UserId" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

