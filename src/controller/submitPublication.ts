import { Request, Response } from 'express';
import { PendingPublication } from '../model/publicationModel.js';
import { sendPublicationEmail } from '../service/emailService.js';

const submitPublication = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            publishTitle,
            author,
            publishDate,
            content,
            authorGmail,
            doi,
            journal,
            images,
        } = req.body;

        if (!publishTitle || !author || !publishDate || !content || !authorGmail) {
            res.status(400).json({ message: 'Missing required fields (publishTitle, author, publishDate, content, authorGmail)' });
            return;
        }

        const publicationData = {
            publishTitle,
            author,
            publishDate,
            content,
            authorGmail,
            doi: doi || '',
            journal: journal || '',
            images: images || [],
        };

        const newPublication = new PendingPublication(publicationData);
        const saved = await newPublication.save();

        // Send notification email (non-blocking)
        sendPublicationEmail({
            title: publicationData.publishTitle,
            author: publicationData.author,
            year: publicationData.publishDate,
            journal: publicationData.journal,
            doi: publicationData.doi,
            authorGmail,
        }).catch((err: any) => console.error('Failed to send notification email:', err));

        res.status(201).json({ message: 'Publication submitted successfully', data: saved });
    } catch (error) {
        console.error('Error submitting publication:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export default submitPublication;
