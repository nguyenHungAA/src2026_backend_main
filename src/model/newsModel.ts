import mongoose, { Schema, Document } from 'mongoose';

export interface INews extends Document {
    title: string;
    slug?: string;
    description: string;
    summary?: string;
    thumbNailImage: string;
    images: string[];
    date: string;
    content: string;
    body?: string;
    author: string;
    coverImageId?: string;
    coverImageUrl?: string;
    status: 'draft' | 'review' | 'scheduled' | 'published' | 'archived';
    category?: string;
    tags: string[];
    isPinned: boolean;
    isFeatured: boolean;
    seoTitle?: string;
    seoDescription?: string;
    publishedAt?: Date;
    scheduledFor?: Date;
    semesterId?: string;
}

const newsSchema = new Schema<INews>(
    {
        title: { type: String, required: true },
        slug: { type: String, trim: true, lowercase: true },
        description: { type: String, default: '' },
        summary: { type: String, default: '' },
        thumbNailImage: { type: String, default: 'https://pub-16fd5c9400c848109b04c8a6aef2443a.r2.dev/fpt_logo.jpg' },
        images: { type: [String], default: ['https://pub-16fd5c9400c848109b04c8a6aef2443a.r2.dev/fpt_logo.jpg'] },
        date: { type: String, required: true },
        content: { type: String, default: '' },
        body: { type: String, default: '' },
        author: { type: String, required: true },
        coverImageId: { type: String, trim: true },
        coverImageUrl: { type: String, trim: true },
        status: { type: String, enum: ['draft', 'review', 'scheduled', 'published', 'archived'], default: 'published' },
        category: { type: String, trim: true },
        tags: { type: [String], default: [] },
        isPinned: { type: Boolean, default: false },
        isFeatured: { type: Boolean, default: false },
        seoTitle: { type: String, trim: true },
        seoDescription: { type: String, trim: true },
        publishedAt: Date,
        scheduledFor: Date,
        semesterId: { type: String, trim: true },
    },
    { timestamps: true }
);

newsSchema.index({ slug: 1 });
newsSchema.index({ status: 1, scheduledFor: 1 });

const newsDb = mongoose.connection.useDb('newsDb');
const News = newsDb.model<INews>('News', newsSchema, 'newsCollection');

export default News;
