import { Request, Response } from 'express';
import { createHash } from 'node:crypto';
import mongoose from 'mongoose';
import Registration from '../../model/registrationModel.js';
import { enqueueEmail } from '../../service/emailOutboxService.js';
import { logger } from '../../utils/logger.js';

const allowedFields = new Set(['name', 'email', 'topic', 'field', 'mentor']);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const limits = {
    name: 120,
    email: 254,
    topic: 500,
    field: 160,
    mentor: 160,
} as const;

type RegistrationField = keyof typeof limits;

const readString = (body: Record<string, unknown>, field: RegistrationField) => {
    const value = body[field];
    return typeof value === 'string' ? value.trim() : '';
};

const submitRegistration = async (req: Request, res: Response): Promise<void> => {
    try {
        const body = req.body as Record<string, unknown>;
        const unknownFields = Object.keys(body).filter((field) => !allowedFields.has(field));

        if (unknownFields.length > 0) {
            res.status(400).json({
                message: 'Only registration fields are allowed',
                invalidFields: unknownFields,
                allowedFields: Array.from(allowedFields),
            });
            return;
        }

        const registration = {
            name: readString(body, 'name'),
            email: readString(body, 'email').toLowerCase(),
            topic: readString(body, 'topic'),
            field: readString(body, 'field'),
            mentor: readString(body, 'mentor'),
        };

        const missingFields = (Object.keys(registration) as RegistrationField[])
            .filter((field) => !registration[field]);

        if (missingFields.length > 0) {
            res.status(400).json({
                message: `Missing required fields (${missingFields.join(', ')})`,
            });
            return;
        }

        if (!emailPattern.test(registration.email)) {
            res.status(400).json({ message: 'Enter a valid email address' });
            return;
        }

        const oversizedFields = (Object.keys(registration) as RegistrationField[])
            .filter((field) => registration[field].length > limits[field]);

        if (oversizedFields.length > 0) {
            res.status(400).json({
                message: `Field length exceeded (${oversizedFields.join(', ')})`,
            });
            return;
        }

        const submissionFingerprint = createHash('sha256').update([
            registration.email,
            registration.topic.toLowerCase(),
            registration.field.toLowerCase(),
            registration.mentor.toLowerCase(),
        ].join('|')).digest('hex');
        const saved = await Registration.create({ ...registration, submissionFingerprint });

        await enqueueEmail('registration.submitted', String(saved._id), {
            referenceId: String(saved._id),
            submittedAt: new Date().toISOString(),
            ...registration,
        }).catch((error) => logger.error('registration.notification_enqueue_failed', error, {
            requestId: res.locals.requestId,
            aggregateId: String(saved._id),
        }));

        res.status(201).json({
            message: 'Registration submitted successfully',
            registrationId: saved._id,
        });
    } catch (error) {
        if ((error as { code?: number }).code === 11000) {
            res.status(409).json({ code: 'DUPLICATE_SUBMISSION', message: 'This registration has already been submitted.' });
            return;
        }
        if (error instanceof mongoose.Error.ValidationError) {
            res.status(400).json({ message: error.message });
            return;
        }

        logger.error('registration.submit_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Internal server error' });
    }
};

export default submitRegistration;
