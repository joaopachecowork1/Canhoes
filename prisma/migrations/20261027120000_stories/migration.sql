-- Stories de 24 horas: cada linha guarda a chave do ficheiro (nunca um URL público) e o instante em que expira.
-- O autor e o evento apagam as suas stories por cascata; o ficheiro no R2 é apagado pela limpeza diária.

-- CreateTable
CREATE TABLE "Stories" (
    "Id" VARCHAR(64) NOT NULL,
    "EventId" VARCHAR(64) NOT NULL,
    "AuthorUserId" UUID NOT NULL,
    "StorageKey" VARCHAR(1024) NOT NULL,
    "ContentType" VARCHAR(128) NOT NULL,
    "CreatedAtUtc" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ExpiresAtUtc" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PK_Stories" PRIMARY KEY ("Id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IX_Stories_StorageKey" ON "Stories"("StorageKey");

-- CreateIndex
CREATE INDEX "IX_Stories_EventId_ExpiresAtUtc" ON "Stories"("EventId", "ExpiresAtUtc");

-- CreateIndex
CREATE INDEX "IX_Stories_AuthorUserId_EventId_ExpiresAtUtc" ON "Stories"("AuthorUserId", "EventId", "ExpiresAtUtc");

-- AddForeignKey
ALTER TABLE "Stories" ADD CONSTRAINT "FK_Stories_EventId" FOREIGN KEY ("EventId") REFERENCES "Events"("Id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stories" ADD CONSTRAINT "FK_Stories_AuthorUserId" FOREIGN KEY ("AuthorUserId") REFERENCES "Users"("Id") ON DELETE CASCADE ON UPDATE CASCADE;
