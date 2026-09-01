import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { cleanupOrphanedLegacyAssets } from '../service/mediaAssetService.js';
import { processPendingEmails } from '../service/emailOutboxService.js';

const safeEqual = (left: string, right: string): boolean => {
    const leftHash = createHash('sha256').update(left).digest();
    const rightHash = createHash('sha256').update(right).digest();
    return timingSafeEqual(leftHash, rightHash);
};

export const runMaintenance = async (req: Request, res: Response): Promise<void> => {
    const expected = process.env.CRON_SECRET;
    const provided = String(req.header('authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!expected || !provided || !safeEqual(expected, provided)) {
        res.status(401).json({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
        return;
    }

    const email = await processPendingEmails(Number(req.query.emailLimit ?? 10));
    const media = await cleanupOrphanedLegacyAssets(Number(req.query.mediaLimit ?? 25));
    res.status(200).json({ message: 'Maintenance completed', data: { email, media } });
};
