import { Request, Response } from 'express';
import News from '../../model/newsModel.js';
import cloudinary from '../../config/cloudinary.js';

const getNews = async (req: Request, res: Response): Promise<void> => {
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
        if (!req.file) {
            res.status(400).json({ message: 'No image files provided' });
            return;
        }

        const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: 'src2026/news',
                    resource_type: 'image',
                    transformation: [
                        { width: 800, height: 600, crop: 'fit' },  // fit within 800x600, keep entire image
                        { quality: 'auto', fetch_format: 'auto' },  // auto optimize
                    ],
                },
                (error, result) => {
                    if (error || !result) {
                        reject(error);
                    } else {
                        resolve({ secure_url: result.secure_url, public_id: result.public_id });
                    }
                }
            );
            stream.end(req.file!.buffer);
        });
    } catch (error) {
        console.error('Error posting news images:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

const postNews = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, content } = req.body;

        if (!title || !content) {
            res.status(400).json({ message: 'Title and content are required' });
            return;
        }

        const news = new News({
            title,
            content,
            image: req.file ? await postNewsImages(req, res) : null,
        });

        await news.save();
        res.status(201).json({ message: 'News created successfully', data: news });
    } catch (error) {
        console.error('Error posting news:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

export { getNews, postNews, postNewsImages };
