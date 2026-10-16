import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function adminEmails() {
  const configured = process.env.ADMIN_EMAILS?.trim()
    || process.env.DEV_AUTH_EMAIL?.trim()
    || "dev@example.com";
  return configured
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

// Fake members, categories and posts are for local development. A production container only gets
// the admins and the event, unless SEED_DEMO_DATA=true.
const shouldSeedDemoData = process.env.SEED_DEMO_DATA
  ? process.env.SEED_DEMO_DATA === "true"
  : process.env.NODE_ENV !== "production";

const randomEl = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function main() {
  console.log("Seeding admins and the event...");

  // 1. Ensure Admins
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

  // 2. Event & State
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

  // Initial state only: the seed runs on every container start and must not reset the phase.
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

async function seedDemoData(eventId, seededAdmins, now) {
  console.log("Adding demo data...");

  // 3. Fake Users
  const fakeUsers = [
    { email: "rui.silva@fake.com", name: "Rui Silva" },
    { email: "joao.santos@fake.com", name: "João Santos" },
    { email: "maria.costa@fake.com", name: "Maria Costa" },
    { email: "ana.pereira@fake.com", name: "Ana Pereira" },
    { email: "pedro.gomes@fake.com", name: "Pedro Gomes" },
  ];

  const createdFakeUsers = [];
  for (const fake of fakeUsers) {
    const user = await prisma.user.upsert({
      where: { email: fake.email },
      update: {},
      create: {
        externalId: `seed:${fake.email}`,
        email: fake.email,
        displayName: fake.name,
        isAdmin: false,
      },
    });
    createdFakeUsers.push(user);

    await prisma.eventMember.upsert({
      where: { eventId_userId: { eventId, userId: user.id } },
      update: {},
      create: {
        eventId,
        userId: user.id,
        role: "member",
        joinedAtUtc: now,
      },
    });
  }

  const allUsers = [...seededAdmins, ...createdFakeUsers];

  // 4. Categories & Nominees
  const categoriesData = [
    { id: "seed-cat-1", name: "Maior Bebedeira", description: "Quem deu o maior espetáculo?", voteQuestion: "Quem ganha a Maior Bebedeira?", sortOrder: 1, kind: 0, isActive: true },
    { id: "seed-cat-2", name: "Prémio Engate", description: "O rei ou rainha da pista.", voteQuestion: "Quem é o maior sedutor?", sortOrder: 2, kind: 0, isActive: true },
    { id: "seed-cat-3", name: "Melhor Desculpa", description: "A desculpa mais criativa para faltar ao jantar.", voteQuestion: "Qual foi a melhor desculpa?", sortOrder: 3, kind: 0, isActive: true },
  ];

  for (const cat of categoriesData) {
    const existingCat = await prisma.awardCategory.findFirst({ where: { name: cat.name, eventId } });
    let catId = existingCat?.id;
    if (!existingCat) {
      const newCat = await prisma.awardCategory.create({
        data: { ...cat, eventId, voteRules: {} }
      });
      catId = newCat.id;
      
      // Create Nominees for this new category
      const nomineesData = [
        { title: `O tombo do ${randomEl(allUsers).displayName}`, status: "approved" },
        { title: `A dança de ${randomEl(allUsers).displayName}`, status: "approved" },
        { title: `${randomEl(allUsers).displayName} a dormir no sofá`, status: "approved" },
      ];

      for (const nom of nomineesData) {
        await prisma.nominee.create({
          data: {
            eventId,
            categoryId: catId,
            title: nom.title,
            submissionKind: "nominees",
            submittedByUserId: randomEl(allUsers).id,
            status: nom.status,
          }
        });
      }
    }
  }

  // 5. Fake Feed Posts
  // Only add if feed is kinda empty to avoid spamming existing DB too much
  const existingPosts = await prisma.hubPost.count({ where: { eventId } });
  if (existingPosts < 10) {
    const postsData = [
      { text: "Lembram-se da passagem de ano de 2018? Que loucura!", isPinned: false, mediaUrl: "https://picsum.photos/seed/canhoes1/800/600" },
      { text: "Já marquei o restaurante para este ano. Preparem-se!", isPinned: true, pinnedOrder: 1, mediaUrl: null },
      { text: "Alguém tem fotos da última festa?", isPinned: false, mediaUrl: null },
      { text: "Encontrei esta pérola no telemóvel do Rui 😂", isPinned: false, mediaUrl: "https://picsum.photos/seed/canhoes2/800/1000" },
      { text: "O troféu do ano passado já está polido e pronto para o novo vencedor!", isPinned: false, mediaUrl: "https://picsum.photos/seed/canhoes3/600/600" },
    ];

    for (const pd of postsData) {
      const post = await prisma.hubPost.create({
        data: {
          eventId,
          authorUserId: randomEl(allUsers).id,
          text: pd.text,
          mediaUrl: pd.mediaUrl,
          isPinned: pd.isPinned,
          pinnedOrder: pd.pinnedOrder,
        }
      });

      // Add a poll to the restaurant one
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
              ]
            }
          }
        });
      }

      // Add comments
      await prisma.hubPostComment.create({
        data: {
          postId: post.id,
          userId: randomEl(allUsers).id,
          text: "Nem me fales, ainda me dói a cabeça só de pensar nisso 😂",
        }
      });
      await prisma.hubPostComment.create({
        data: {
          postId: post.id,
          userId: randomEl(allUsers).id,
          text: "+1!",
        }
      });

      // Add reactions
      await prisma.hubPostReaction.create({
        data: {
          postId: post.id,
          userId: randomEl(allUsers).id,
          emoji: "🔥",
        }
      });
      await prisma.hubPostReaction.create({
        data: {
          postId: post.id,
          userId: randomEl(allUsers).id,
          emoji: "😂",
        }
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
