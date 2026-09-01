import { Request, Response } from 'express';
import mongoose from 'mongoose';
import News from '../../model/newsModel.js';
import connectDB from '../../config/db.js';
import { createPaginationMeta, parsePagination } from '../../utils/pagination.js';
import { uploadImageBuffer } from '../../service/cloudinaryService.js';
import { logger } from '../../utils/logger.js';

const publicNewsFilter = {
    $or: [
        { status: 'published' as const },
        { status: { $exists: false } },
    ],
};

const relatedNewsFields = [
    'title',
    'slug',
    'description',
    'summary',
    'thumbNailImage',
    'images',
    'date',
    'author',
    'coverImageUrl',
    'category',
    'tags',
    'isPinned',
    'isFeatured',
    'publishedAt',
    'createdAt',
    'updatedAt',
].join(' ');

const uploadNewsImage = async (
    file: Express.Multer.File,
    folder: string
): Promise<string> =>
    uploadImageBuffer(file.buffer, {
        folder,
        transformation: [
            { width: 800, height: 600, crop: 'fit' },
            { quality: 'auto', fetch_format: 'auto' },
        ],
    }).then((result) => result.secureUrl);

const parseImages = (images: unknown): string[] => {
    if (Array.isArray(images)) {
        return images.filter((image): image is string => typeof image === 'string' && image.trim().length > 0);
    }

    if (typeof images === 'string' && images.trim().length > 0) {
        return images
            .split(',')
            .map((image) => image.trim())
            .filter(Boolean);
    }

    return [];
};

const parseTags = (tags: unknown): string[] => {
    if (Array.isArray(tags)) {
        return tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0);
    }

    if (typeof tags === 'string' && tags.trim().length > 0) {
        return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
    }

    return [];
};

const readBoolean = (value: unknown): boolean => value === true || value === 'true';

const readOptionalDate = (value: unknown): Date | undefined => {
    if (typeof value !== 'string' || !value.trim()) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
};

const ensureMongoConnected = async () => {
    if (mongoose.connection.readyState !== 1) {
        await connectDB();
    }

    return mongoose.connection.readyState === 1;
};

const sendDatabaseUnavailable = (res: Response) => {
    res.status(503).json({ message: 'Database is not connected. Check MONGO_URI and MongoDB network access.' });
};

const getNews = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        const { pagination, error } = parsePagination(req.query);
        if (error) {
            res.status(400).json({ code: 'INVALID_PAGINATION', message: error });
            return;
        }

        if (!pagination) {
            const news = await News.find(publicNewsFilter).sort({ createdAt: -1 }).lean();
            res.status(200).json({ message: 'News fetched successfully', data: news });
            return;
        }

        const [news, total] = await Promise.all([
            News.find(publicNewsFilter)
                .sort({ createdAt: -1 })
                .skip(pagination.skip)
                .limit(pagination.limit)
                .lean(),
            News.countDocuments(publicNewsFilter),
        ]);

        res.status(200).json({
            message: 'News fetched successfully',
            data: news,
            meta: createPaginationMeta(total, pagination),
        });
    } catch (error) {
        logger.error('news.list_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getNewsById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id ?? '');

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid news ID' });
            return;
        }

        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        const news = await News.findOne({ _id: id, ...publicNewsFilter }).lean();

        if (!news) {
            res.status(404).json({ message: 'News not found' });
            return;
        }

        res.status(200).json({ message: 'News fetched successfully', data: news });
    } catch (error) {
        logger.error('news.get_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getRelatedNews = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id ?? '');

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid news ID' });
            return;
        }

        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        const limit = Math.min(Math.max(Number(req.query.limit) || 3, 1), 12);
        const currentNews = await News.findOne({ _id: id, ...publicNewsFilter })
            .select('category tags semesterId')
            .lean();

        if (!currentNews) {
            res.status(404).json({ message: 'News not found' });
            return;
        }

        const relatedConditions: Record<string, unknown>[] = [];
        if (currentNews.category) {
            relatedConditions.push({ category: currentNews.category });
        }
        if (Array.isArray(currentNews.tags) && currentNews.tags.length > 0) {
            relatedConditions.push({ tags: { $in: currentNews.tags } });
        }
        if (currentNews.semesterId) {
            relatedConditions.push({ semesterId: currentNews.semesterId });
        }

        const baseFilter: Record<string, unknown> = {
            _id: { $ne: id },
            ...publicNewsFilter,
        };
        const relatedFilter = relatedConditions.length > 0
            ? { ...baseFilter, $or: relatedConditions }
            : baseFilter;

        const relatedNews = await News.find(relatedFilter)
            .select(relatedNewsFields)
            .sort({ isPinned: -1, createdAt: -1 })
            .limit(limit)
            .lean();

        if (relatedNews.length >= limit) {
            res.status(200).json({ message: 'Related news fetched successfully', data: relatedNews });
            return;
        }

        const fallbackNews = await News.find({
            ...publicNewsFilter,
            _id: { $nin: [id, ...relatedNews.map((item) => item._id)] },
        })
            .select(relatedNewsFields)
            .sort({ createdAt: -1 })
            .limit(limit - relatedNews.length)
            .lean();

        res.status(200).json({
            message: 'Related news fetched successfully',
            data: [...relatedNews, ...fallbackNews],
        });
    } catch (error) {
        logger.error('news.related_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getAdminNews = async (_req: Request, res: Response): Promise<void> => {
    try {
        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        const news = await News.find({}).sort({ createdAt: -1 }).lean();
        res.status(200).json({ message: 'Admin news fetched successfully', data: news });
    } catch (error) {
        logger.error('news.admin_list_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getAdminNewsById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id ?? '');

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid news ID' });
            return;
        }

        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        const news = await News.findById(id).lean();
        if (!news) {
            res.status(404).json({ message: 'News not found' });
            return;
        }

        res.status(200).json({ message: 'Admin news fetched successfully', data: news });
    } catch (error) {
        logger.error('news.admin_get_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Internal server error' });
    }
};

const postNewsImages = async (req: Request, res: Response): Promise<void> => {
    try {
        const files = Array.isArray(req.files) ? req.files : [];

        if (files.length === 0) {
            res.status(400).json({ message: 'No image files provided' });
            return;
        }

        const imageUrls = await Promise.all(
            files.map((file) => uploadNewsImage(file, 'src2026/news/images'))
        );

        res.status(200).json({
            message: 'Images uploaded successfully',
            data: imageUrls,
        });
    } catch (error) {
        logger.error('news.images_upload_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Internal server error' });
    }
};

const postNewsThumbNailImage = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ message: 'No thumbnail image file provided' });
            return;
        }

        const thumbNailImage = await uploadNewsImage(req.file, 'src2026/news/thumbnails');

        res.status(200).json({
            message: 'Thumbnail image uploaded successfully',
            data: { thumbNailImage },
        });
    } catch (error) {
        logger.error('news.thumbnail_upload_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Internal server error' });
    }
};

const postNews = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            title,
            slug,
            description,
            summary,
            thumbNailImage,
            date,
            content,
            body,
            author,
            coverImageId,
            coverImageUrl,
            status,
            category,
            seoTitle,
            seoDescription,
            semesterId,
        } = req.body;
        let images = parseImages(req.body.images);
        const tags = parseTags(req.body.tags);
        let resolvedThumbNailImage = typeof thumbNailImage === 'string' ? thumbNailImage.trim() : '';

        if (!title || !date || !author) {
            res.status(400).json({ message: 'Title, date, and author are required' });
            return;
        }

        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        if (req.files && !Array.isArray(req.files)) {
            const thumbnailFile = req.files.thumbNailImage?.[0];
            const imageFiles = req.files.images || [];

            if (thumbnailFile) {
                resolvedThumbNailImage = await uploadNewsImage(thumbnailFile, 'src2026/news/thumbnails');
            }

            if (imageFiles.length > 0) {
                images = await Promise.all(
                    imageFiles.map((file) => uploadNewsImage(file, 'src2026/news/images'))
                );
            }
        }

        const news = new News({
            title,
            slug,
            description: description || '',
            summary: summary || description || '',
            ...(resolvedThumbNailImage ? { thumbNailImage: resolvedThumbNailImage } : {}),
            ...(images.length > 0 ? { images } : {}),
            date,
            content: content || '',
            body: body || content || '',
            author,
            coverImageId,
            coverImageUrl: coverImageUrl || resolvedThumbNailImage,
            status: status || 'published',
            category,
            tags,
            isPinned: readBoolean(req.body.isPinned),
            isFeatured: readBoolean(req.body.isFeatured),
            seoTitle,
            seoDescription,
            publishedAt: readOptionalDate(req.body.publishedAt),
            scheduledFor: readOptionalDate(req.body.scheduledFor),
            semesterId,
        });

        await news.save();
        res.status(201).json({ message: 'News created successfully', data: news });
    } catch (error) {
        logger.error('news.create_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updateNews = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id ?? '');
        const {
            title,
            slug,
            description,
            summary,
            thumbNailImage,
            date,
            content,
            body,
            author,
            coverImageId,
            coverImageUrl,
            status,
            category,
            seoTitle,
            seoDescription,
            semesterId,
        } = req.body;
        let images = parseImages(req.body.images);
        const tags = parseTags(req.body.tags);
        let resolvedThumbNailImage = typeof thumbNailImage === 'string' ? thumbNailImage.trim() : '';

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid news ID' });
            return;
        }

        if (!title || !date || !author) {
            res.status(400).json({ message: 'Title, date, and author are required' });
            return;
        }

        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        if (req.files && !Array.isArray(req.files)) {
            const thumbnailFile = req.files.thumbNailImage?.[0];
            const imageFiles = req.files.images || [];

            if (thumbnailFile) {
                resolvedThumbNailImage = await uploadNewsImage(thumbnailFile, 'src2026/news/thumbnails');
            }

            if (imageFiles.length > 0) {
                images = await Promise.all(
                    imageFiles.map((file) => uploadNewsImage(file, 'src2026/news/images'))
                );
            }
        }

        const updatedNews = await News.findByIdAndUpdate(
            id,
            {
                title,
                slug,
                description: description || '',
                summary: summary || description || '',
                thumbNailImage: resolvedThumbNailImage,
                images,
                date,
                content: content || '',
                body: body || content || '',
                author,
                coverImageId,
                coverImageUrl: coverImageUrl || resolvedThumbNailImage,
                status: status || 'published',
                category,
                tags,
                isPinned: readBoolean(req.body.isPinned),
                isFeatured: readBoolean(req.body.isFeatured),
                seoTitle,
                seoDescription,
                publishedAt: readOptionalDate(req.body.publishedAt),
                scheduledFor: readOptionalDate(req.body.scheduledFor),
                semesterId,
            },
            { new: true, runValidators: true }
        );

        if (!updatedNews) {
            res.status(404).json({ message: 'News not found' });
            return;
        }

        res.status(200).json({ message: 'News updated successfully', data: updatedNews });
    } catch (error) {
        logger.error('news.update_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Internal server error' });
    }
};

const deleteNews = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id ?? '');

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid news ID' });
            return;
        }

        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        const deletedNews = await News.findByIdAndDelete(id);

        if (!deletedNews) {
            res.status(404).json({ message: 'News not found' });
            return;
        }

        res.status(200).json({ message: 'News deleted successfully', data: deletedNews });
    } catch (error) {
        logger.error('news.delete_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Internal server error' });
    }
};

export {
    getNews,
    getNewsById,
    getRelatedNews,
    getAdminNews,
    getAdminNewsById,
    postNews,
    postNewsImages,
    postNewsThumbNailImage,
    updateNews,
    deleteNews,
};
