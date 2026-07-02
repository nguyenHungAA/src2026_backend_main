import { Request, Response } from 'express';
import mongoose from 'mongoose';
import News from '../../model/newsModel.js';
import cloudinary from '../../config/cloudinary.js';
import connectDB from '../../config/db.js';

const uploadNewsImage = async (
    file: Express.Multer.File,
    folder: string
): Promise<string> =>
    new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'image',
                transformation: [
                    { width: 800, height: 600, crop: 'fit' },
                    { quality: 'auto', fetch_format: 'auto' },
                ],
            },
            (error, result) => {
                if (error || !result) {
                    reject(error || new Error('Upload failed'));
                    return;
                }

                resolve(result.secure_url);
            }
        );

        stream.end(file.buffer);
    });

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

const getNews = async (_req: Request, res: Response): Promise<void> => {
    try {
        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        const news = await News.find({}).sort({ createdAt: -1 }).lean();

        res.status(200).json({ message: 'News fetched successfully', data: news });
    } catch (error) {
        console.error('Error fetching news:', error);
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

        const news = await News.findById(id).lean();

        if (!news) {
            res.status(404).json({ message: 'News not found' });
            return;
        }

        res.status(200).json({ message: 'News fetched successfully', data: news });
    } catch (error) {
        console.error('Error fetching news by ID:', error);
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
        console.error('Error posting news images:', error);
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
        console.error('Error posting news thumbnail image:', error);
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
        console.error('Error posting news:', error);
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
        console.error('Error updating news:', error);
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
        console.error('Error deleting news:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export { getNews, getNewsById, postNews, postNewsImages, postNewsThumbNailImage, updateNews, deleteNews };
