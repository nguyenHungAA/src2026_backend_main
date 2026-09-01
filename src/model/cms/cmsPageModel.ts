import mongoose, { Schema, Document } from 'mongoose';

export type PageStatus = 'draft' | 'review' | 'published' | 'archived';
export type CmsPageType = 'homepage' | 'landing' | 'custom';

export interface ICmsPage extends Document {
    semesterId?: string;
    slug: string;
    title: string;
    type: CmsPageType;
    status: PageStatus;
    content: Record<string, unknown>;
    createdBy?: string;
    updatedBy?: string;
    publishedBy?: string;
    publishedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const cmsPageSchema = new Schema<ICmsPage>(
    {
        semesterId: { type: String, trim: true },
        slug: { type: String, required: true, trim: true, lowercase: true },
        title: { type: String, required: true, trim: true },
        type: { type: String, enum: ['homepage', 'landing', 'custom'], default: 'homepage' },
        status: { type: String, enum: ['draft', 'review', 'published', 'archived'], default: 'draft' },
        content: { type: Schema.Types.Mixed, required: true, default: {} },
        createdBy: { type: String, trim: true },
        updatedBy: { type: String, trim: true },
        publishedBy: { type: String, trim: true },
        publishedAt: Date,
    },
    { timestamps: true }
);

cmsPageSchema.index({ semesterId: 1, slug: 1, status: 1 });
cmsPageSchema.index({ status: 1, updatedAt: -1 });
cmsPageSchema.index({ semesterId: 1, type: 1, status: 1, publishedAt: -1 });

const cmsDb = mongoose.connection.useDb('cmsDb');
const CmsPage = cmsDb.model<ICmsPage>('CmsPage', cmsPageSchema, 'cmsPageCollection');

export default CmsPage;
