import { Request, Response } from 'express';
import Publication from '../model/publicationModel.js';

const getPublications = async (req: Request, res: Response): Promise<void> => {
    try {
        const publications = await Publication.find({}).sort({ createdAt: -1 }).lean();

        res.status(200).json({ message: 'Publications fetched successfully', data: publications });
    } catch (error) {
        console.error('Error fetching publications:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export default getPublications;
