import { Request, Response } from 'express';
import { createHash } from 'node:crypto';
import { PendingPublication } from '../../model/publicationModel.js';
import { enqueueEmail } from '../../service/emailOutboxService.js';
import { logger } from '../../utils/logger.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const doiPattern = /^(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)?$/i;
const limits = { publishTitle: 300, author: 500, publishDate: 40, content: 100_000, authorGmail: 254, doi: 300, journal: 500 } as const;

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

        const strings = { publishTitle, author, publishDate, content, authorGmail, doi: doi || '', journal: journal || '' };
        if (Object.entries(strings).some(([key, value]) => typeof value !== 'string' || value.trim().length > limits[key as keyof typeof limits])) {
            res.status(400).json({ code: 'INVALID_SUBMISSION', message: 'One or more publication fields are invalid or too long.' });
            return;
        }
        if (!emailPattern.test(authorGmail) || !doiPattern.test(doi || '') || Number.isNaN(new Date(publishDate).getTime())) {
            res.status(400).json({ code: 'INVALID_SUBMISSION_FORMAT', message: 'Email, publication date, or DOI format is invalid.' });
            return;
        }
        if (images !== undefined && (!Array.isArray(images) || images.some((image: unknown) => {
            if (!image || typeof image !== 'object') return true;
            const candidate = image as { url?: unknown; publicId?: unknown };
            return typeof candidate.url !== 'string' || !candidate.url.startsWith('https://') ||
                typeof candidate.publicId !== 'string' || !candidate.publicId.startsWith('src2026/');
        }))) {
            res.status(400).json({ code: 'INVALID_IMAGE_REFERENCE', message: 'Publication image references are invalid.' });
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
            submissionFingerprint: createHash('sha256').update([
                authorGmail.trim().toLowerCase(),
                publishTitle.trim().toLowerCase(),
                publishDate.trim().toLowerCase(),
            ].join('|')).digest('hex'),
        };

        const newPublication = new PendingPublication(publicationData);
        const saved = await newPublication.save();

        await enqueueEmail('publication.submitted', String(saved._id), {
            referenceId: String(saved._id),
            submittedAt: new Date().toISOString(),
            title: publicationData.publishTitle,
            author: publicationData.author,
            year: publicationData.publishDate,
            journal: publicationData.journal,
            doi: publicationData.doi,
            authorGmail,
        }).catch((error) => logger.error('publication.notification_enqueue_failed', error, {
            requestId: res.locals.requestId,
            aggregateId: String(saved._id),
        }));

        res.status(201).json({ message: 'Publication submitted successfully', data: saved });
    } catch (error) {
        if ((error as { code?: number }).code === 11000) {
            res.status(409).json({ code: 'DUPLICATE_SUBMISSION', message: 'This publication has already been submitted.' });
            return;
        }
        logger.error('publication.submit_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Internal server error' });
    }
};

export default submitPublication;
