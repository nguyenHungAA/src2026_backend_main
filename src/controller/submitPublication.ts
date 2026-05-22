import { Request, Response } from 'express';
import Publication from '../model/publicationModel.js';
import sendPublicationEmail from '../service/emailService.js';

const submitPublication = async (req: Request, res: Response): Promise<void> => {
    try {
        const { publishTitle, author, publishDate, content, authorGmail, images } = req.body;

        if (!publishTitle || !author || !publishDate || !content || !authorGmail) {
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }

        const newPublication = new Publication({
            publishTitle,
            author,
            publishDate,
            content,
            authorGmail,
            images: images || [],
        });

        const saved = await newPublication.save();

        // Send notification email (non-blocking)
        sendPublicationEmail({ publishTitle, author, publishDate, content, authorGmail })
            .catch((err) => console.error('Failed to send notification email:', err));

        res.status(201).json({ message: 'Publication submitted successfully', data: saved });
    } catch (error) {
        console.error('Error submitting publication:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export default submitPublication;
