import { Response } from 'express';
import mongoose from 'mongoose';
import connectDB from '../../config/db.js';
import AuditLog from '../../model/cms/auditLogModel.js';
import type { AuthenticatedRequest } from '../../middleware/authMiddleware.js';

export const ensureMongoConnected = async () => {
    if (mongoose.connection.readyState !== 1) {
        await connectDB();
    }

    return mongoose.connection.readyState === 1;
};

export const sendDatabaseUnavailable = (res: Response) => {
    res.status(503).json({
        message: 'Database is not connected. Check MONGO_URI and MongoDB network access.',
    });
};

export const serializeRecord = <T extends { _id?: unknown; id?: unknown }>(record: T) => ({
    ...record,
    id: String(record._id ?? record.id ?? ''),
});

export const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export const createAuditLog = async (
    req: AuthenticatedRequest,
    action: string,
    targetType: string,
    targetId?: string,
    details: {
        before?: unknown;
        after?: unknown;
        metadata?: Record<string, unknown>;
    } = {},
) => {
    await AuditLog.create({
        actorId: req.user?.id,
        actorEmail: req.user?.email,
        action,
        targetType,
        targetId,
        before: details.before ?? undefined,
        after: details.after ?? undefined,
        metadata: details.metadata,
    });
};
