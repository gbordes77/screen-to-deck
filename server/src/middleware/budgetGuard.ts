import { Request, Response, NextFunction } from 'express';
import IORedis from 'ioredis';

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

function getHourKey(): string {
  const d = new Date();
  const hour = `${d.getUTCFullYear()}${(d.getUTCMonth()+1).toString().padStart(2,'0')}${d.getUTCDate().toString().padStart(2,'0')}${d.getUTCHours().toString().padStart(2,'0')}`;
  return `jobs:hour:${hour}`;
}

function getDayKey(): string {
  const d = new Date();
  const day = `${d.getUTCFullYear()}${(d.getUTCMonth()+1).toString().padStart(2,'0')}${d.getUTCDate().toString().padStart(2,'0')}`;
  return `cost:day:${day}`;
}

function estimateCostEur(bytes: number): number {
  // Heuristic: base 0.015 EUR + 0.005 per 1MB chunk
  const mb = bytes / (1024*1024);
  return 0.015 + 0.005 * Math.ceil(Math.max(0, mb));
}

export async function budgetGuard(req: Request, res: Response, next: NextFunction) {
  const maxJobsPerHour = parseInt(process.env.MAX_JOBS_PER_HOUR || '0');
  const maxDailyCost = parseFloat(process.env.MAX_DAILY_COST_EUR || '0');

  try {
    if (!maxJobsPerHour && !maxDailyCost) {
      return next();
    }

    let sizeBytes = 0;
    if ((req as any).file?.size) sizeBytes = (req as any).file.size;
    if ((req as any).body?.image) {
      try { sizeBytes = Buffer.from((req as any).body.image, 'base64').length; } catch {}
    }
    const estCost = estimateCostEur(sizeBytes);

    const multi = await redis.multi()
      .incr(getHourKey())
      .get(getDayKey())
      .exec();

    const jobsCount = (multi?.[0]?.[1] as number) || 0;
    const currentCost = parseFloat(((multi?.[1]?.[1] as string) || '0'));

    if (jobsCount === 1) { await redis.expire(getHourKey(), 3600); }

    if (maxJobsPerHour && jobsCount > maxJobsPerHour) {
      return res.status(429).json({ success: false, error: 'Hourly job limit reached. Please try again later.' });
    }

    if (maxDailyCost && currentCost + estCost > maxDailyCost) {
      return res.status(402).json({ success: false, error: 'Daily OCR budget exceeded. Please try again tomorrow.' });
    }

    await redis.incrbyfloat(getDayKey(), estCost);
    await redis.expire(getDayKey(), 86400);

    (req as any).estimatedCostEur = estCost;
    return next();

  } catch (e) {
    console.warn('budgetGuard error:', (e as Error).message);
    return next();
  }
}
