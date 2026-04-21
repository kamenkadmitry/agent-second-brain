import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_USER_EMAIL ?? 'admin@example.com';
  const password = process.env.SEED_USER_PASSWORD ?? 'admin12345';

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password: hash,
      settings: { create: {} },
    },
  });

  const defaultSkills = [
    { name: 'classifier', config: { description: 'LLM classifier for incoming entries' } },
    { name: 'todoist-sync', config: { description: 'Mirror tasks to Todoist' } },
    { name: 'deepgram-transcribe', config: { description: 'Voice → text transcription' } },
    { name: 'ebbinghaus-decay', config: { description: 'Periodic memory decay (cron)' } },
  ];
  for (const s of defaultSkills) {
    await prisma.skill.upsert({
      where: { name: s.name },
      update: {},
      create: { name: s.name, enabled: true, config: s.config },
    });
  }

  // Sample data so the UI renders something on first run.
  const tagIdea = await prisma.tag.upsert({
    where: { name: 'idea' },
    update: {},
    create: { name: 'idea', color: '#6366f1' },
  });
  const tagWork = await prisma.tag.upsert({
    where: { name: 'work' },
    update: {},
    create: { name: 'work', color: '#ef4444' },
  });

  // Sample data is created only on the user's very first boot. After that,
  // the user's own entries/memories/tasks are the source of truth, so we
  // never re-create samples (which would duplicate on every container restart).
  const [existingEntries, existingMemories, existingTasks] = await Promise.all([
    prisma.entry.count({ where: { userId: user.id } }),
    prisma.memory.count({ where: { userId: user.id } }),
    prisma.task.count({ where: { userId: user.id } }),
  ]);
  const userHasData = existingEntries + existingMemories + existingTasks > 0;

  if (!userHasData) {
    await prisma.entry.create({
      data: {
        userId: user.id,
        type: 'text',
        content: 'Welcome! This is a sample entry so the dashboard is not empty on first load.',
        tags: { connect: [{ id: tagIdea.id }] },
      },
    });

    await prisma.memory.create({
      data: {
        userId: user.id,
        content: 'Second brain stores *everything* — even trivial notes may reconnect later.',
        summary: 'Principle: capture before judging relevance.',
        tier: 'Core',
        decayScore: 100,
        tags: { connect: [{ id: tagIdea.id }] },
      },
    });

    await prisma.task.createMany({
      data: [
        { userId: user.id, content: 'Plan quarterly goals',     isUrgent: false, isImportant: true,  status: 'pending' },
        { userId: user.id, content: 'Pay utility bill',         isUrgent: true,  isImportant: true,  status: 'pending' },
        { userId: user.id, content: 'Reply to casual chat',     isUrgent: true,  isImportant: false, status: 'pending' },
        { userId: user.id, content: 'Clean up old screenshots', isUrgent: false, isImportant: false, status: 'pending' },
      ],
    });
  }

  console.log(`Seeded user ${email} / password "${password}" (CHANGE IT!)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
