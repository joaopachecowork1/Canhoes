-- CreateEnum
CREATE TYPE "GatheringStatus" AS ENUM ('POLLING', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('GOING', 'NOT_GOING', 'MAYBE');

-- CreateTable
CREATE TABLE "EventGatherings" (
    "Id" VARCHAR(64) NOT NULL,
    "EventId" VARCHAR(64) NOT NULL,
    "CreatedById" UUID NOT NULL,
    "Title" VARCHAR(256) NOT NULL,
    "Description" VARCHAR(2000),
    "Location" VARCHAR(256),
    "Status" "GatheringStatus" NOT NULL DEFAULT 'POLLING',
    "ConfirmedDate" VARCHAR(128),
    "PostId" VARCHAR(64),
    "CreatedAtUtc" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAtUtc" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_EventGatherings" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "EventGatheringDateOptions" (
    "Id" VARCHAR(64) NOT NULL,
    "GatheringId" VARCHAR(64) NOT NULL,
    "DateText" VARCHAR(128) NOT NULL,
    "SortOrder" INTEGER NOT NULL,

    CONSTRAINT "PK_EventGatheringDateOptions" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "EventGatheringDateVotes" (
    "Id" VARCHAR(64) NOT NULL,
    "GatheringId" VARCHAR(64) NOT NULL,
    "OptionId" VARCHAR(64) NOT NULL,
    "UserId" UUID NOT NULL,
    "CreatedAtUtc" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_EventGatheringDateVotes" PRIMARY KEY ("Id")
);

-- CreateTable
CREATE TABLE "EventGatheringRsvps" (
    "Id" VARCHAR(64) NOT NULL,
    "GatheringId" VARCHAR(64) NOT NULL,
    "UserId" UUID NOT NULL,
    "Status" "RsvpStatus" NOT NULL,
    "Note" VARCHAR(512),
    "UpdatedAtUtc" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_EventGatheringRsvps" PRIMARY KEY ("Id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IX_EventGatherings_PostId" ON "EventGatherings"("PostId");

-- CreateIndex
CREATE INDEX "IX_EventGatherings_EventId" ON "EventGatherings"("EventId");

-- CreateIndex
CREATE INDEX "IX_EventGatheringDateOptions_GatheringId_SortOrder" ON "EventGatheringDateOptions"("GatheringId", "SortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "IX_EventGatheringDateVotes_OptionId_UserId" ON "EventGatheringDateVotes"("OptionId", "UserId");

-- CreateIndex
CREATE INDEX "IX_EventGatheringDateVotes_GatheringId_UserId" ON "EventGatheringDateVotes"("GatheringId", "UserId");

-- CreateIndex
CREATE UNIQUE INDEX "IX_EventGatheringRsvps_GatheringId_UserId" ON "EventGatheringRsvps"("GatheringId", "UserId");

-- CreateIndex
CREATE INDEX "IX_EventGatheringRsvps_GatheringId" ON "EventGatheringRsvps"("GatheringId");

-- AddForeignKey
ALTER TABLE "EventGatherings" ADD CONSTRAINT "FK_EventGatherings_PostId" FOREIGN KEY ("PostId") REFERENCES "HubPosts"("Id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventGatheringDateOptions" ADD CONSTRAINT "FK_EventGatheringDateOptions_GatheringId" FOREIGN KEY ("GatheringId") REFERENCES "EventGatherings"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventGatheringDateVotes" ADD CONSTRAINT "FK_EventGatheringDateVotes_GatheringId" FOREIGN KEY ("GatheringId") REFERENCES "EventGatherings"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventGatheringDateVotes" ADD CONSTRAINT "FK_EventGatheringDateVotes_OptionId" FOREIGN KEY ("OptionId") REFERENCES "EventGatheringDateOptions"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventGatheringRsvps" ADD CONSTRAINT "FK_EventGatheringRsvps_GatheringId" FOREIGN KEY ("GatheringId") REFERENCES "EventGatherings"("Id") ON DELETE CASCADE ON UPDATE CASCADE;
