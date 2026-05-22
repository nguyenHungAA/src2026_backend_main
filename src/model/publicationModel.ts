import mongoose, { Schema, Document } from 'mongoose';

export interface IPublicationImage {
    url: string;
    publicId: string;
}

export interface IPublication extends Document {
    // BibTeX metadata
    entryType: string;
    citationKey: string;
    title: string;
    author: string;
    journal: string;
    booktitle: string;
    year: string;
    volume: string;
    number: string;
    pages: string;
    doi: string;
    abstract: string;
    keywords: string;
    publisher: string;
    url: string;
    // Raw BibTeX for reference
    rawBibtex: string;
    // Submission metadata
    authorGmail: string;
    feedback: string;
    images: IPublicationImage[];
}

const publicationSchema = new Schema<IPublication>(
    {
        entryType: { type: String, default: '' },
        citationKey: { type: String, default: '' },
        title: { type: String, required: true },
        author: { type: String, required: true },
        journal: { type: String, default: '' },
        booktitle: { type: String, default: '' },
        year: { type: String, default: '' },
        volume: { type: String, default: '' },
        number: { type: String, default: '' },
        pages: { type: String, default: '' },
        doi: { type: String, default: '' },
        abstract: { type: String, default: '' },
        keywords: { type: String, default: '' },
        publisher: { type: String, default: '' },
        url: { type: String, default: '' },
        rawBibtex: { type: String, default: '' },
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
