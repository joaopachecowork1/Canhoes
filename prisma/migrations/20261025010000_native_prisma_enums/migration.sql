-- Migração segura: conversão de strings livres em ENUMs nativos PostgreSQL / Prisma
-- 1. Normalização prévia de dados existentes para garantir conversão sem erros
UPDATE "EventMembers"
SET "Role" = 'participant'
WHERE "Role" = 'member' OR "Role" IS NULL OR "Role" NOT IN ('admin', 'participant');

UPDATE "UserInvitations"
SET "Role" = 'participant'
WHERE "Role" = 'member' OR "Role" IS NULL OR "Role" NOT IN ('admin', 'participant');

UPDATE "Nominees"
SET "SubmissionKind" = 'nominees'
WHERE "SubmissionKind" IS NULL OR "SubmissionKind" NOT IN ('nominees', 'stickers');

UPDATE "Nominees"
SET "Status" = 'pending'
WHERE "Status" IS NULL OR "Status" NOT IN ('pending', 'approved', 'rejected');

UPDATE "CategoryProposals"
SET "Status" = 'pending'
WHERE "Status" IS NULL OR "Status" NOT IN ('pending', 'approved', 'rejected');

UPDATE "MeasureProposals"
SET "Status" = 'pending'
WHERE "Status" IS NULL OR "Status" NOT IN ('pending', 'approved', 'rejected');

-- 2. Criação dos tipos ENUM nativos
CREATE TYPE "EventMemberRole" AS ENUM ('admin', 'participant');
CREATE TYPE "PhaseType" AS ENUM ('DRAW', 'PROPOSALS', 'VOTING', 'RESULTS');
CREATE TYPE "ProposalStatus" AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "NomineeSubmissionKind" AS ENUM ('nominees', 'stickers');

-- 3. Conversão das colunas com cast explícito
ALTER TABLE "EventMembers"
  ALTER COLUMN "Role" TYPE "EventMemberRole" USING ("Role"::"EventMemberRole"),
  ALTER COLUMN "Role" SET DEFAULT 'participant'::"EventMemberRole";

ALTER TABLE "UserInvitations"
  ALTER COLUMN "Role" DROP DEFAULT,
  ALTER COLUMN "Role" TYPE "EventMemberRole" USING ("Role"::"EventMemberRole"),
  ALTER COLUMN "Role" SET DEFAULT 'participant'::"EventMemberRole";

ALTER TABLE "EventPhases"
  ALTER COLUMN "Type" TYPE "PhaseType" USING ("Type"::"PhaseType");

ALTER TABLE "Nominees"
  ALTER COLUMN "SubmissionKind" TYPE "NomineeSubmissionKind" USING ("SubmissionKind"::"NomineeSubmissionKind"),
  ALTER COLUMN "SubmissionKind" SET DEFAULT 'nominees'::"NomineeSubmissionKind",
  ALTER COLUMN "Status" TYPE "ProposalStatus" USING ("Status"::"ProposalStatus");

ALTER TABLE "CategoryProposals"
  ALTER COLUMN "Status" TYPE "ProposalStatus" USING ("Status"::"ProposalStatus");

ALTER TABLE "MeasureProposals"
  ALTER COLUMN "Status" TYPE "ProposalStatus" USING ("Status"::"ProposalStatus");
