import { Request, Response } from 'express';
import { defaultPageContent } from '../../data/pageContentData.js';
import PageContent, {
    defaultSectionStyles,
    defaultPageLayout,
    pageSectionKinds,
    researchIconKeys,
    type IPageContent,
    type IPageLayoutSection,
    type IPageSectionStyle,
    type PageSectionKind,
    type ResearchIconKey,
} from '../../model/pageConentModel.js';
import PageContentVersion from '../../model/pageContentVersionModel.js';
import { logger } from '../../utils/logger.js';

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

const normalizeSectionStyles = (value: unknown): IPageSectionStyle[] => {
    const incoming = Array.isArray(value) ? value : [];

    return defaultSectionStyles.map((defaultStyle) => {
        const style = incoming.find((item) => {
            if (!item || typeof item !== 'object') return false;
            return (item as Record<string, unknown>).id === defaultStyle.id;
        }) as Partial<IPageSectionStyle> | undefined;

        return {
            ...defaultStyle,
            ...(style ?? {}),
            id: defaultStyle.id,
            backgroundColor:
                typeof style?.backgroundColor === 'string' && style.backgroundColor.trim()
                    ? style.backgroundColor
                    : defaultStyle.backgroundColor,
            textColor:
                typeof style?.textColor === 'string' && style.textColor.trim()
                    ? style.textColor
                    : defaultStyle.textColor,
            accentColor:
                typeof style?.accentColor === 'string' && style.accentColor.trim()
                    ? style.accentColor
                    : defaultStyle.accentColor,
        };
    });
};

const normalizeImageItems = (value: unknown) => {
    if (!Array.isArray(value)) return [];

    return value
        .filter((item) => {
            if (!item || typeof item !== 'object') return false;
            const record = item as Record<string, unknown>;
            return typeof record.id === 'number' && typeof record.url === 'string';
        })
        .map((item) => {
            const record = item as Record<string, unknown>;
            return {
                id: record.id as number,
                url: record.url as string,
                alt: typeof record.alt === 'string' ? record.alt : '',
            };
        });
};

const isResearchIconKey = (value: unknown): value is ResearchIconKey =>
    typeof value === 'string' && researchIconKeys.includes(value as ResearchIconKey);

export const normalizeContentPayload = (
    value: unknown,
    includeDefaultLayout = true
): Partial<IPageContent> => {
    if (!value || typeof value !== 'object') {
        return includeDefaultLayout ? { layout: normalizeLayout(undefined) } : {};
    }

    const content = value as Partial<IPageContent>;
    const defaultHero = defaultPageContent.hero;
    const hero = content.hero
        ? {
            ...defaultHero,
            ...content.hero,
            partnerLogos: normalizeImageItems(content.hero.partnerLogos),
        }
        : undefined;
    const defaultAbout = defaultPageContent.about;
    const about = content.about
        ? {
            ...defaultAbout,
            ...content.about,
            images: normalizeImageItems(content.about.images),
        }
        : undefined;
    const defaultFooter = defaultPageContent.footer;
    const footer = content.footer
        ? {
            ...defaultFooter,
            ...content.footer,
            logos: normalizeImageItems(content.footer.logos),
        }
        : undefined;

    return {
        ...content,
        ...(content.layout !== undefined || includeDefaultLayout
            ? { layout: normalizeLayout(content.layout) }
            : {}),
        ...(content.sectionStyles !== undefined || includeDefaultLayout
            ? { sectionStyles: normalizeSectionStyles(content.sectionStyles) }
            : {}),
        ...(hero ? { hero } : {}),
        ...(about ? { about } : {}),
        ...(Array.isArray(content.researchFields)
            ? {
                researchFields: content.researchFields.map((field) => ({
                    ...field,
                    icon: isResearchIconKey(field.icon) ? field.icon : 'code',
                })),
            }
            : {}),
        ...(Array.isArray(content.workshops)
            ? {
                workshops: content.workshops.map((workshop) => ({
                    ...workshop,
                    backgroundImageUrl:
                        typeof workshop.backgroundImageUrl === 'string'
                            ? workshop.backgroundImageUrl
                            : '',
                })),
            }
            : {}),
        ...(footer ? { footer } : {}),
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
        logger.error('page_content.default_load_failed', error, { requestId: res.locals.requestId });
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
        logger.error('page_content.get_failed', error, { requestId: res.locals.requestId });
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
        logger.error('page_content.update_failed', error, { requestId: res.locals.requestId });
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
        logger.error('page_content.versions_list_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Failed to retrieve page content versions' });
    }
};

export const getPageContentVersion = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const version = await PageContentVersion.findById(req.params.id).lean();

        if (!version) {
            res.status(404).json({ message: 'Page content version not found' });
            return;
        }

        res.status(200).json({
            message: 'Page content version fetched successfully',
            data: {
                ...version,
                content: normalizeContentPayload(version.content),
            },
        });
    } catch (error) {
        logger.error('page_content.version_get_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Failed to retrieve page content version' });
    }
};

export const getPageContentVersionDiff = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const version = await PageContentVersion.findById(req.params.id).lean();
        const current = await PageContent.findOne({}).lean();

        if (!version) {
            res.status(404).json({ message: 'Page content version not found' });
            return;
        }

        const snapshot = normalizeContentPayload(version.content);
        const currentContent = normalizeContentPayload(current);
        const changedFields = new Set([
            ...Object.keys(snapshot),
            ...Object.keys(currentContent),
        ]);

        const diff = [...changedFields]
            .filter((field) =>
                JSON.stringify(snapshot[field as keyof typeof snapshot]) !==
                JSON.stringify(currentContent[field as keyof typeof currentContent])
            )
            .map((field) => ({
                field,
                before: snapshot[field as keyof typeof snapshot],
                after: currentContent[field as keyof typeof currentContent],
            }));

        res.status(200).json({
            message: 'Page content version diff fetched successfully',
            data: diff,
        });
    } catch (error) {
        logger.error('page_content.version_diff_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Failed to retrieve page content version diff' });
    }
};

export const restorePageContentVersionAsDraft = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const version = await PageContentVersion.findById(req.params.id).lean();

        if (!version) {
            res.status(404).json({ message: 'Page content version not found' });
            return;
        }

        const restoredVersion = await PageContentVersion.create({
            label: `Draft restored from ${version.label}`,
            content: normalizeContentPayload(version.content),
            createdBy: 'restore',
        });

        res.status(201).json({
            message: 'Page content version restored as draft successfully',
            data: restoredVersion.toObject(),
        });
    } catch (error) {
        logger.error('page_content.version_restore_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Failed to restore page content version' });
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
        logger.error('page_content.version_save_failed', error, { requestId: res.locals.requestId });
        res.status(500).json({ message: 'Failed to save page content version' });
    }
};
