import { Request, Response } from 'express';
import mongoose from 'mongoose';
import PendingMentorProfile, { MentorProfile } from '../../model/mentorProfileModel.js';

const flexibleMentorSchema = new mongoose.Schema({}, { strict: false });
const mentorsDb = mongoose.connection.useDb('mentorsDb');
const AdminMentor = mentorsDb.models.AdminMentor ?? mentorsDb.model('AdminMentor', flexibleMentorSchema, 'mentorsCollection');

const mentorEditableFields = [
    'title',
    'fullName',
    'department',
    'phone',
    'email',
    'personalWebsite',
    'orcid',
    'researchGate',
    'googleScholar',
    'researchAreas',
    'researchTopics',
    'note',
    'avatarImage',
    'feedback',
] as const;

const pickMentorPayload = (body: Request['body']) => {
    const payload: Partial<Record<(typeof mentorEditableFields)[number], string>> = {};

    mentorEditableFields.forEach((field) => {
        const value = body?.[field];
        payload[field] = typeof value === 'string' ? value.trim() : '';
    });

    return payload;
};

const validateMentorPayload = (payload: Partial<Record<(typeof mentorEditableFields)[number], string>>) => {
    if (!payload.title) return 'Title is required';
    if (!payload.fullName) return 'Full name is required';
    if (!payload.email) return 'Email is required';
    return '';
};

export const getAdminMentors = async (_req: Request, res: Response): Promise<void> => {
    try {
        const mentors = await AdminMentor.find({}).sort({ createdAt: -1 }).lean();
        res.status(200).json({ message: 'Mentors fetched successfully', data: mentors });
    } catch (error) {
        console.error('Error fetching admin mentors:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getAdminMentorById = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id ?? '');

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid mentor ID' });
            return;
        }

        const mentor = await AdminMentor.findById(id).lean();

        if (!mentor) {
            res.status(404).json({ message: 'Mentor not found' });
            return;
        }

        res.status(200).json({ message: 'Mentor fetched successfully', data: mentor });
    } catch (error) {
        console.error('Error fetching admin mentor:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const createAdminMentor = async (req: Request, res: Response): Promise<void> => {
    try {
        const payload = pickMentorPayload(req.body);
        const validationError = validateMentorPayload(payload);

        if (validationError) {
            res.status(400).json({ message: validationError });
            return;
        }

        const mentor = await MentorProfile.create(payload);
        res.status(201).json({ message: 'Mentor created successfully', data: mentor });
    } catch (error) {
        console.error('Error creating admin mentor:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateAdminMentor = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id ?? '');

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid mentor ID' });
            return;
        }

        const payload = pickMentorPayload(req.body);
        const validationError = validateMentorPayload(payload);

        if (validationError) {
            res.status(400).json({ message: validationError });
            return;
        }

        const mentor = await MentorProfile.findByIdAndUpdate(id, payload, {
            new: true,
            runValidators: true,
        });

        if (!mentor) {
            res.status(404).json({ message: 'Mentor not found' });
            return;
        }

        res.status(200).json({ message: 'Mentor updated successfully', data: mentor });
    } catch (error) {
        console.error('Error updating admin mentor:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteAdminMentor = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id ?? '');

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid mentor ID' });
            return;
        }

        const mentor = await MentorProfile.findByIdAndDelete(id);

        if (!mentor) {
            res.status(404).json({ message: 'Mentor not found' });
            return;
        }

        res.status(200).json({ message: 'Mentor deleted successfully' });
    } catch (error) {
        console.error('Error deleting admin mentor:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getPendingMentors = async (_req: Request, res: Response): Promise<void> => {
    try {
        const mentors = await PendingMentorProfile.find({}).sort({ createdAt: -1 }).lean();
        res.status(200).json({ message: 'Pending mentors fetched successfully', data: mentors });
    } catch (error) {
        console.error('Error fetching pending mentors:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const approvePendingMentor = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id ?? '');

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid mentor ID' });
            return;
        }

        const pendingMentor = await PendingMentorProfile.findById(id);

        if (!pendingMentor) {
            res.status(404).json({ message: 'Pending mentor not found' });
            return;
        }

        const approvedMentor = await MentorProfile.findOneAndUpdate(
            { email: pendingMentor.email },
            {
                title: pendingMentor.title,
                fullName: pendingMentor.fullName,
                department: pendingMentor.department,
                phone: pendingMentor.phone,
                email: pendingMentor.email,
                personalWebsite: pendingMentor.personalWebsite,
                orcid: pendingMentor.orcid,
                researchGate: pendingMentor.researchGate,
                googleScholar: pendingMentor.googleScholar,
                researchAreas: pendingMentor.researchAreas,
                researchTopics: pendingMentor.researchTopics,
                note: pendingMentor.note,
                avatarImage: pendingMentor.avatarImage,
                feedback: pendingMentor.feedback,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        await PendingMentorProfile.deleteOne({ _id: pendingMentor._id });

        res.status(200).json({
            message: 'Mentor approved successfully',
            data: approvedMentor,
        });
    } catch (error) {
        console.error('Error approving pending mentor:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const declinePendingMentor = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id ?? '');

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid mentor ID' });
            return;
        }

        const deletedMentor = await PendingMentorProfile.findByIdAndDelete(id);

        if (!deletedMentor) {
            res.status(404).json({ message: 'Pending mentor not found' });
            return;
        }

        res.status(200).json({ message: 'Mentor declined successfully' });
    } catch (error) {
        console.error('Error declining pending mentor:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
