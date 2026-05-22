import mongoose, { Schema, Document } from 'mongoose';

export interface IPublicationImage {
    url: string;
    publicId: string;
}

export interface IPublication extends Document {
    publishTitle: string;
    author: string;
    publishDate: string;
    content: string;
    authorGmail: string;
    feedback: string;
    images: IPublicationImage[];
}

const publicationSchema = new Schema<IPublication>(
    {
        publishTitle: { type: String, required: true },
        author: { type: String, required: true },
        publishDate: { type: String, required: true },
        content: { type: String, required: true },
        authorGmail: { type: String, required: true },
        feedback: { type: String, default: '' },
        images: [
            {
                url: { type: String, required: true },
                publicId: { type: String, required: true },
            },
        ],
    },
    { timestamps: true }
);

const Publication = mongoose.model<IPublication>('Publication', publicationSchema, 'publicationCollection');

export default Publication;
