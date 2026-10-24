-- 1. Unificar votos em Votes
ALTER TABLE "Votes" ADD COLUMN IF NOT EXISTS "TargetUserId" UUID;
ALTER TABLE "Votes" ALTER COLUMN "NomineeId" DROP NOT NULL;

-- Se existirem dados em UserVotes, migra-os para Votes
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'UserVotes') THEN
    INSERT INTO "Votes" ("Id", "EventId", "CategoryId", "UserId", "TargetUserId", "CreatedAtUtc", "UpdatedAtUtc")
    SELECT "Id", "EventId", "CategoryId", "VoterUserId", "TargetUserId", "UpdatedAtUtc", "UpdatedAtUtc"
    FROM "UserVotes"
    ON CONFLICT ("CategoryId", "UserId") DO UPDATE
    SET "TargetUserId" = EXCLUDED."TargetUserId", "NomineeId" = NULL, "UpdatedAtUtc" = EXCLUDED."UpdatedAtUtc";

    DROP TABLE "UserVotes";
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "IX_Votes_TargetUserId" ON "Votes"("TargetUserId");

-- 2. Limpar campos obsoletos em CanhoesEventState
ALTER TABLE "CanhoesEventState" DROP COLUMN IF EXISTS "Phase";
ALTER TABLE "CanhoesEventState" DROP COLUMN IF EXISTS "ResultsVisible";
