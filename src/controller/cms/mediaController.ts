import { Request, Response } from 'express';
import MediaAsset from '../../model/cms/mediaAssetModel.js';
import type { AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import {
    createAuditLog,
    ensureMongoConnected,
    isValidObjectId,
    sendDatabaseUnavailable,
    serializeRecord,
} from './cmsUtils.js';
import { destroyImage, uploadImageBuffer, type CloudinaryImageResult } from '../../service/cloudinaryService.js';
import { logger } from '../../utils/logger.js';
import { findAssetUsages } from '../../service/mediaAssetService.js';

const parseMetadata = (value: unknown) => {
    if (typeof value !== 'string') return {};
    try {
        const parsed = JSON.parse(value) as Record<string, unknown>;
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const uploadMedia = async (file: Express.Multer.File) => uploadImageBuffer(file.buffer, {
    folder: 'src2026/cms/media',
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
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
        logger.error('media.list_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Failed to fetch media assets' });
    }
};

export const uploadMediaAsset = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    let uploaded: CloudinaryImageResult | null = null;
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
        uploaded = result;
        const asset = await MediaAsset.create({
            url: result.secureUrl,
            publicId: result.publicId,
            filename: req.file.originalname,
            mimeType: req.file.mimetype,
            size: result.bytes ?? req.file.size,
            width: result.width,
            height: result.height,
            altText: typeof metadata.altText === 'string' ? metadata.altText : '',
            caption: typeof metadata.caption === 'string' ? metadata.caption : '',
            tags: Array.isArray(metadata.tags) ? metadata.tags.filter((tag): tag is string => typeof tag === 'string') : [],
            uploadedBy: req.user?.id,
            source: 'cms',
        });

        await createAuditLog(req, 'media.upload', 'mediaAsset', String(asset._id), {
            after: asset.toObject(),
        });

        res.status(201).json({ message: 'Media asset uploaded successfully', data: serializeRecord(asset.toObject()) });
    } catch (error) {
        if (uploaded) {
            await destroyImage(uploaded.publicId).catch((cleanupError) => logger.error('media.compensation_failed', cleanupError, {
                requestId: res.locals.requestId,
                publicId: uploaded?.publicId,
            }));
        }
        logger.error('media.upload_failed', error, { requestId: res.locals.requestId });
        res.status(502).json({
            code: 'UPLOAD_PROVIDER_UNAVAILABLE',
            message: 'Failed to upload media asset',
            requestId: res.locals.requestId,
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
        logger.error('media.update_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Failed to update media asset' });
    }
};

export const deleteMediaAsset = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    let assetId = '';
    try {
        const id = String(req.params.id ?? '');
        assetId = id;
        if (!isValidObjectId(id)) {
            res.status(400).json({ message: 'Invalid media asset ID' });
            return;
        }

        if (!(await ensureMongoConnected())) {
            sendDatabaseUnavailable(res);
            return;
        }

        const asset = await MediaAsset.findById(id);
        if (!asset) {
            res.status(404).json({ message: 'Media asset not found' });
            return;
        }

        const usages = await findAssetUsages(asset);
        if (usages.length > 0) {
            res.status(409).json({ code: 'ASSET_IN_USE', message: 'Media asset is still referenced.', data: usages });
            return;
        }

        asset.status = 'delete_pending';
        asset.lastDeleteErrorCode = undefined;
        await asset.save();
        const result = await destroyImage(asset.publicId);
        if (result !== 'ok' && result !== 'not found') throw new Error(`Unexpected Cloudinary delete result: ${result}`);
        const before = asset.toObject();
        await MediaAsset.deleteOne({ _id: id });
        await createAuditLog(req, 'media.delete', 'mediaAsset', id, { before });
        res.status(200).json({ message: 'Media asset deleted successfully' });
    } catch (error) {
        if (assetId && isValidObjectId(assetId)) {
            await MediaAsset.updateOne(
                { _id: assetId },
                { $set: { status: 'delete_failed', lastDeleteErrorCode: 'UPLOAD_PROVIDER_UNAVAILABLE' } },
            ).catch(() => undefined);
        }
        logger.error('media.delete_failed', error, { requestId: res.locals.requestId, assetId });
        res.status(502).json({ code: 'UPLOAD_PROVIDER_UNAVAILABLE', message: 'Failed to delete media asset', requestId: res.locals.requestId });
    }
};

export const getMediaAssetUsages = async (req: Request, res: Response): Promise<void> => {
    const id = String(req.params.id ?? '');
    if (!isValidObjectId(id)) {
        res.status(400).json({ message: 'Invalid media asset ID' });
        return;
    }
    const asset = await MediaAsset.findById(id).lean();
    if (!asset) {
        res.status(404).json({ message: 'Media asset not found' });
        return;
    }
    const usages = await findAssetUsages(asset);
    res.status(200).json({ message: 'Media asset usages fetched successfully', data: usages });
};
