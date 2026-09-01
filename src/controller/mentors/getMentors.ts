import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { createPaginationMeta, parsePagination } from '../../utils/pagination.js';
import { logger } from '../../utils/logger.js';

// Flexible schema — returns all fields as-is from the collection
const mentorSchema = new mongoose.Schema({}, { strict: false });
const mentorsDb = mongoose.connection.useDb('mentorsDb');
const Mentor = mentorsDb.model('Mentor', mentorSchema, 'mentorsCollection');

const getMentors = async (req: Request, res: Response): Promise<void> => {
    try {
        const { pagination, error } = parsePagination(req.query);
        if (error) {
            res.status(400).json({ code: 'INVALID_PAGINATION', message: error });
            return;
        }

        if (!pagination) {
            const mentors = await Mentor.find({}).sort({ createdAt: -1 }).lean();
            res.status(200).json({ message: 'Mentors fetched successfully', data: mentors });
            return;
        }

        const [mentors, total] = await Promise.all([
            Mentor.find({})
                .sort({ createdAt: -1 })
                .skip(pagination.skip)
                .limit(pagination.limit)
                .lean(),
            Mentor.countDocuments({}),
        ]);

        res.status(200).json({
            message: 'Mentors fetched successfully',
            data: mentors,
            meta: createPaginationMeta(total, pagination),
        });
    } catch (error) {
        logger.error('mentor.list_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Internal server error' });
    }
};

export default getMentors;
