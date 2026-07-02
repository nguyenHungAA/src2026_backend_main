import mongoose, { Schema, Document } from 'mongoose';

export type SemesterStatus = 'draft' | 'active' | 'archived';

export interface ISemester extends Document {
    code: string;
    name: string;
    slug: string;
    status: SemesterStatus;
    startDate: Date;
    endDate: Date;
    description: string;
    createdAt: Date;
    updatedAt: Date;
}

const semesterSchema = new Schema<ISemester>(
    {
        code: { type: String, required: true, trim: true, unique: true },
        name: { type: String, required: true, trim: true },
        slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
        status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        description: { type: String, default: '' },
    },
    { timestamps: true }
);

const cmsDb = mongoose.connection.useDb('cmsDb');
const Semester = cmsDb.model<ISemester>('Semester', semesterSchema, 'semesterCollection');

export default Semester;
