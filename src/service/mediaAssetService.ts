import type { Express } from 'express';
import CmsPage from '../model/cms/cmsPageModel.js';
import MediaAsset from '../model/cms/mediaAssetModel.js';
import PendingMentorProfile, { MentorProfile } from '../model/mentorProfileModel.js';
import News from '../model/newsModel.js';
import Publication, { PendingPublication } from '../model/publicationModel.js';
import { destroyImage, type CloudinaryImageResult } from './cloudinaryService.js';
import { logger } from '../utils/logger.js';

export type MediaUsage = { entityType: string; entityId: string; field: string };
export type LegacyMediaSource = 'publication_upload' | 'mentor_upload';

const cleanupGraceMs = Number(process.env.MEDIA_ORPHAN_GRACE_MS ?? 24 * 60 * 60 * 1000);
const recheckDelayMs = Number(process.env.MEDIA_USAGE_RECHECK_MS ?? 7 * 24 * 60 * 60 * 1000);

export const findAssetUsages = async (
    asset: { url: string; publicId: string },
): Promise<MediaUsage[]> => {
    const [publications, pendingPublications, mentors, pendingMentors, news, pages] = await Promise.all([
        Publication.find({ $or: [{ 'images.publicId': asset.publicId }, { 'images.url': asset.url }] }).select('_id').lean(),
        PendingPublication.find({ $or: [{ 'images.publicId': asset.publicId }, { 'images.url': asset.url }] }).select('_id').lean(),
        MentorProfile.find({ avatarImage: asset.url }).select('_id').lean(),
        PendingMentorProfile.find({ avatarImage: asset.url }).select('_id').lean(),
        News.find({ $or: [{ images: asset.url }, { thumbNailImage: asset.url }, { coverImageUrl: asset.url }, { coverImageId: asset.publicId }] }).select('_id').lean(),
        CmsPage.find({}).select('_id content').lean(),
    ]);

    return [
        ...publications.map((item) => ({ entityType: 'publication', entityId: String(item._id), field: 'images' })),
        ...pendingPublications.map((item) => ({ entityType: 'pendingPublication', entityId: String(item._id), field: 'images' })),
        ...mentors.map((item) => ({ entityType: 'mentor', entityId: String(item._id), field: 'avatarImage' })),
        ...pendingMentors.map((item) => ({ entityType: 'pendingMentor', entityId: String(item._id), field: 'avatarImage' })),
        ...news.map((item) => ({ entityType: 'news', entityId: String(item._id), field: 'images' })),
        ...pages.filter((item) => {
            const content = JSON.stringify(item.content);
            return content.includes(asset.url) || content.includes(asset.publicId);
        }).map((item) => ({ entityType: 'cmsPage', entityId: String(item._id), field: 'content' })),
    ];
};

export const registerLegacyUpload = async (
    result: CloudinaryImageResult,
    file: Express.Multer.File,
    source: LegacyMediaSource,
    uploadedBy?: string,
) => MediaAsset.create({
    url: result.secureUrl,
    publicId: result.publicId,
    filename: file.originalname,
    mimeType: file.mimetype,
    size: result.bytes ?? file.size,
    width: result.width,
    height: result.height,
    uploadedBy,
    source,
    cleanupAfter: new Date(Date.now() + cleanupGraceMs),
    tags: [],
});

export const removeRegisteredAsset = async (publicId: string): Promise<void> => {
    await MediaAsset.deleteOne({ publicId });
};

export const cleanupOrphanedLegacyAssets = async (limit = 25) => {
    const safeLimit = Math.min(Math.max(Math.trunc(limit) || 25, 1), 100);
    const now = new Date();
    const stalePendingBefore = new Date(Date.now() - 30 * 60 * 1000);
    const summary = { examined: 0, deleted: 0, referenced: 0, failed: 0 };

    for (let index = 0; index < safeLimit; index += 1) {
        const asset = await MediaAsset.findOneAndUpdate(
            {
                source: { $in: ['publication_upload', 'mentor_upload'] },
                cleanupAfter: { $lte: now },
                $or: [
                    { status: { $in: ['active', 'delete_failed'] } },
                    { status: 'delete_pending', updatedAt: { $lte: stalePendingBefore } },
                ],
            },
            { $set: { status: 'delete_pending' }, $unset: { lastDeleteErrorCode: 1 } },
            { new: true, sort: { cleanupAfter: 1 } },
        );
        if (!asset) break;

        summary.examined += 1;
        try {
            const usages = await findAssetUsages(asset);
            if (usages.length > 0) {
                asset.status = 'active';
                asset.cleanupAfter = new Date(Date.now() + recheckDelayMs);
                await asset.save();
                summary.referenced += 1;
                continue;
            }

            const result = await destroyImage(asset.publicId);
            if (result !== 'ok' && result !== 'not found') {
                throw new Error(`Unexpected Cloudinary delete result: ${result}`);
            }
            await MediaAsset.deleteOne({ _id: asset._id });
            summary.deleted += 1;
        } catch (error) {
            asset.status = 'delete_failed';
            asset.lastDeleteErrorCode = 'MEDIA_CLEANUP_FAILED';
            asset.cleanupAfter = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await asset.save().catch(() => undefined);
            logger.error('media.orphan_cleanup_failed', error, { assetId: String(asset._id) });
            summary.failed += 1;
        }
    }

    return summary;
};
