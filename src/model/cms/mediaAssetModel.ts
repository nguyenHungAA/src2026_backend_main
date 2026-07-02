import mongoose, { Schema, Document } from 'mongoose';

export interface IMediaAsset extends Document {
    url: string;
    publicId: string;
    filename: string;
    mimeType: string;
    size: number;
    width?: number;
    height?: number;
    altText?: string;
    caption?: string;
    tags: string[];
    uploadedBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

const mediaAssetSchema = new Schema<IMediaAsset>(
    {
        url: { type: String, required: true },
        publicId: { type: String, required: true, unique: true },
        filename: { type: String, required: true, trim: true },
        mimeType: { type: String, required: true, trim: true },
        size: { type: Number, required: true },
        width: Number,
        height: Number,
        altText: { type: String, default: '' },
        caption: { type: String, default: '' },
        tags: { type: [String], default: [] },
        uploadedBy: { type: String, trim: true },
    },
    { timestamps: true }
);

const cmsDb = mongoose.connection.useDb('cmsDb');
const MediaAsset = cmsDb.model<IMediaAsset>('MediaAsset', mediaAssetSchema, 'mediaAssetCollection');

export default MediaAsset;
