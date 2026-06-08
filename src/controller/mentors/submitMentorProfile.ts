import { Request, Response } from 'express';
import PendingMentorProfile from '../../model/mentorProfileModel.js';
// import { sendMentorProfileEmail } from '../service/emailService.js';

const allowedFields = new Set([
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
]);

const getStringValue = (body: Record<string, unknown>, key: string): string => {
    const value = body[key];
    return typeof value === 'string' ? value.trim() : '';
};

const submitMentorProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const body = req.body as Record<string, unknown>;

        const unknownFields = Object.keys(body).filter((key) => !allowedFields.has(key));
        if (unknownFields.length > 0) {
            res.status(400).json({
                message: 'Only camelCase mentor profile fields are allowed',
                invalidFields: unknownFields,
                allowedFields: Array.from(allowedFields),
            });
            return;
        }

        const title = getStringValue(body, 'title');
        const fullName = getStringValue(body, 'fullName');
        const department = getStringValue(body, 'department');
        const phone = getStringValue(body, 'phone');
        const email = getStringValue(body, 'email');
        const personalWebsite = getStringValue(body, 'personalWebsite');
        const orcid = getStringValue(body, 'orcid');
        const researchGate = getStringValue(body, 'researchGate');
        const googleScholar = getStringValue(body, 'googleScholar');
        const researchAreas = getStringValue(body, 'researchAreas');
        const researchTopics = getStringValue(body, 'researchTopics');
        const note = getStringValue(body, 'note');
        const avatarImage = getStringValue(body, 'avatarImage');

        if (!title || !fullName || !email) {
            res.status(400).json({ message: 'Missing required fields (title, fullName, email)' });
            return;
        }

        // Upsert: update if email exists, create if not
        const saved = await PendingMentorProfile.findOneAndUpdate(
            { email },
            {
                title,
                fullName,
                department,
                phone,
                email,
                personalWebsite,
                orcid,
                researchGate,
                googleScholar,
                researchAreas,
                researchTopics,
                note,
                avatarImage,
                feedback: '',
            },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );

        // Send notification email (non-blocking)
        // sendMentorProfileEmail({
        //     title,
        //     fullName,
        //     department,
        //     phone,
        //     email,
        //     personalWebsite,
        //     orcid,
        //     researchGate,
        //     googleScholar,
        //     researchAreas,
        //     researchTopics,
        //     note,
        //     avatarImage,
        // }).catch((err) => console.error('Failed to send mentor profile notification email:', err));

        res.status(201).json({ message: 'Mentor profile submitted successfully', data: saved });
    } catch (error) {
        console.error('Error submitting mentor profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export default submitMentorProfile;
