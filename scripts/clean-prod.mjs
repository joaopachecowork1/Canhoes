#!/usr/bin/env node
import crypto from "node:crypto";
import readline from "node:readline";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// O client gerado é TypeScript, executado via tsx
import { PrismaClient } from "../lib/generated/prisma/client.ts";

try {
  process.loadEnvFile(".env");
} catch {
  // Sem ficheiro .env ou já carregado pelo ambiente
}

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Erro: Nem DATABASE_URL_UNPOOLED nem DATABASE_URL estão definidas.");
  process.exit(1);
}

// Oculta a password no log de ligação
function maskConnectionString(url) {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = "******";
    return parsed.toString();
  } catch {
    return "(formato de URL não normalizado)";
  }
}

const adminEmail = (process.env.ADMIN_EMAILS?.split(",")[0]?.trim() || "joaodinispacheco@gmail.com").toLowerCase();

const adminDisplayName = process.env.ADMIN_NAME?.trim() || "João Pacheco";
const adminPassword =
  process.env.ADMIN_PASSWORD?.trim() || "Canhoes_" + crypto.randomBytes(4).toString("hex") + "!2026";
const eventName = process.env.EVENT_NAME?.trim() || "Canhoes do Ano 2026";
const eventId = "canhoes-2026";

async function askConfirmation() {
  if (process.argv.includes("--force") || process.argv.includes("-y")) {
    return true;
  }

  console.log("\n=======================================================");
  console.log("ATENÇÃO: LIMPEZA TOTAL DA BASE DE DADOS");
  console.log("=======================================================");
  console.log(`Destino:      ${maskConnectionString(connectionString)}`);
  console.log(`Admin:        ${adminEmail} (${adminDisplayName})`);
  console.log(`Evento:       ${eventName} (${eventId})`);
  console.log("-------------------------------------------------------");
  console.log("Esta ação vai apagar em definitivo todos os utilizadores");
  console.log("falsos, posts, comentários, sondagens, fotos e nomeações.");
  console.log("As migrações da base de dados são PRESERVADAS.");
  console.log("=======================================================\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("Para confirmar e avançar, escreve 'SIM': ", (answer) => {
      rl.close();
      resolve(answer.trim().toUpperCase() === "SIM");
    });
  });
}

const TABLES_TO_TRUNCATE = [
  "HubPostPollVotes",
  "HubPostPollOptions",
  "HubPostPolls",
  "HubPostLikes",
  "HubPostDownvotes",
  "HubPostCommentReactions",
  "HubPostComments",
  "HubPostReactions",
  "HubPostMedia",
  "HubPosts",
  "EventGatheringRsvps",
  "EventGatheringDateVotes",
  "EventGatheringDateOptions",
  "EventGatherings",
  "StickerReactions",
  "Stickers",
  "WishlistItems",
  "SecretSantaAssignments",
  "SecretSantaDraws",
  "Votes",
  "Nominees",
  "AwardCategories",
  "CategoryProposals",
  "MeasureProposals",
  "Measures",
  "UserInvitations",
  "EventMembers",
  "EventPhases",
  "CanhoesEventState",
  "Events",
  "Users",
];

async function seedCleanEvent(prisma) {
  const event = await prisma.event.create({
    data: {
      id: eventId,
      name: eventName,
      isActive: true,
    },
  });
  console.log(` Evento criado: "${event.name}" (ID: ${event.id})`);

  await prisma.canhoesEventState.create({
    data: {
      eventId: event.id,
      nominationsVisible: true,
      moduleVisibilityJson: {},
      hasSecretSantaDraw: false,
    },
  });
  console.log(" Estado do evento inicializado: Fase de Propostas.");

  const now = new Date();
  const nextYear = new Date(now);
  nextYear.setUTCFullYear(nextYear.getUTCFullYear() + 1);

  await prisma.eventPhase.create({
    data: {
      eventId: event.id,
      type: "PROPOSALS",
      startDateUtc: now,
      endDateUtc: nextYear,
      isActive: true,
    },
  });
  console.log(" Fase PROPOSALS registada e ativa até", nextYear.toISOString().split("T")[0]);

  return { event, now };
}

async function seedCleanAdmin(prisma, createdEventId, now) {
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      displayName: adminDisplayName,
      isAdmin: true,
      externalId: "seed:" + adminEmail,
      passwordHash,
    },
  });
  console.log(` Administrador criado: ${admin.email} (isAdmin: true)`);

  await prisma.eventMember.create({
    data: {
      eventId: createdEventId,
      userId: admin.id,
      role: "admin",
      joinedAtUtc: now,
    },
  });
  console.log(" Administrador inscrito no evento com a função 'admin'.");
  return admin;
}

function printSummary() {
  console.log("\n=======================================================");
  console.log("PRODUÇÃO INICIALIZADA COM SUCESSO!");
  console.log("=======================================================");
  console.log("Resumo da conta Admin:");
  console.log(`- Email:    ${adminEmail}`);
  console.log(`- Nome:     ${adminDisplayName}`);
  console.log("- Google:   Podes entrar diretamente com este email no Google.");
  console.log(`- Password: "${adminPassword}" (se entrares por credenciais).`);
  console.log("\nPróximos passos:");
  console.log("1. Acede ao portal e entra como Admin.");
  console.log("2. Vai a 'Admin -> Membros' (/canhoes/admin/membros).");
  console.log("3. Cria convites e partilha os links com os teus amigos!");
  console.log("=======================================================\n");
}

async function main() {
  const confirmed = await askConfirmation();
  if (!confirmed) {
    console.log("Operação cancelada. Nenhuma alteração foi efetuada.");
    process.exit(0);
  }

  console.log("\nIniciando ligação à base de dados...");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    console.log("A limpar tabelas de conteúdo e utilizadores de teste...");
    const quotedTables = TABLES_TO_TRUNCATE.map((t) => '"' + t + '"').join(", ");
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quotedTables} CASCADE;`);
    console.log(" Todas as tabelas foram limpas com sucesso.");

    console.log("\nA inicializar estado limpo de produção...");
    const { event, now } = await seedCleanEvent(prisma);
    await seedCleanAdmin(prisma, event.id, now);
    printSummary();
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Erro durante a limpeza de produção:", err);
  process.exit(1);
});
