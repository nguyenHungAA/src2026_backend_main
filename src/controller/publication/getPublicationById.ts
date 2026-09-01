import { Request, Response } from 'express';
import Publication from '../../model/publicationModel.js';
import mongoose from 'mongoose';
import { logger } from '../../utils/logger.js';

const getPublicationById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid publication ID' });
            return;
        }

        const publication = await Publication.findById(id).lean();

        if (!publication) {
            res.status(404).json({ message: 'Publication not found' });
            return;
        }

        res.status(200).json({ message: 'Publication fetched successfully', data: publication });
    } catch (error) {
        logger.error('publication.get_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Internal server error' });
    }
};

export default getPublicationById;
