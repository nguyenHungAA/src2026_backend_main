import { Request, Response } from 'express';
import mongoose from 'mongoose';
import PendingMentorProfile, { MentorProfile } from '../../model/mentorProfileModel.js';

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
