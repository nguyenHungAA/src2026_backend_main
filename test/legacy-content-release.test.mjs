import assert from 'node:assert/strict';
import test from 'node:test';
import {
    getPageContent,
    getPageContentVersions,
} from '../dist/controller/pageContent/pageContent.js';
import pageContentRouter from '../dist/routes/pageContentRoute.js';
import PageContent from '../dist/model/pageConentModel.js';
import PageContentVersion from '../dist/model/pageContentVersionModel.js';
import { createRequest, createResponse } from './helpers.mjs';

test('legacy content and version endpoints preserve their response contracts', async (t) => {
    const originals = {
        contentFindOne: PageContent.findOne,
        versionFind: PageContentVersion.find,
    };
    t.after(() => {
        PageContent.findOne = originals.contentFindOne;
        PageContentVersion.find = originals.versionFind;
    });

    PageContent.findOne = () => ({ lean: async () => ({
        _id: 'legacy-content',
        hero: { title: 'Legacy homepage title' },
    }) });
    PageContentVersion.find = () => ({
        sort() { return this; },
        limit() { return this; },
        lean: async () => [{
            _id: 'legacy-version-1',
            content: { hero: { title: 'Legacy version title' } },
            createdAt: new Date('2026-09-01T00:00:00.000Z'),
        }],
    });
    const routePaths = pageContentRouter.stack
        .map((layer) => layer.route?.path)
        .filter(Boolean);
    assert.ok(routePaths.includes('/'));
    assert.ok(routePaths.includes('/versions'));

    const contentResponse = createResponse();
    await getPageContent(createRequest({ method: 'GET' }), contentResponse.res);
    assert.equal(contentResponse.state.statusCode, 200);
    const content = contentResponse.state.body;
    assert.equal(content.message, 'Page content fetched successfully');
    assert.equal(content.data.hero.title, 'Legacy homepage title');
    assert.ok(Array.isArray(content.data.layout));

    const versionsResponse = createResponse();
    await getPageContentVersions(createRequest({ method: 'GET' }), versionsResponse.res);
    assert.equal(versionsResponse.state.statusCode, 200);
    const versions = versionsResponse.state.body;
    assert.equal(versions.message, 'Page content versions fetched successfully');
    assert.equal(versions.data[0].content.hero.title, 'Legacy version title');
    assert.ok(Array.isArray(versions.data[0].content.layout));
});
