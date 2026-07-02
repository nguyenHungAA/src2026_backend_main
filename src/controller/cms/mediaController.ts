import { Request, Response } from 'express';
import cloudinary, { assertCloudinaryConfigured } from '../../config/cloudinary.js';
import MediaAsset from '../../model/cms/mediaAssetModel.js';
import type { AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import {
    createAuditLog,
    ensureMongoConnected,
    isValidObjectId,
    sendDatabaseUnavailable,
    serializeRecord,
} from './cmsUtils.js';

const parseMetadata = (value: unknown) => {
    if (typeof value !== 'string') return {};
    try {
        const parsed = JSON.parse(value) as Record<string, unknown>;
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const uploadMedia = async (file: Express.Multer.File) =>
    new Promise<{
        secure_url: string;
        public_id: string;
        width?: number;
        height?: number;
        bytes?: number;
        format?: string;
    }>((resolve, reject) => {
        assertCloudinaryConfigured();

        const stream = cloudinary.uploader.upload_stream(
            {
                folder: 'src2026/cms/media',
                resource_type: 'image',
                transformation: [
                    { quality: 'auto', fetch_format: 'auto' },
                ],
            },
            (error, result) => {
                if (error || !result) {
                    reject(error || new Error('Upload failed'));
                    return;
                }

                resolve({
                    secure_url: result.secure_url,
                    public_id: result.public_id,
                    width: result.width,
                    height: result.height,
                    bytes: result.bytes,
                    format: result.format,
                });
            }
        );

        stream.end(file.buffer);
    });

export const getMediaAssets = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        const filter: Record<string, unknown> = {};
        if (typeof req.query.mimeType === 'string') filter.mimeType = new RegExp(req.query.mimeType, 'i');
        if (typeof req.query.tag === 'string') filter.tags = req.query.tag;
        if (typeof req.query.search === 'string') filter.filename = new RegExp(req.query.search, 'i');

        const assets = await MediaAsset.find(filter).sort({ createdAt: -1 }).lean();
        res.status(200).json({ message: 'Media assets fetched successfully', data: assets.map(serializeRecord) });
    } catch (error) {
        console.error('Error fetching media assets:', error);
        res.status(500).json({ message: 'Failed to fetch media assets' });
    }
};

export const uploadMediaAsset = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ message: 'No media file provided' });
            return;
        }

        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        const metadata = parseMetadata(req.body?.metadata);
        const result = await uploadMedia(req.file);
        const asset = await MediaAsset.create({
            url: result.secure_url,
            publicId: result.public_id,
            filename: req.file.originalname,
            mimeType: req.file.mimetype,
            size: result.bytes ?? req.file.size,
            width: result.width,
            height: result.height,
            altText: typeof metadata.altText === 'string' ? metadata.altText : '',
            caption: typeof metadata.caption === 'string' ? metadata.caption : '',
            tags: Array.isArray(metadata.tags) ? metadata.tags.filter((tag): tag is string => typeof tag === 'string') : [],
            uploadedBy: req.user?.id,
        });

        await createAuditLog(req, 'media.upload', 'mediaAsset', String(asset._id), {
            after: asset.toObject(),
        });

        res.status(201).json({ message: 'Media asset uploaded successfully', data: serializeRecord(asset.toObject()) });
    } catch (error) {
        console.error('Error uploading media asset:', error);
        res.status(500).json({
            message: error instanceof Error ? error.message : 'Failed to upload media asset',
        });
    }
};

export const updateMediaAsset = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id ?? '');
        if (!isValidObjectId(id)) {
            res.status(400).json({ message: 'Invalid media asset ID' });
            return;
        }

        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        const before = await MediaAsset.findById(id).lean();
        const asset = await MediaAsset.findByIdAndUpdate(
            id,
            {
                altText: typeof req.body?.altText === 'string' ? req.body.altText : before?.altText,
                caption: typeof req.body?.caption === 'string' ? req.body.caption : before?.caption,
                tags: Array.isArray(req.body?.tags) ? req.body.tags : before?.tags,
            },
            { new: true, runValidators: true }
        ).lean();

        if (!asset) {
            res.status(404).json({ message: 'Media asset not found' });
            return;
        }

        await createAuditLog(req, 'media.update', 'mediaAsset', id, { before, after: asset });
        res.status(200).json({ message: 'Media asset updated successfully', data: serializeRecord(asset) });
    } catch (error) {
        console.error('Error updating media asset:', error);
        res.status(500).json({ message: 'Failed to update media asset' });
    }
};

export const deleteMediaAsset = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id ?? '');
        if (!isValidObjectId(id)) {
            res.status(400).json({ message: 'Invalid media asset ID' });
            return;
        }

        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        const asset = await MediaAsset.findByIdAndDelete(id).lean();
        if (!asset) {
            res.status(404).json({ message: 'Media asset not found' });
            return;
        }

        assertCloudinaryConfigured();
        await cloudinary.uploader.destroy(asset.publicId);
        await createAuditLog(req, 'media.delete', 'mediaAsset', id, { before: asset });
        res.status(200).json({ message: 'Media asset deleted successfully' });
    } catch (error) {
        console.error('Error deleting media asset:', error);
        res.status(500).json({ message: 'Failed to delete media asset' });
    }
};

export const getMediaAssetUsages = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({
        message: 'Media asset usages fetched successfully',
        data: [],
    });
};
