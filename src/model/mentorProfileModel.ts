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
        title: { type: String, required: true, trim: true, maxlength: 120 },
        fullName: { type: String, required: true, trim: true, maxlength: 200 },
        department: { type: String, default: '', trim: true, maxlength: 200 },
        phone: { type: String, default: '', trim: true, maxlength: 40 },
        email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
        personalWebsite: { type: String, default: '', trim: true, maxlength: 1000 },
        orcid: { type: String, default: '', trim: true, maxlength: 1000 },
        researchGate: { type: String, default: '', trim: true, maxlength: 1000 },
        googleScholar: { type: String, default: '', trim: true, maxlength: 1000 },
        researchAreas: { type: String, default: '', trim: true, maxlength: 5000 },
        researchTopics: { type: String, default: '', trim: true, maxlength: 5000 },
        note: { type: String, default: '', trim: true, maxlength: 10000 },
        avatarImage: { type: String, default: '', trim: true, maxlength: 2000 },
        feedback: { type: String, default: '' },
    },
    { timestamps: true }
);

mentorProfileSchema.index({ createdAt: -1 });
mentorProfileSchema.index({ email: 1 }, { unique: true });
mentorProfileSchema.index({ department: 1, createdAt: -1 });

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
