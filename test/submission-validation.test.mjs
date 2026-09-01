import assert from 'node:assert/strict';
import test from 'node:test';
import submitMentorProfile from '../dist/controller/mentors/submitMentorProfile.js';
import submitPublication from '../dist/controller/publication/submitPublication.js';
import submitRegistration from '../dist/controller/registration/submitRegistration.js';
import { createRequest, createResponse } from './helpers.mjs';

test('publication validation rejects malformed email, date, and DOI before persistence', async () => {
    const response = createResponse();
    await submitPublication(createRequest({ body: {
        publishTitle: 'Release paper',
        author: 'Release Author',
        publishDate: 'not-a-date',
        content: 'Abstract',
        authorGmail: 'not-an-email',
        doi: 'not-a-doi',
    } }), response.res);
    assert.equal(response.state.statusCode, 400);
    assert.equal(response.state.body.code, 'INVALID_SUBMISSION_FORMAT');
});

test('publication validation rejects implausible legacy years', async () => {
    const response = createResponse();
    await submitPublication(createRequest({ body: {
        publishTitle: 'Release paper',
        author: 'Release Author',
        publishDate: '0012-12-12',
        content: 'Abstract',
        authorGmail: 'author@example.com',
    } }), response.res);
    assert.equal(response.state.statusCode, 400);
    assert.equal(response.state.body.code, 'INVALID_SUBMISSION_FORMAT');
});

test('publication validation rejects untrusted image references', async () => {
    const response = createResponse();
    await submitPublication(createRequest({ body: {
        publishTitle: 'Release paper',
        author: 'Release Author',
        publishDate: '2026-09-01',
        content: 'Abstract',
        authorGmail: 'author@example.com',
        images: [{ url: 'http://insecure.example/image.png', publicId: 'foreign/image' }],
    } }), response.res);
    assert.equal(response.state.statusCode, 400);
    assert.equal(response.state.body.code, 'INVALID_IMAGE_REFERENCE');
});

test('mentor validation rejects invalid email and non-HTTPS profile URLs', async () => {
    const response = createResponse();
    await submitMentorProfile(createRequest({ body: {
        title: 'Dr.',
        fullName: 'Release Mentor',
        email: 'invalid',
        personalWebsite: 'http://mentor.example',
    } }), response.res);
    assert.equal(response.state.statusCode, 400);
    assert.equal(response.state.body.code, 'INVALID_MENTOR_FORMAT');
});

test('registration validation rejects invalid email and overlong fields', async () => {
    const response = createResponse();
    await submitRegistration(createRequest({ body: {
        name: 'Release Attendee',
        email: 'invalid',
        topic: 'x'.repeat(501),
        field: 'Computer Science',
        mentor: 'Release Mentor',
    } }), response.res);
    assert.equal(response.state.statusCode, 400);
    assert.equal(response.state.body.message, 'Enter a valid email address');
});
