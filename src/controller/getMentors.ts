import { Request, Response } from 'express';
import mongoose from 'mongoose';

const getMentors = async (req: Request, res: Response): Promise<void> => {
    try {
        const mentorsDb = mongoose.connection.useDb('mentorsDb');
        const mentors = await mentorsDb.collection('mentorsCollection').find({}).toArray();

        res.status(200).json({ message: 'Mentors fetched successfully', data: mentors });
    } catch (error) {
        console.error('Error fetching mentors:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export default getMentors;
