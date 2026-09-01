import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    email: string;
    password: string;
    role: string;
    isEmailVerified: boolean;
    emailVerificationToken?: string;
    emailVerificationExpiresAt?: Date;
    tokenVersion: number;
}

const userSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: { type: String, required: true },
        role: {
            type: String,
            enum: ['user', 'viewer', 'contributor', 'reviewer', 'editor', 'admin', 'super_admin'],
            default: 'user',
        },
        isEmailVerified: { type: Boolean, default: false },
        emailVerificationToken: { type: String },
        emailVerificationExpiresAt: { type: Date },
        tokenVersion: { type: Number, default: 0, min: 0 },
    },
    { timestamps: true }
);

const usersDb = mongoose.connection.useDb('users');
const User = usersDb.model<IUser>('User', userSchema, 'usersCollection');

export default User;
