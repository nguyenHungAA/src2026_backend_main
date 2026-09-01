import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
    actorId?: string;
    actorEmail?: string;
    action: string;
    targetType: string;
    targetId?: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
    {
        actorId: { type: String, trim: true },
        actorEmail: { type: String, trim: true },
        action: { type: String, required: true, trim: true },
        targetType: { type: String, required: true, trim: true },
        targetId: { type: String, trim: true },
        before: Schema.Types.Mixed,
        after: Schema.Types.Mixed,
        metadata: Schema.Types.Mixed,
    },
    { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, targetType: 1 });
auditLogSchema.index({ actorEmail: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, createdAt: -1 });

const cmsDb = mongoose.connection.useDb('cmsDb');
const AuditLog = cmsDb.model<IAuditLog>('AuditLog', auditLogSchema, 'auditLogCollection');

export default AuditLog;
