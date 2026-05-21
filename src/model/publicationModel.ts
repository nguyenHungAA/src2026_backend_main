import mongoose, { Schema, Document } from 'mongoose';

export interface IPublication extends Document {
    publishTitle: string;
    author: string;
    publishDate: string;
    content: string;
    authorGmail: string;
    feedback: string;
}

const publicationSchema = new Schema<IPublication>(
    {
        publishTitle: { type: String, required: true },
        author: { type: String, required: true },
        publishDate: { type: String, required: true },
        content: { type: String, required: true },
        authorGmail: { type: String, required: true },
        feedback: { type: String, default: '' },
    },
    { timestamps: true }
);

const Publication = mongoose.model<IPublication>('Publication', publicationSchema, 'publicationCollection');

export default Publication;
