import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// O client gerado é TypeScript, por isso o seed corre com tsx (ver prisma.config.ts).
import { PrismaClient } from "../lib/generated/prisma/client.ts";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// Emails dos admins a criar: `ADMIN_EMAILS`, senão o email de login de desenvolvimento.
function adminEmails() {
  const configured = process.env.ADMIN_EMAILS?.trim() || process.env.DEV_AUTH_EMAIL?.trim() || "dev@example.com";
  return configured
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

// Membros, categorias e publicações falsos são para desenvolvimento local. Um contentor de produção
// só recebe os admins e o evento, a não ser que SEED_DEMO_DATA=true.
const shouldSeedDemoData = process.env.SEED_DEMO_DATA
  ? process.env.SEED_DEMO_DATA === "true"
  : process.env.NODE_ENV !== "production";

// Escolhe um elemento ao acaso de uma lista.
const randomEl = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function main() {
  console.log("Seeding admins and the event...");

  // 1. Garante os admins (a password só é definida se ainda não tiverem uma)
  const seededAdmins = [];
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  if (adminPassword && adminPassword.length < 8) {
    throw new Error("ADMIN_PASSWORD must contain at least 8 characters.");
  }

  for (const email of adminEmails()) {
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        externalId: `seed:${email}`,
        email,
        displayName: email.split("@")[0],
        isAdmin: true,
      },
    });
    if (adminPassword && !user.passwordHash) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await bcrypt.hash(adminPassword, 10) },
      });
    }
    seededAdmins.push(user);
  }

  // 2. Evento e estado
  const eventId = "canhoes-local";
  await prisma.event.upsert({
    where: { id: eventId },
    update: {},
    create: {
      id: eventId,
      name: "Canhões do Ano",
      isActive: true,
    },
  });

  // Só o estado inicial: o seed corre em cada arranque do contentor e não pode repor a fase.
  await prisma.canhoesEventState.upsert({
    where: { eventId },
    update: {},
    create: {
      eventId,
      phase: "Proposals",
      nominationsVisible: true,
      resultsVisible: false,
      moduleVisibilityJson: {},
      hasSecretSantaDraw: false,
    },
  });

  // A fase de propostas fica aberta durante um ano a partir de agora.
  const now = new Date();
  const nextYear = new Date(now);
  nextYear.setUTCFullYear(nextYear.getUTCFullYear() + 1);

  await prisma.eventPhase.upsert({
    where: { eventId_type: { eventId, type: "PROPOSALS" } },
    update: {},
    create: {
      eventId,
      type: "PROPOSALS",
      startDateUtc: now,
      endDateUtc: nextYear,
      isActive: true,
    },
  });

  // Os admins são membros do evento.
  for (const admin of seededAdmins) {
    await prisma.eventMember.upsert({
      where: { eventId_userId: { eventId, userId: admin.id } },
      update: {},
      create: {
        eventId,
        userId: admin.id,
        role: "admin",
        joinedAtUtc: now,
      },
    });
  }

  if (shouldSeedDemoData) {
    await seedDemoData(eventId, seededAdmins, now);
  }

  console.log("Seed completed.");
}

/** Membros de demonstração, três categorias com nomeações aprovadas e algumas publicações, para uma base de dados local. */
async function seedDemoData(eventId, seededAdmins, now) {
  console.log("Adding demo data...");
  const allUsers = [...seededAdmins, ...(await seedDemoMembers(eventId, now))];
  await seedDemoCategories(eventId, allUsers);
  await seedDemoPosts(eventId, allUsers);
}

// Cria cinco membros falsos e junta-os ao evento.
async function seedDemoMembers(eventId, now) {
  const fakeUsers = [
    { email: "rui.silva@fake.com", name: "Rui Silva" },
    { email: "joao.santos@fake.com", name: "João Santos" },
    { email: "maria.costa@fake.com", name: "Maria Costa" },
    { email: "ana.pereira@fake.com", name: "Ana Pereira" },
    { email: "pedro.gomes@fake.com", name: "Pedro Gomes" },
  ];

  const members = [];
  for (const fake of fakeUsers) {
    const user = await prisma.user.upsert({
      where: { email: fake.email },
      update: {},
      create: { externalId: `seed:${fake.email}`, email: fake.email, displayName: fake.name, isAdmin: false },
    });
    members.push(user);

    await prisma.eventMember.upsert({
      where: { eventId_userId: { eventId, userId: user.id } },
      update: {},
      create: { eventId, userId: user.id, role: "member", joinedAtUtc: now },
    });
  }
  return members;
}

/** Cada categoria é criada uma só vez, com três nomeações aprovadas sobre membros ao acaso. */
async function seedDemoCategories(eventId, allUsers) {
  const categoriesData = [
    {
      id: "seed-cat-1",
      name: "Maior Bebedeira",
      description: "Quem deu o maior espetáculo?",
      voteQuestion: "Quem ganha a Maior Bebedeira?",
      sortOrder: 1,
      kind: 0,
      isActive: true,
    },
    {
      id: "seed-cat-2",
      name: "Prémio Engate",
      description: "O rei ou rainha da pista.",
      voteQuestion: "Quem é o maior sedutor?",
      sortOrder: 2,
      kind: 0,
      isActive: true,
    },
    {
      id: "seed-cat-3",
      name: "Melhor Desculpa",
      description: "A desculpa mais criativa para faltar ao jantar.",
      voteQuestion: "Qual foi a melhor desculpa?",
      sortOrder: 3,
      kind: 0,
      isActive: true,
    },
  ];

  for (const cat of categoriesData) {
    if (await prisma.awardCategory.findFirst({ where: { name: cat.name, eventId } })) continue;

    const category = await prisma.awardCategory.create({ data: { ...cat, eventId, voteRules: {} } });
    const titles = [
      `O tombo do ${randomEl(allUsers).displayName}`,
      `A dança de ${randomEl(allUsers).displayName}`,
      `${randomEl(allUsers).displayName} a dormir no sofá`,
    ];
    for (const title of titles) {
      await prisma.nominee.create({
        data: {
          eventId,
          categoryId: category.id,
          title,
          submissionKind: "nominees",
          submittedByUserId: randomEl(allUsers).id,
          status: "approved",
        },
      });
    }
  }
}

/** Cinco publicações (uma fixada, com sondagem), cada uma com comentários e reações; ignorado quando o mural já tem 10. */
async function seedDemoPosts(eventId, allUsers) {
  const existingPosts = await prisma.hubPost.count({ where: { eventId } });
  if (existingPosts < 10) {
    const postsData = [
      {
        text: "Lembram-se da passagem de ano de 2018? Que loucura!",
        isPinned: false,
        mediaUrl: "https://picsum.photos/seed/canhoes1/800/600",
      },
      { text: "Já marquei o restaurante para este ano. Preparem-se!", isPinned: true, pinnedOrder: 1, mediaUrl: null },
      { text: "Alguém tem fotos da última festa?", isPinned: false, mediaUrl: null },
      {
        text: "Encontrei esta pérola no telemóvel do Rui 😂",
        isPinned: false,
        mediaUrl: "https://picsum.photos/seed/canhoes2/800/1000",
      },
      {
        text: "O troféu do ano passado já está polido e pronto para o novo vencedor!",
        isPinned: false,
        mediaUrl: "https://picsum.photos/seed/canhoes3/600/600",
      },
    ];

    for (const [index, pd] of postsData.entries()) {
      const post = await prisma.hubPost.create({
        data: {
          eventId,
          number: existingPosts + index + 1,
          authorUserId: randomEl(allUsers).id,
          text: pd.text,
          mediaUrl: pd.mediaUrl,
          isPinned: pd.isPinned,
          pinnedOrder: pd.pinnedOrder,
        },
      });

      // A publicação do restaurante (a fixada) leva uma sondagem
      if (pd.isPinned) {
        await prisma.hubPostPoll.create({
          data: {
            postId: post.id,
            question: "Preferem carne ou peixe?",
            options: {
              create: [
                { text: "Carne", sortOrder: 1 },
                { text: "Peixe", sortOrder: 2 },
                { text: "Vegetariano (lol)", sortOrder: 3 },
              ],
            },
          },
        });
      }

      // Comentários
      await prisma.hubPostComment.create({
        data: {
          postId: post.id,
          userId: randomEl(allUsers).id,
          text: "Nem me fales, ainda me dói a cabeça só de pensar nisso 😂",
        },
      });
      await prisma.hubPostComment.create({
        data: {
          postId: post.id,
          userId: randomEl(allUsers).id,
          text: "+1!",
        },
      });

      // Reações
      await prisma.hubPostReaction.create({
        data: {
          postId: post.id,
          userId: randomEl(allUsers).id,
          emoji: "🔥",
        },
      });
      await prisma.hubPostReaction.create({
        data: {
          postId: post.id,
          userId: randomEl(allUsers).id,
          emoji: "😂",
        },
      });
    }
  }
}

main()
  .finally(async () => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
