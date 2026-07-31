import mongoose, { Document, Schema } from 'mongoose';

export interface IRegistration extends Document {
    name: string;
    email: string;
    topic: string;
    field: string;
    mentor: string;
}

const registrationSchema = new Schema<IRegistration>(
    {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            maxlength: 254,
        },
        topic: { type: String, required: true, trim: true, maxlength: 500 },
        field: { type: String, required: true, trim: true, maxlength: 160 },
        mentor: { type: String, required: true, trim: true, maxlength: 160 },
    },
    { timestamps: true },
);

const registrationDb = mongoose.connection.useDb('registrationDb');
const Registration = registrationDb.model<IRegistration>(
    'Registration',
    registrationSchema,
    'registrationCollection',
);

export default Registration;
