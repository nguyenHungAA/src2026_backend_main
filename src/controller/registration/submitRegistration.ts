import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Registration from '../../model/registrationModel.js';

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

        const saved = await Registration.create(registration);

        res.status(201).json({
            message: 'Registration submitted successfully',
            registrationId: saved._id,
        });
    } catch (error) {
        if (error instanceof mongoose.Error.ValidationError) {
            res.status(400).json({ message: error.message });
            return;
        }

        console.error('Error submitting registration:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export default submitRegistration;
