import { Request, Response } from 'express';
import AuditLog from '../../model/cms/auditLogModel.js';
import {
    ensureMongoConnected,
    isValidObjectId,
    sendDatabaseUnavailable,
    serializeRecord,
} from './cmsUtils.js';

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        const filter: Record<string, unknown> = {};
        if (typeof req.query.actor === 'string') filter.actorEmail = new RegExp(req.query.actor, 'i');
        if (typeof req.query.action === 'string') filter.action = req.query.action;
        if (typeof req.query.targetType === 'string') filter.targetType = req.query.targetType;

        if (typeof req.query.dateFrom === 'string' || typeof req.query.dateTo === 'string') {
            const createdAt: Record<string, Date> = {};
            if (typeof req.query.dateFrom === 'string') createdAt.$gte = new Date(req.query.dateFrom);
            if (typeof req.query.dateTo === 'string') createdAt.$lte = new Date(req.query.dateTo);
            filter.createdAt = createdAt;
        }

        const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(200).lean();
        res.status(200).json({ message: 'Audit logs fetched successfully', data: logs.map(serializeRecord) });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ message: 'Failed to fetch audit logs' });
    }
};

export const getAuditLog = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id ?? '');
        if (!isValidObjectId(id)) {
            res.status(400).json({ message: 'Invalid audit log ID' });
            return;
        }

        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        const log = await AuditLog.findById(id).lean();
        if (!log) {
            res.status(404).json({ message: 'Audit log not found' });
            return;
        }

        res.status(200).json({ message: 'Audit log fetched successfully', data: serializeRecord(log) });
    } catch (error) {
        console.error('Error fetching audit log:', error);
        res.status(500).json({ message: 'Failed to fetch audit log' });
    }
};
