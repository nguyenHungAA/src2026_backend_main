import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Publication, { PendingPublication } from '../../model/publicationModel.js';

const publicationEditableFields = [
    'publishTitle',
    'publishDate',
    'content',
    'entryType',
    'citationKey',
    'title',
    'author',
    'journal',
    'booktitle',
    'year',
    'volume',
    'number',
    'pages',
    'doi',
    'abstract',
    'keywords',
    'publisher',
    'url',
    'rawBibtex',
    'authorGmail',
    'feedback',
] as const;

const pickPublicationPayload = (body: Request['body']) => {
    const payload: Partial<Record<(typeof publicationEditableFields)[number], string>> & {
        images?: { url: string; publicId: string }[];
    } = {};

    publicationEditableFields.forEach((field) => {
        const value = body?.[field];
        payload[field] = typeof value === 'string' ? value.trim() : '';
    });

    payload.title = payload.title || payload.publishTitle || '';
    payload.publishTitle = payload.publishTitle || payload.title || '';
    payload.abstract = payload.abstract || payload.content || '';
    payload.year = payload.year || payload.publishDate || '';

    if (Array.isArray(body?.images)) {
        payload.images = body.images
            .filter((image: unknown): image is { url: string; publicId: string } =>
                Boolean(
                    image &&
                    typeof image === 'object' &&
                    typeof (image as { url?: unknown }).url === 'string'
                )
            )
            .map((image: { url: string; publicId?: string }) => ({
                url: image.url.trim(),
                publicId: typeof image.publicId === 'string' ? image.publicId.trim() : image.url.trim(),
            }))
            .filter((image: { url: string }) => Boolean(image.url));
    }

    return payload;
};

const validatePublicationPayload = (payload: ReturnType<typeof pickPublicationPayload>) => {
    if (!payload.title) return 'Title is required';
    if (!payload.author) return 'Author is required';
    if (!payload.authorGmail) return 'Author email is required';
    return '';
};

export const getAdminPublications = async (_req: Request, res: Response): Promise<void> => {
    try {
        const publications = await Publication.find({}).sort({ createdAt: -1 }).lean();
        res.status(200).json({ message: 'Publications fetched successfully', data: publications });
    } catch (error) {
        console.error('Error fetching admin publications:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getAdminPublicationById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id ?? '');

        if (!mongoose.Types.ObjectId.isValid(id)) {
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
        console.error('Error fetching admin publication:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const createAdminPublication = async (req: Request, res: Response): Promise<void> => {
    try {
        const payload = pickPublicationPayload(req.body);
        const validationError = validatePublicationPayload(payload);

        if (validationError) {
            res.status(400).json({ message: validationError });
            return;
        }

        const publication = await Publication.create(payload);
        res.status(201).json({ message: 'Publication created successfully', data: publication });
    } catch (error) {
        console.error('Error creating admin publication:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateAdminPublication = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id ?? '');

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid publication ID' });
            return;
        }

        const payload = pickPublicationPayload(req.body);
        const validationError = validatePublicationPayload(payload);

        if (validationError) {
            res.status(400).json({ message: validationError });
            return;
        }

        const publication = await Publication.findByIdAndUpdate(id, payload, {
            new: true,
            runValidators: true,
        });

        if (!publication) {
            res.status(404).json({ message: 'Publication not found' });
            return;
        }

        res.status(200).json({ message: 'Publication updated successfully', data: publication });
    } catch (error) {
        console.error('Error updating admin publication:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteAdminPublication = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id ?? '');

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid publication ID' });
            return;
        }

        const publication = await Publication.findByIdAndDelete(id);

        if (!publication) {
            res.status(404).json({ message: 'Publication not found' });
            return;
        }

        res.status(200).json({ message: 'Publication deleted successfully' });
    } catch (error) {
        console.error('Error deleting admin publication:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

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
