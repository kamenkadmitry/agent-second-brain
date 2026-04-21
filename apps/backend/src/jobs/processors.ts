import { Worker } from 'bullmq';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { redisConnection, QUEUE_NAMES } from './queue.js';
import { runIngestPipeline } from '../services/pipeline.js';
import { ParsedIntent } from '../services/telegram-webhook.js';
import { computeDecayScore, computeTier } from '../services/ebbinghaus.js';

export interface IngestJobData {
  userId: string;
  intent: ParsedIntent;
}

export interface DecayJobData {
  kind: 'nightly' | 'manual';
  userId?: string;
}

export function startWorkers() {
  const ingestWorker = new Worker<IngestJobData>(
    QUEUE_NAMES.ingest,
    async (job) => {
      logger.info({ jobId: job.id }, 'Ingest worker running');
      return runIngestPipeline(job.data.userId, job.data.intent);
    },
    { connection: redisConnection, concurrency: 4 },
  );

  ingestWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'Ingest job failed');
  });

  const decayWorker = new Worker<DecayJobData>(
    QUEUE_NAMES.decay,
    async (job) => {
      logger.info({ jobId: job.id, data: job.data }, 'Decay worker running');
      const where = job.data.userId ? { userId: job.data.userId } : {};
      const memories = await prisma.memory.findMany({ where });
      const now = new Date();
      let changed = 0;
      for (const m of memories) {
        const newScore = computeDecayScore(m.lastAccessed, now);
        const newTier = computeTier(m.lastAccessed, now, m.tier);
        if (Math.abs(newScore - m.decayScore) > 0.1 || newTier !== m.tier) {
          await prisma.memory.update({
            where: { id: m.id },
            data: { decayScore: newScore, tier: newTier },
          });
          changed += 1;
        }
      }
      logger.info({ total: memories.length, changed }, 'Decay pass complete');
      return { total: memories.length, changed };
    },
    { connection: redisConnection, concurrency: 1 },
  );

  decayWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, 'Decay job failed');
  });

  return { ingestWorker, decayWorker };
}
