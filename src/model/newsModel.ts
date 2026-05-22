import mongoose, { Schema, Document } from 'mongoose';

export interface INews extends Document {
    title: string;
    description: string;
    image: string;
    date: string;
    content: string;
    author: string;
}

const newsSchema = new Schema<INews>(
    {
        title: { type: String, required: true },
        description: { type: String, default: '' },
        image: { type: String, default: 'https://pub-16fd5c9400c848109b04c8a6aef2443a.r2.dev/fpt_logo.jpg' },
        date: { type: String, required: true },
        content: { type: String, default: '' },
        author: { type: String, required: true },
    },
    { timestamps: true }
);

const newsDb = mongoose.connection.useDb('newsDb');
const News = newsDb.model<INews>('News', newsSchema, 'newsCollection');

export default News;
