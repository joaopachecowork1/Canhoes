-- AlterTable
ALTER TABLE "HubPosts" ADD COLUMN "Number" INTEGER NOT NULL DEFAULT 0;

-- Keep today's numbers: each post's place among its event's posts by creation date.
UPDATE "HubPosts" AS post
SET "Number" = numbered.number
FROM (
  SELECT "Id", ROW_NUMBER() OVER (PARTITION BY "EventId" ORDER BY "CreatedAtUtc", "Id")::int AS number
  FROM "HubPosts"
) AS numbered
WHERE post."Id" = numbered."Id";
