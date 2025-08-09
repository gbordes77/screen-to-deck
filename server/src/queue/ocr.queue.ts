import { Queue, Worker, JobsOptions, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

// Disable Redis completely - not needed for basic OCR functionality
let connection: any = null;
let ocrQueue: any = null;
let ocrQueueEvents: any = null;

// Only enable Redis if explicitly requested
if (process.env.USE_REDIS === 'true' && process.env.REDIS_URL) {
  try {
    connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      retryStrategy: () => null,
      enableOfflineQueue: false,
    });
    
    ocrQueue = new Queue('ocr', { connection, defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 1000,
    } as JobsOptions });
    
    ocrQueueEvents = new QueueEvents('ocr', { connection });
  } catch (error) {
    console.log('Redis connection failed, running without queue system');
    connection = null;
    ocrQueue = null;
    ocrQueueEvents = null;
  }
} else {
  console.log('Running without Redis queue system (not required for OCR)');
}

export { ocrQueue, ocrQueueEvents };

export function initOcrWorker(processor: (data: any) => Promise<void>, concurrency = parseInt(((process.env as any)['OCR_CONCURRENCY']) || '2')) {
  if (!connection) {
    console.log('Redis not available, OCR worker disabled');
    return null;
  }
  const worker = new Worker('ocr', async job => {
    await processor(job.data);
  }, { connection, concurrency });
  return worker;
}
