import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Publication, { PendingPublication } from '../../model/publicationModel.js';

export const getPendingPublications = async (_req: Request, res: Response): Promise<void> => {
    try {
        const publications = await PendingPublication.find({}).sort({ createdAt: -1 }).lean();
        res.status(200).json({ message: 'Pending publications fetched successfully', data: publications });
    } catch (error) {
        console.error('Error fetching pending publications:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const approvePendingPublication = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id ?? '');

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid publication ID' });
            return;
        }

        const pendingPublication = await PendingPublication.findById(id);

        if (!pendingPublication) {
            res.status(404).json({ message: 'Pending publication not found' });
            return;
        }

        const publication = await Publication.create({
            publishTitle: pendingPublication.publishTitle,
            publishDate: pendingPublication.publishDate,
            content: pendingPublication.content,
            title: pendingPublication.publishTitle,
            author: pendingPublication.author,
            year: pendingPublication.publishDate,
            journal: pendingPublication.journal,
            doi: pendingPublication.doi,
            abstract: pendingPublication.content,
            authorGmail: pendingPublication.authorGmail,
            feedback: pendingPublication.feedback,
            images: pendingPublication.images,
        });

        await PendingPublication.deleteOne({ _id: pendingPublication._id });

        res.status(200).json({
            message: 'Publication approved successfully',
            data: publication,
        });
    } catch (error) {
        console.error('Error approving pending publication:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const declinePendingPublication = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id ?? '');

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid publication ID' });
            return;
        }

        const deletedPublication = await PendingPublication.findByIdAndDelete(id);

        if (!deletedPublication) {
            res.status(404).json({ message: 'Pending publication not found' });
            return;
        }

        res.status(200).json({ message: 'Publication declined successfully' });
    } catch (error) {
        console.error('Error declining pending publication:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
