import { Request, Response } from 'express';
import { defaultPageContent } from '../data/pageContentData.js';
import PageContent from '../model/pageConentModel.js';

export const loadDefaultPageContent = async (_req: Request, res: Response): Promise<void> => {
    try {
        const savedPageContent = await PageContent.findOneAndUpdate(
            {},
            { $set: defaultPageContent },
            { upsert: true, returnDocument: 'after', runValidators: true }
        ).lean();

        res.status(200).json({
            message: 'Default page content loaded successfully',
            data: savedPageContent,
        });
    } catch (error) {
        console.error('Error loading default page content:', error);
        res.status(500).json({ message: 'Failed to load default page content' });
    }
};

export const getPageContent = async (_req: Request, res: Response): Promise<void> => {
    try {
        const pageContent = await PageContent.findOne({}).lean();

        if (!pageContent) {
            res.status(404).json({ message: 'Page content not found' });
            return;
        }

        res.status(200).json({
            message: 'Page content fetched successfully',
            data: pageContent,
        });
    } catch (error) {
        console.error('Error retrieving page content:', error);
        res.status(500).json({ message: 'Failed to retrieve page content' });
    }
};
