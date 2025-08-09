import { Queue, Worker, JobsOptions, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(((process.env as any)['REDIS_URL']) || 'redis://localhost:6379');

export const ocrQueue = new Queue('ocr', { connection, defaultJobOptions: {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: 1000,
  removeOnFail: 1000,
} as JobsOptions });

export const ocrQueueEvents = new QueueEvents('ocr', { connection });

export function initOcrWorker(processor: (data: any) => Promise<void>, concurrency = parseInt(((process.env as any)['OCR_CONCURRENCY']) || '2')) {
  const worker = new Worker('ocr', async job => {
    await processor(job.data);
  }, { connection, concurrency });
  return worker;
}
