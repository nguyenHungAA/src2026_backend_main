import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import EmailOutbox from '../model/emailOutboxModel.js';
import { processPendingEmails } from '../service/emailOutboxService.js';

const safeEqual = (left: string, right: string): boolean => {
    const leftHash = createHash('sha256').update(left).digest();
    const rightHash = createHash('sha256').update(right).digest();
    return timingSafeEqual(leftHash, rightHash);
};

export const processEmailOutbox = async (req: Request, res: Response): Promise<void> => {
    const expected = process.env.CRON_SECRET;
    const provided = String(req.header('authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!expected || !provided || !safeEqual(expected, provided)) {
        res.status(401).json({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
        return;
    }

    const result = await processPendingEmails(Number(req.query.limit ?? 10));
    res.status(200).json({ message: 'Email outbox processed', data: result });
};

export const getEmailOutboxSummary = async (_req: Request, res: Response): Promise<void> => {
    const data = await EmailOutbox.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 }, oldest: { $min: '$createdAt' } } },
        { $sort: { _id: 1 } },
    ]);
    res.status(200).json({ message: 'Email outbox summary fetched', data });
};
