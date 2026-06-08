import { Request, Response } from 'express';
import mongoose from 'mongoose';

// Flexible schema — returns all fields as-is from the collection
const mentorSchema = new mongoose.Schema({}, { strict: false });
const mentorsDb = mongoose.connection.useDb('mentorsDb');
const Mentor = mentorsDb.model('Mentor', mentorSchema, 'mentorsCollection');

const getMentors = async (req: Request, res: Response): Promise<void> => {
    try {
        const mentors = await Mentor.find({}).lean();

        res.status(200).json({ message: 'Mentors fetched successfully', data: mentors });
    } catch (error) {
        console.error('Error fetching mentors:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export default getMentors;
