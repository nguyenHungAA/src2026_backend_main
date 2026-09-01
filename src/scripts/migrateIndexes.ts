import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import AuditLog from '../model/cms/auditLogModel.js';
import CmsPage from '../model/cms/cmsPageModel.js';
import MediaAsset from '../model/cms/mediaAssetModel.js';
import Semester from '../model/cms/semesterModel.js';
import { MentorProfile, default as PendingMentorProfile } from '../model/mentorProfileModel.js';
import News from '../model/newsModel.js';
import PageContentVersion from '../model/pageContentVersionModel.js';
import Publication, { PendingPublication } from '../model/publicationModel.js';
import Registration from '../model/registrationModel.js';
import RateLimitBucket from '../model/rateLimitBucketModel.js';
import IdempotencyRecord from '../model/idempotencyRecordModel.js';
import EmailOutbox from '../model/emailOutboxModel.js';

const migrationId = '2026.08.21-002-production-hardening-indexes';

const run = async () => {
    await connectDB();
    if (mongoose.connection.readyState !== 1) {
        throw new Error('Migration aborted because MongoDB is unavailable');
    }

    const models = [
        Publication,
        PendingPublication,
        MentorProfile,
        PendingMentorProfile,
        News,
        Registration,
        PageContentVersion,
        CmsPage,
        Semester,
        MediaAsset,
        AuditLog,
        RateLimitBucket,
        IdempotencyRecord,
        EmailOutbox,
    ];

    await Promise.all(models.map((model) => model.createIndexes()));

    const migrations = mongoose.connection.useDb('cmsDb').collection('schemaMigrations');
    await migrations.updateOne(
        { _id: migrationId as never },
        {
            $setOnInsert: {
                appliedAt: new Date(),
                description: 'Add rate limit, idempotency, outbox, duplicate prevention, and media lifecycle indexes',
            },
        },
        { upsert: true },
    );

    console.log(`Applied schema migration ${migrationId}`);
};

run()
    .catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
