import { Request, Response } from 'express';
import PendingMentorProfile from '../model/mentorProfileModel.js';
// import { sendMentorProfileEmail } from '../service/emailService.js';

const submitMentorProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            title,
            fullName,
            department,
            email,
            personalWebsite,
            orcid,
            researchGate,
            googleScholar,
            researchAreas,
            researchTopics,
            note,
            avatar,
        } = req.body;

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
                department: department || '',
                email,
                personalWebsite: personalWebsite || '',
                orcid: orcid || '',
                researchGate: researchGate || '',
                googleScholar: googleScholar || '',
                researchAreas: researchAreas || '',
                researchTopics: researchTopics || '',
                note: note || '',
                avatar: avatar || null,
                feedback: '',
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Send notification email (non-blocking)
        // sendMentorProfileEmail({
        //     title,
        //     fullName,
        //     department,
        //     email,
        //     personalWebsite,
        //     orcid,
        //     researchGate,
        //     googleScholar,
        //     researchAreas,
        //     researchTopics,
        //     note,
        //     avatar,
        // }).catch((err) => console.error('Failed to send mentor profile notification email:', err));

        res.status(201).json({ message: 'Mentor profile submitted successfully', data: saved });
    } catch (error) {
        console.error('Error submitting mentor profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export default submitMentorProfile;
