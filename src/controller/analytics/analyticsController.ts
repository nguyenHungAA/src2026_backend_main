import type { Request, Response } from 'express';
import CmsPage from '../../model/cms/cmsPageModel.js';
import { MentorProfile, default as PendingMentorProfile } from '../../model/mentorProfileModel.js';
import News from '../../model/newsModel.js';
import PageContent from '../../model/pageConentModel.js';
import Publication, { PendingPublication } from '../../model/publicationModel.js';
import Registration from '../../model/registrationModel.js';
import { ensureMongoConnected } from '../cms/cmsUtils.js';
import { logger } from '../../utils/logger.js';

type AnalyticsFilters = {
    from?: Date;
    to?: Date;
    semesterId?: string;
};

export type AnalyticsSummary = {
    filters: {
        from: string | null;
        to: string | null;
        semesterId: string | null;
    };
    totals: {
        publications: number;
        researchers: number;
        publishedNews: number;
        registrations: number;
        pendingPublications: number;
        pendingResearchers: number;
        cmsPages: number;
    };
    content: {
        activeSections: number;
        inactiveSections: number;
    };
    unavailable: {
        visits: 'not_collected';
        searches: 'not_collected';
    };
    generatedAt: string;
};

const parseDate = (value: unknown, endOfDay = false): Date | null | undefined => {
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

    const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
    return Number.isNaN(date.getTime()) ? null : date;
};

const readFilters = (req: Request): { filters?: AnalyticsFilters; error?: string } => {
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to, true);
    if (from === null || to === null) {
        return { error: 'from and to must use YYYY-MM-DD format' };
    }
    if (from && to && from > to) {
        return { error: 'from must be earlier than or equal to to' };
    }

    const semesterId = typeof req.query.semesterId === 'string'
        ? req.query.semesterId.trim().slice(0, 120)
        : undefined;

    return { filters: { from, to, semesterId: semesterId || undefined } };
};

const createDateFilter = ({ from, to }: AnalyticsFilters) => {
    if (!from && !to) return undefined;

    const createdAt: Record<string, Date> = {};
    if (from) createdAt.$gte = from;
    if (to) createdAt.$lte = to;
    return createdAt;
};

const loadSummary = async (filters: AnalyticsFilters): Promise<AnalyticsSummary> => {
    const createdAt = createDateFilter(filters);
    const commonFilter = createdAt ? { createdAt } : {};
    const newsFilter: Record<string, unknown> = {
        ...commonFilter,
        status: 'published',
    };
    const pageFilter: Record<string, unknown> = { ...commonFilter };
    if (filters.semesterId) {
        newsFilter.semesterId = filters.semesterId;
        pageFilter.semesterId = filters.semesterId;
    }

    const [
        publications,
        researchers,
        publishedNews,
        registrations,
        pendingPublications,
        pendingResearchers,
        cmsPages,
        pageContent,
    ] = await Promise.all([
        Publication.countDocuments(commonFilter),
        MentorProfile.countDocuments(commonFilter),
        News.countDocuments(newsFilter),
        Registration.countDocuments(commonFilter),
        PendingPublication.countDocuments(commonFilter),
        PendingMentorProfile.countDocuments(commonFilter),
        CmsPage.countDocuments(pageFilter),
        PageContent.findOne({}).select({ layout: 1 }).lean(),
    ]);

    const layout = Array.isArray(pageContent?.layout) ? pageContent.layout : [];
    const activeSections = layout.filter((section) => section.enabled).length;

    return {
        filters: {
            from: filters.from?.toISOString() ?? null,
            to: filters.to?.toISOString() ?? null,
            semesterId: filters.semesterId ?? null,
        },
        totals: {
            publications,
            researchers,
            publishedNews,
            registrations,
            pendingPublications,
            pendingResearchers,
            cmsPages,
        },
        content: {
            activeSections,
            inactiveSections: Math.max(0, layout.length - activeSections),
        },
        unavailable: {
            visits: 'not_collected',
            searches: 'not_collected',
        },
        generatedAt: new Date().toISOString(),
    };
};

const sendValidationError = (res: Response, message: string) => {
    res.status(400).json({ code: 'INVALID_ANALYTICS_FILTER', message });
};

export const getAnalyticsSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const parsed = readFilters(req);
        if (!parsed.filters) {
            sendValidationError(res, parsed.error ?? 'Invalid filters');
            return;
        }
        if (!(await ensureMongoConnected())) {
            res.status(503).json({ code: 'DATABASE_UNAVAILABLE', message: 'Database is unavailable' });
            return;
        }

        const summary = await loadSummary(parsed.filters);
        res.status(200).json({ message: 'Analytics summary fetched successfully', data: summary });
    } catch (error) {
        logger.error('analytics.summary_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ code: 'ANALYTICS_ERROR', message: 'Could not generate analytics summary' });
    }
};

const escapeCsv = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;

export const exportAnalyticsCsv = async (req: Request, res: Response): Promise<void> => {
    try {
        const parsed = readFilters(req);
        if (!parsed.filters) {
            sendValidationError(res, parsed.error ?? 'Invalid filters');
            return;
        }
        if (!(await ensureMongoConnected())) {
            res.status(503).json({ code: 'DATABASE_UNAVAILABLE', message: 'Database is unavailable' });
            return;
        }

        const summary = await loadSummary(parsed.filters);
        const rows: Array<[string, string | number]> = [
            ['publications', summary.totals.publications],
            ['researchers', summary.totals.researchers],
            ['published_news', summary.totals.publishedNews],
            ['registrations', summary.totals.registrations],
            ['pending_publications', summary.totals.pendingPublications],
            ['pending_researchers', summary.totals.pendingResearchers],
            ['cms_pages', summary.totals.cmsPages],
            ['active_sections', summary.content.activeSections],
            ['inactive_sections', summary.content.inactiveSections],
            ['generated_at', summary.generatedAt],
        ];
        const csv = ['metric,value', ...rows.map((row) => row.map(escapeCsv).join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="src2026-analytics.csv"');
        res.status(200).send(`\uFEFF${csv}`);
    } catch (error) {
        logger.error('analytics.export_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ code: 'ANALYTICS_EXPORT_ERROR', message: 'Could not export analytics summary' });
    }
};
