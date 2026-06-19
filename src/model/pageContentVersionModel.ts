import mongoose, { Schema } from 'mongoose';
import type { IPageContent } from './pageConentModel.js';

export interface IPageContentVersion {
    label: string;
    content: IPageContent;
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

const pageContentVersionSchema = new Schema<IPageContentVersion>(
    {
        label: { type: String, required: true, trim: true, maxlength: 160 },
        content: { type: Schema.Types.Mixed, required: true },
        createdBy: { type: String, trim: true },
    },
    { timestamps: true }
);

const pageContentDb = mongoose.connection.useDb('pageContentDb');
const PageContentVersion = pageContentDb.model<IPageContentVersion>(
    'PageContentVersion',
    pageContentVersionSchema,
    'pageContentVersionCollection'
);

export default PageContentVersion;
