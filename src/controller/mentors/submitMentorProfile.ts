import { Request, Response } from 'express';
import PendingMentorProfile from '../../model/mentorProfileModel.js';
import { enqueueEmail } from '../../service/emailOutboxService.js';
import { logger } from '../../utils/logger.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const urlFields = ['personalWebsite', 'orcid', 'researchGate', 'googleScholar', 'avatarImage'] as const;
const isSafeOptionalUrl = (value: string): boolean => {
    if (!value) return true;
    try {
        return new URL(value).protocol === 'https:';
    } catch {
        return false;
    }
};

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

        if (!emailPattern.test(email) || email.length > 254 || title.length > 120 || fullName.length > 200) {
            res.status(400).json({ code: 'INVALID_MENTOR_FORMAT', message: 'Mentor name, title, or email format is invalid.' });
            return;
        }
        const urls = { personalWebsite, orcid, researchGate, googleScholar, avatarImage };
        if (urlFields.some((field) => !isSafeOptionalUrl(urls[field]))) {
            res.status(400).json({ code: 'INVALID_MENTOR_URL', message: 'Mentor profile links must use valid HTTPS URLs.' });
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

        if (!saved) throw new Error('Mentor submission was not persisted');
        await enqueueEmail('mentor.submitted', String(saved._id), {
            referenceId: String(saved._id),
            submittedAt: new Date().toISOString(),
            title,
            fullName,
            department,
            email,
            researchAreas,
            researchTopics,
        }).catch((error) => logger.error('mentor.notification_enqueue_failed', error, {
            requestId: res.locals.requestId,
            aggregateId: String(saved._id),
        }));

        res.status(201).json({ message: 'Mentor profile submitted successfully', data: saved });
    } catch (error) {
        logger.error('mentor.submit_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Internal server error' });
    }
};

export default submitMentorProfile;
