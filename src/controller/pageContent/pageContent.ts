import { Request, Response } from 'express';
import { defaultPageContent } from '../../data/pageContentData.js';
import PageContent, {
    defaultPageLayout,
    pageSectionKinds,
    type IPageContent,
    type IPageLayoutSection,
    type PageSectionKind,
} from '../../model/pageConentModel.js';
import PageContentVersion from '../../model/pageContentVersionModel.js';

const normalizeLayout = (value: unknown): IPageLayoutSection[] => {
    const knownIds = new Set<PageSectionKind>(pageSectionKinds);
    const seenIds = new Set<PageSectionKind>();
    const normalized: IPageLayoutSection[] = [];

    if (Array.isArray(value)) {
        for (const item of value) {
            if (!item || typeof item !== 'object') continue;

            const record = item as Record<string, unknown>;
            const id = record.id;
            if (
                typeof id !== 'string' ||
                !knownIds.has(id as PageSectionKind) ||
                seenIds.has(id as PageSectionKind)
            ) {
                continue;
            }

            const sectionId = id as PageSectionKind;
            seenIds.add(sectionId);
            normalized.push({
                id: sectionId,
                enabled: record.enabled !== false,
            });
        }
    }

    for (const section of defaultPageLayout) {
        if (!seenIds.has(section.id)) {
            normalized.push({ ...section });
        }
    }

    return normalized;
};

const normalizeContentPayload = (
    value: unknown,
    includeDefaultLayout = true
): Partial<IPageContent> => {
    if (!value || typeof value !== 'object') {
        return includeDefaultLayout ? { layout: normalizeLayout(undefined) } : {};
    }

    const content = value as Partial<IPageContent>;
    return {
        ...content,
        ...(content.layout !== undefined || includeDefaultLayout
            ? { layout: normalizeLayout(content.layout) }
            : {}),
    };
};

export const loadDefaultPageContent = async (_req: Request, res: Response): Promise<void> => {
    try {
        const savedPageContent = await PageContent.findOneAndUpdate(
            {},
            { $set: defaultPageContent },
            { upsert: true, returnDocument: 'after', runValidators: true }
        ).lean();

        res.status(200).json({
            message: 'Default page content loaded successfully',
            data: savedPageContent,
        });
    } catch (error) {
        console.error('Error loading default page content:', error);
        res.status(500).json({ message: 'Failed to load default page content' });
    }
};

export const getPageContent = async (_req: Request, res: Response): Promise<void> => {
    try {
        const pageContent = await PageContent.findOne({}).lean();

        if (!pageContent) {
            res.status(404).json({ message: 'Page content not found' });
            return;
        }

        res.status(200).json({
            message: 'Page content fetched successfully',
            data: normalizeContentPayload(pageContent),
        });
    } catch (error) {
        console.error('Error retrieving page content:', error);
        res.status(500).json({ message: 'Failed to retrieve page content' });
    }
};

export const updatePageContent = async (req: Request, res: Response): Promise<void> => {
    try {
        const body = normalizeContentPayload(req.body, false);
        const updatedPageContent = await PageContent.findOneAndUpdate(
            {},
            { $set: body },
            { upsert: true, new: true, runValidators: true }
        ).lean();

        if (!updatedPageContent) {
            res.status(404).json({ message: 'Page content not found for update' });
            return;
        }

        res.status(200).json({
            message: 'Page content updated successfully',
            data: updatedPageContent,
        });
    } catch (error) {
        console.error('Error updating page content:', error);
        res.status(500).json({ message: 'Failed to update page content' });
    }
};

export const getPageContentVersions = async (
    _req: Request,
    res: Response
): Promise<void> => {
    try {
        const versions = await PageContentVersion.find({})
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        res.status(200).json({
            message: 'Page content versions fetched successfully',
            data: versions.map((version) => ({
                ...version,
                content: normalizeContentPayload(version.content),
            })),
        });
    } catch (error) {
        console.error('Error retrieving page content versions:', error);
        res.status(500).json({ message: 'Failed to retrieve page content versions' });
    }
};

export const createPageContentVersion = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const label =
            typeof req.body?.label === 'string' && req.body.label.trim()
                ? req.body.label.trim()
                : `Saved ${new Date().toISOString()}`;
        const requestedContent = req.body?.content;
        const content = requestedContent
            ? normalizeContentPayload(requestedContent)
            : normalizeContentPayload(await PageContent.findOne({}).lean());

        const version = await PageContentVersion.create({
            label,
            content,
        });

        res.status(201).json({
            message: 'Page content version saved successfully',
            data: version.toObject(),
        });
    } catch (error) {
        console.error('Error saving page content version:', error);
        res.status(500).json({ message: 'Failed to save page content version' });
    }
};
