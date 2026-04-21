import { Queue, Worker, JobsOptions, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisConnection.on('error', (err: Error) => {
  logger.error({ err: err.message }, 'Redis connection error');
});

export const QUEUE_NAMES = {
  ingest: 'ingest',
  decay: 'decay',
} as const;

export const ingestQueue = new Queue(QUEUE_NAMES.ingest, { connection: redisConnection });
export const decayQueue = new Queue(QUEUE_NAMES.decay, { connection: redisConnection });

export const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: { age: 3600, count: 500 },
  removeOnFail: { age: 24 * 3600, count: 500 },
};

export async function registerRepeatableDecayJob(): Promise<void> {
  await decayQueue.add(
    'nightly-decay',
    { kind: 'nightly' },
    {
      repeat: { pattern: '0 3 * * *' }, // 03:00 every day
      ...defaultJobOptions,
    },
  );
  logger.info('Scheduled nightly decay job (03:00)');
}

export { Worker, QueueEvents };
