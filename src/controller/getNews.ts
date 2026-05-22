import { Request, Response } from 'express';
import News from '../model/newsModel.js';

const getNews = async (req: Request, res: Response): Promise<void> => {
    try {
        const news = await News.find({}).sort({ createdAt: -1 }).lean();

        res.status(200).json({ message: 'News fetched successfully', data: news });
    } catch (error) {
        console.error('Error fetching news:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export default getNews;
