import { Request, Response } from 'express';
import News from '../../model/newsModel.js';
import cloudinary from '../../config/cloudinary.js';

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

const getNews = async (_req: Request, res: Response): Promise<void> => {
    try {
        const news = await News.find({}).sort({ createdAt: -1 }).lean();

        res.status(200).json({ message: 'News fetched successfully', data: news });
    } catch (error) {
        console.error('Error fetching news:', error);
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
        const { title, description, thumbNailImage, date, content, author } = req.body;
        let images = parseImages(req.body.images);
        let resolvedThumbNailImage = typeof thumbNailImage === 'string' ? thumbNailImage.trim() : '';

        if (!title || !date || !author) {
            res.status(400).json({ message: 'Title, date, and author are required' });
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
            description: description || '',
            ...(resolvedThumbNailImage ? { thumbNailImage: resolvedThumbNailImage } : {}),
            ...(images.length > 0 ? { images } : {}),
            date,
            content: content || '',
            author,
        });

        await news.save();
        res.status(201).json({ message: 'News created successfully', data: news });
    } catch (error) {
        console.error('Error posting news:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export { getNews, postNews, postNewsImages, postNewsThumbNailImage };
