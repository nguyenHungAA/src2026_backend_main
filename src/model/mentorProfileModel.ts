import mongoose, { Schema, Document } from 'mongoose';

export interface IMentorProfile extends Document {
    title: string;
    fullName: string;
    department: string;
    phone: string;
    email: string;
    personalWebsite: string;
    orcid: string;
    researchGate: string;
    googleScholar: string;
    researchAreas: string;
    researchTopics: string;
    note: string;
    avatarImage: string;
    feedback: string;
}

const mentorProfileSchema = new Schema<IMentorProfile>(
    {
        title: { type: String, required: true },
        fullName: { type: String, required: true },
        department: { type: String, default: '' },
        phone: { type: String, default: '' },
        email: { type: String, required: true },
        personalWebsite: { type: String, default: '' },
        orcid: { type: String, default: '' },
        researchGate: { type: String, default: '' },
        googleScholar: { type: String, default: '' },
        researchAreas: { type: String, default: '' },
        researchTopics: { type: String, default: '' },
        note: { type: String, default: '' },
        avatarImage: { type: String, default: '' },
        feedback: { type: String, default: '' },
    },
    { timestamps: true }
);

const mentorsDb = mongoose.connection.useDb('mentorsDb');
export const MentorProfile = mentorsDb.model<IMentorProfile>(
    'MentorProfile',
    mentorProfileSchema,
    'mentorsCollection'
);

const PendingMentorProfile = mentorsDb.model<IMentorProfile>(
    'PendingMentorProfile',
    mentorProfileSchema,
    'pendingMentorsCollection'
);

export default PendingMentorProfile;
