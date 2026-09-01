import { Request, Response } from 'express';
import CmsPage from '../../model/cms/cmsPageModel.js';
import type { CmsPageType } from '../../model/cms/cmsPageModel.js';
import Semester from '../../model/cms/semesterModel.js';
import { normalizeContentPayload } from '../pageContent/pageContent.js';
import type { AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import {
    createAuditLog,
    ensureMongoConnected,
    isValidObjectId,
    sendDatabaseUnavailable,
    serializeRecord,
} from './cmsUtils.js';
import { logger } from '../../utils/logger.js';

const readPagePayload = (body: Record<string, unknown>) => ({
    semesterId: typeof body.semesterId === 'string' ? body.semesterId.trim() : undefined,
    slug: typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '',
    title: typeof body.title === 'string' ? body.title.trim() : '',
    type: (body.type === 'landing' || body.type === 'custom' ? body.type : 'homepage') as CmsPageType,
    status: body.status,
    content: body.content && typeof body.content === 'object' ? normalizeContentPayload(body.content) : {},
});

const validatePagePayload = (payload: ReturnType<typeof readPagePayload>, partial = false) => {
    const errors: Record<string, string> = {};
    if ((!partial || payload.slug) && !payload.slug) errors.slug = 'Slug is required';
    if ((!partial || payload.title) && !payload.title) errors.title = 'Title is required';
    if ((!partial || Object.keys(payload.content).length > 0) && !payload.content) {
        errors.content = 'Content is required';
    }
    return errors;
};

export const getAdminPages = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        const filter: Record<string, unknown> = {};
        if (typeof req.query.semesterId === 'string') filter.semesterId = req.query.semesterId;
        if (typeof req.query.status === 'string') filter.status = req.query.status;

        const pages = await CmsPage.find(filter).sort({ updatedAt: -1 }).lean();
        res.status(200).json({ message: 'Pages fetched successfully', data: pages.map(serializeRecord) });
    } catch (error) {
        logger.error('cms_page.list_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Failed to fetch pages' });
    }
};

export const getAdminPage = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id ?? '');
        if (!isValidObjectId(id)) {
            res.status(400).json({ message: 'Invalid page ID' });
            return;
        }

        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        const page = await CmsPage.findById(id).lean();
        if (!page) {
            res.status(404).json({ message: 'Page not found' });
            return;
        }

        res.status(200).json({ message: 'Page fetched successfully', data: serializeRecord(page) });
    } catch (error) {
        logger.error('cms_page.get_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Failed to fetch page' });
    }
};

export const createDraftPage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const payload = readPagePayload(req.body ?? {});
        const errors = validatePagePayload(payload);
        if (Object.keys(errors).length > 0) {
            res.status(400).json({ message: 'Page validation failed', errors });
            return;
        }

        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        const page = await CmsPage.create({
            ...payload,
            status: 'draft',
            createdBy: req.user?.id,
            updatedBy: req.user?.id,
        });
        const pageRecord = page.toObject();

        await createAuditLog(req, 'page.createDraft', 'page', String(page._id), {
            after: pageRecord,
        });

        res.status(201).json({ message: 'Draft page created successfully', data: serializeRecord(pageRecord) });
    } catch (error) {
        logger.error('cms_page.create_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Failed to create draft page' });
    }
};

export const updateDraftPage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id ?? '');
        if (!isValidObjectId(id)) {
            res.status(400).json({ message: 'Invalid page ID' });
            return;
        }

        const payload = readPagePayload(req.body ?? {});
        const errors = validatePagePayload(payload, true);
        if (Object.keys(errors).length > 0) {
            res.status(400).json({ message: 'Page validation failed', errors });
            return;
        }

        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        const before = await CmsPage.findById(id).lean();
        if (before?.status === 'published') {
            res.status(409).json({ message: 'Published pages cannot be edited directly. Create a draft first.' });
            return;
        }

        const page = await CmsPage.findByIdAndUpdate(
            id,
            { ...payload, status: before?.status === 'review' ? 'review' : 'draft', updatedBy: req.user?.id },
            { new: true, runValidators: true }
        ).lean();

        if (!page) {
            res.status(404).json({ message: 'Page not found' });
            return;
        }

        await createAuditLog(req, 'page.updateDraft', 'page', id, { before, after: page });
        res.status(200).json({ message: 'Draft page updated successfully', data: serializeRecord(page) });
    } catch (error) {
        logger.error('cms_page.update_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Failed to update draft page' });
    }
};

const updatePageStatus = async (
    req: AuthenticatedRequest,
    res: Response,
    status: 'review' | 'published' | 'archived',
    action: string
) => {
    const id = String(req.params.id ?? '');
    if (!isValidObjectId(id)) {
        res.status(400).json({ message: 'Invalid page ID' });
        return;
    }

    if (!(await ensureMongoConnected())) {
        sendDatabaseUnavailable(res);
        return;
    }

    const before = await CmsPage.findById(id).lean();
    if (!before) {
        res.status(404).json({ message: 'Page not found' });
        return;
    }

    const allowedSourceStatus: Record<typeof status, string> = {
        review: 'draft',
        published: 'review',
        archived: 'published',
    };
    if (before.status !== allowedSourceStatus[status]) {
        res.status(409).json({
            code: 'INVALID_STATUS_TRANSITION',
            message: `Page must be ${allowedSourceStatus[status]} before it can become ${status}`,
        });
        return;
    }

    const update: Record<string, unknown> = { status, updatedBy: req.user?.id };
    if (status === 'published') {
        update.publishedBy = req.user?.id;
        update.publishedAt = new Date();
    }

    const page = await CmsPage.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!page) {
        res.status(409).json({ message: 'Page changed while its status was being updated' });
        return;
    }

    await createAuditLog(req, action, 'page', id, { before, after: page });
    res.status(200).json({ message: 'Page status updated successfully', data: serializeRecord(page) });
};

export const submitPageForReview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        await updatePageStatus(req, res, 'review', 'page.submitReview');
    } catch (error) {
        logger.error('cms_page.submit_review_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Failed to submit page for review' });
    }
};

export const publishPage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        await updatePageStatus(req, res, 'published', 'page.publish');
    } catch (error) {
        logger.error('cms_page.publish_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Failed to publish page' });
    }
};

export const archivePage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        await updatePageStatus(req, res, 'archived', 'page.archive');
    } catch (error) {
        logger.error('cms_page.archive_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Failed to archive page' });
    }
};

export const getPagePreview = getAdminPage;

export const getCurrentHomepage = async (_req: Request, res: Response): Promise<void> => {
    try {
        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        const activeSemester = await Semester.findOne({ status: 'active' }).lean();
        const filter: Record<string, unknown> = {
            type: 'homepage',
            status: 'published',
        };
        if (activeSemester) filter.semesterId = String(activeSemester._id);

        const page = await CmsPage.findOne(filter).sort({ publishedAt: -1, updatedAt: -1 }).lean();
        if (!page) {
            res.status(404).json({ message: 'Published homepage not found' });
            return;
        }

        res.status(200).json({ message: 'Homepage fetched successfully', data: serializeRecord(page) });
    } catch (error) {
        logger.error('cms_page.current_homepage_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Failed to fetch homepage' });
    }
};

export const getSemesterHomepage = async (req: Request, res: Response): Promise<void> => {
    try {
        const semesterSlug = String(req.params.semesterSlug ?? '');
        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        const semester = await Semester.findOne({ slug: semesterSlug }).lean();
        if (!semester) {
            res.status(404).json({ message: 'Semester not found' });
            return;
        }

        const page = await CmsPage.findOne({
            semesterId: String(semester._id),
            type: 'homepage',
            status: 'published',
        }).sort({ publishedAt: -1, updatedAt: -1 }).lean();

        if (!page) {
            res.status(404).json({ message: 'Published homepage not found' });
            return;
        }

        res.status(200).json({ message: 'Homepage fetched successfully', data: serializeRecord(page) });
    } catch (error) {
        logger.error('cms_page.semester_homepage_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Failed to fetch homepage' });
    }
};
