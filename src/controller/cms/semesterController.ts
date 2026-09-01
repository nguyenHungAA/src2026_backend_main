import { Request, Response } from 'express';
import Semester from '../../model/cms/semesterModel.js';
import type { SemesterStatus } from '../../model/cms/semesterModel.js';
import type { AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import {
    createAuditLog,
    ensureMongoConnected,
    isValidObjectId,
    sendDatabaseUnavailable,
    serializeRecord,
} from './cmsUtils.js';
import { logger } from '../../utils/logger.js';

const readSemesterPayload = (body: Record<string, unknown>) => ({
    code: typeof body.code === 'string' ? body.code.trim() : '',
    name: typeof body.name === 'string' ? body.name.trim() : '',
    slug: typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '',
    status: body.status === 'active' || body.status === 'archived' ? body.status : 'draft' as SemesterStatus,
    startDate: body.startDate,
    endDate: body.endDate,
    description: typeof body.description === 'string' ? body.description.trim() : '',
});

const validateSemesterPayload = (
    payload: ReturnType<typeof readSemesterPayload>,
    partial = false
) => {
    const errors: Record<string, string> = {};

    if (!partial || payload.code) {
        if (!payload.code) errors.code = 'Code is required';
    }
    if (!partial || payload.name) {
        if (!payload.name) errors.name = 'Name is required';
    }
    if (!partial || payload.slug) {
        if (!payload.slug) errors.slug = 'Slug is required';
    }

    const start = payload.startDate ? new Date(String(payload.startDate)) : null;
    const end = payload.endDate ? new Date(String(payload.endDate)) : null;

    if (!partial && !start) errors.startDate = 'Start date is required';
    if (!partial && !end) errors.endDate = 'End date is required';
    if (start && Number.isNaN(start.getTime())) errors.startDate = 'Start date is invalid';
    if (end && Number.isNaN(end.getTime())) errors.endDate = 'End date is invalid';
    if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start >= end) {
        errors.endDate = 'End date must be after start date';
    }

    return errors;
};

export const getAdminSemesters = async (_req: Request, res: Response): Promise<void> => {
    try {
        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        const semesters = await Semester.find({}).sort({ startDate: -1 }).lean();
        res.status(200).json({ message: 'Semesters fetched successfully', data: semesters.map(serializeRecord) });
    } catch (error) {
        logger.error('semester.list_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Failed to fetch semesters' });
    }
};

export const getAdminSemester = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id ?? '');
        if (!isValidObjectId(id)) {
            res.status(400).json({ message: 'Invalid semester ID' });
            return;
        }

        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        const semester = await Semester.findById(id).lean();
        if (!semester) {
            res.status(404).json({ message: 'Semester not found' });
            return;
        }

        res.status(200).json({ message: 'Semester fetched successfully', data: serializeRecord(semester) });
    } catch (error) {
        logger.error('semester.get_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Failed to fetch semester' });
    }
};

export const createSemester = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const payload = readSemesterPayload(req.body ?? {});
        const errors = validateSemesterPayload(payload);
        if (Object.keys(errors).length > 0) {
            res.status(400).json({ message: 'Semester validation failed', errors });
            return;
        }

        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        const semester = await Semester.create({
            ...payload,
            startDate: new Date(String(payload.startDate)),
            endDate: new Date(String(payload.endDate)),
        });
        const semesterRecord = semester.toObject();
        await createAuditLog(req, 'semester.create', 'semester', String(semester._id), {
            after: semesterRecord,
        });

        res.status(201).json({ message: 'Semester created successfully', data: serializeRecord(semesterRecord) });
    } catch (error) {
        logger.error('semester.create_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Failed to create semester' });
    }
};

export const updateSemester = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id ?? '');
        if (!isValidObjectId(id)) {
            res.status(400).json({ message: 'Invalid semester ID' });
            return;
        }

        const rawPayload = readSemesterPayload(req.body ?? {});
        const payload = {
            ...rawPayload,
            ...(rawPayload.startDate ? { startDate: new Date(String(rawPayload.startDate)) } : {}),
            ...(rawPayload.endDate ? { endDate: new Date(String(rawPayload.endDate)) } : {}),
        };
        const errors = validateSemesterPayload(rawPayload, true);
        if (Object.keys(errors).length > 0) {
            res.status(400).json({ message: 'Semester validation failed', errors });
            return;
        }

        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        const before = await Semester.findById(id).lean();
        const semester = await Semester.findByIdAndUpdate(id, payload, {
            new: true,
            runValidators: true,
        }).lean();

        if (!semester) {
            res.status(404).json({ message: 'Semester not found' });
            return;
        }

        await createAuditLog(req, 'semester.update', 'semester', id, { before, after: semester });
        res.status(200).json({ message: 'Semester updated successfully', data: serializeRecord(semester) });
    } catch (error) {
        logger.error('semester.update_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Failed to update semester' });
    }
};

export const activateSemester = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id ?? '');
        if (!isValidObjectId(id)) {
            res.status(400).json({ message: 'Invalid semester ID' });
            return;
        }

        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        await Semester.updateMany({ _id: { $ne: id }, status: 'active' }, { $set: { status: 'archived' } });
        const semester = await Semester.findByIdAndUpdate(id, { status: 'active' }, { new: true }).lean();

        if (!semester) {
            res.status(404).json({ message: 'Semester not found' });
            return;
        }

        await createAuditLog(req, 'semester.activate', 'semester', id, { after: semester });
        res.status(200).json({ message: 'Semester activated successfully', data: serializeRecord(semester) });
    } catch (error) {
        logger.error('semester.activate_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Failed to activate semester' });
    }
};

export const archiveSemester = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id ?? '');
        if (!isValidObjectId(id)) {
            res.status(400).json({ message: 'Invalid semester ID' });
            return;
        }

        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        const semester = await Semester.findByIdAndUpdate(id, { status: 'archived' }, { new: true }).lean();
        if (!semester) {
            res.status(404).json({ message: 'Semester not found' });
            return;
        }

        await createAuditLog(req, 'semester.archive', 'semester', id, { after: semester });
        res.status(200).json({ message: 'Semester archived successfully', data: serializeRecord(semester) });
    } catch (error) {
        logger.error('semester.archive_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Failed to archive semester' });
    }
};

export const duplicateSemester = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id ?? '');
        if (!isValidObjectId(id)) {
            res.status(400).json({ message: 'Invalid semester ID' });
            return;
        }

        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        const source = await Semester.findById(id).lean();
        if (!source) {
            res.status(404).json({ message: 'Semester not found' });
            return;
        }

        const duplicate = await Semester.create({
            code: `${source.code}-copy`,
            name: `${source.name} Copy`,
            slug: `${source.slug}-copy`,
            status: 'draft',
            startDate: source.startDate,
            endDate: source.endDate,
            description: source.description,
        });

        await createAuditLog(req, 'semester.duplicate', 'semester', String(duplicate._id), {
            metadata: { sourceId: id },
            after: duplicate.toObject(),
        });

        res.status(201).json({ message: 'Semester duplicated successfully', data: serializeRecord(duplicate.toObject()) });
    } catch (error) {
        logger.error('semester.duplicate_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Failed to duplicate semester' });
    }
};
