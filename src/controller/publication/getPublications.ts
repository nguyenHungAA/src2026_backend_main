import { Request, Response } from 'express';
import Publication from '../../model/publicationModel.js';
import { createPaginationMeta, parsePagination } from '../../utils/pagination.js';
import { logger } from '../../utils/logger.js';

const getPublications = async (req: Request, res: Response): Promise<void> => {
    try {
        const { pagination, error } = parsePagination(req.query);
        if (error) {
            res.status(400).json({ code: 'INVALID_PAGINATION', message: error });
            return;
        }

        if (!pagination) {
            const publications = await Publication.find({}).sort({ createdAt: -1 }).lean();
            res.status(200).json({ message: 'Publications fetched successfully', data: publications });
            return;
        }

        const [publications, total] = await Promise.all([
            Publication.find({})
                .sort({ createdAt: -1 })
                .skip(pagination.skip)
                .limit(pagination.limit)
                .lean(),
            Publication.countDocuments({}),
        ]);

        res.status(200).json({
            message: 'Publications fetched successfully',
            data: publications,
            meta: createPaginationMeta(total, pagination),
        });
    } catch (error) {
        logger.error('publication.list_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Internal server error' });
    }
};

export default getPublications;
