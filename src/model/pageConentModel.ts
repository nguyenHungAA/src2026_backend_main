import mongoose, { Schema } from 'mongoose';

export interface IMilestoneItem {
    id: number;
    date: string;
    title: string;
    detail?: string;
}

export interface IWorkshopItem {
    id: number;
    eyebrow: string;
    title: string;
    description: string;
    backgroundImageUrl: string;
    scheduleLabel: string;
    date: string;
    note: string;
    sessionTitle: string;
    sessionSubtitle: string;
    time: string;
}

export interface IHeroContent {
    titleLines: string[];
    backgroundImageUrl: string;
    taglinePrimary: string;
    taglineSecondary: string;
    countdownLabel: string;
    registrationDeadline: string;
    ctaLabel: string;
    ctaUrl: string;
    partnerLabel: string;
    partnerLogos: IPageImageItem[];
    closingLinePrimary: string;
    closingLineSecondary: string;
}

export interface IAboutContent {
    sectionLabel: string;
    title: string;
    images: IPageImageItem[];
    highlightOne: string;
    paragraphOne: string;
    highlightTwo: string;
    paragraphTwo: string;
    paragraphThree: string;
}

export interface IPageImageItem {
    id: number;
    url: string;
    alt: string;
}

export type ResearchIconKey =
    | 'code'
    | 'chip'
    | 'design'
    | 'business'
    | 'language'
    | 'science'
    | 'robot'
    | 'database'
    | 'globe'
    | 'leaf';

export interface IResearchFieldItem {
    id: number;
    icon: ResearchIconKey;
    title: string;
    accordionItems: string[];
    carouselItems: string[];
}

export interface IAwardTier {
    id: number;
    label: string;
    amount: string;
    count: number;
    icon: 'trophy' | 'medal';
    color: string;
}

export interface IAwardCommittee {
    id: number;
    name: string;
    nameVi: string;
    color: string;
    accentGradient: string;
    borderColor: string;
    standardAwards: IAwardTier[];
    smallAwards: IAwardTier[];
    expandedNote?: string;
    expandedAwards?: IAwardTier[];
}

export interface IRegulationSection {
    id: number;
    title: string;
    items: string[];
}

export interface INewsItem {
    id: number;
    title: string;
    description: string;
    author: string;
    date: string;
}

export interface IPublicationsHomeContent {
    eyebrow: string;
    badge: string;
    readMoreLabel: string;
    viewAllLabel: string;
}

export interface IFooterContent {
    headlineOne: string;
    headlineTwo: string;
    headlineThree: string;
    ctaLabel: string;
    ctaUrl: string;
    logos: IPageImageItem[];
    contactHeading: string;
    facebookLabel: string;
    facebookUrl: string;
    emailLabel: string;
    email: string;
    phoneLabel: string;
    phone: string;
    copyrightLine: string;
    rightsLine: string;
}

export type PageSectionKind =
    | 'hero'
    | 'about'
    | 'research'
    | 'awards'
    | 'regulations'
    | 'milestones'
    | 'news'
    | 'publications'
    | 'workshops'
    | 'footer';

export interface IPageLayoutSection {
    id: PageSectionKind;
    enabled: boolean;
}

export interface IPageSectionStyle {
    id: PageSectionKind;
    backgroundColor: string;
    textColor: string;
    accentColor: string;
}

export interface IPageContent {
    layout: IPageLayoutSection[];
    sectionStyles: IPageSectionStyle[];
    hero: IHeroContent;
    about: IAboutContent;
    researchTitle: string;
    researchFields: IResearchFieldItem[];
    awardsTitle: string;
    awardsStandardLabel: string;
    awardsSmallLabel: string;
    awards: IAwardCommittee[];
    awardsNote: string;
    regulationsTitle: string;
    regulationsSubtitle: string;
    regulations: IRegulationSection[];
    newsTitle: string;
    newsSubtitle: string;
    newsReadAllLabel: string;
    news: INewsItem[];
    milestonesTitle: string;
    milestonesNote: string;
    milestones: IMilestoneItem[];
    publicationsHome: IPublicationsHomeContent;
    workshops: IWorkshopItem[];
    footer: IFooterContent;
}

const awardTierSchema = new Schema<IAwardTier>(
    {
        id: { type: Number, required: true },
        label: { type: String, required: true },
        amount: { type: String, required: true },
        count: { type: Number, required: true },
        icon: { type: String, enum: ['trophy', 'medal'], required: true },
        color: { type: String, required: true },
    },
    { _id: false }
);

const pageImageSchema = new Schema<IPageImageItem>(
    {
        id: { type: Number, required: true },
        url: { type: String, required: true },
        alt: { type: String, default: '' },
    },
    { _id: false }
);

export const pageSectionKinds: PageSectionKind[] = [
    'hero',
    'about',
    'research',
    'awards',
    'regulations',
    'milestones',
    'news',
    'publications',
    'workshops',
    'footer',
];

export const defaultPageLayout: IPageLayoutSection[] = pageSectionKinds.map((id) => ({
    id,
    enabled: true,
}));

export const researchIconKeys: ResearchIconKey[] = [
    'code',
    'chip',
    'design',
    'business',
    'language',
    'science',
    'robot',
    'database',
    'globe',
    'leaf',
];

export const defaultSectionStyles: IPageSectionStyle[] = [
    { id: 'hero', backgroundColor: '#000000', textColor: '#ffffff', accentColor: '#f97316' },
    { id: 'about', backgroundColor: '#fffbeb', textColor: '#111827', accentColor: '#f97316' },
    { id: 'research', backgroundColor: '#fffbeb', textColor: '#111827', accentColor: '#f97316' },
    { id: 'awards', backgroundColor: '#000000', textColor: '#ffffff', accentColor: '#facc15' },
    { id: 'regulations', backgroundColor: '#fffbeb', textColor: '#111827', accentColor: '#f97316' },
    { id: 'milestones', backgroundColor: '#000000', textColor: '#ffffff', accentColor: '#f97316' },
    { id: 'news', backgroundColor: '#ffffff', textColor: '#111827', accentColor: '#2563eb' },
    { id: 'publications', backgroundColor: '#ffffff', textColor: '#111827', accentColor: '#0d9488' },
    { id: 'workshops', backgroundColor: '#ffffff', textColor: '#111827', accentColor: '#f97316' },
    { id: 'footer', backgroundColor: '#262626', textColor: '#f5f5f5', accentColor: '#f97316' },
];

const pageLayoutSectionSchema = new Schema<IPageLayoutSection>(
    {
        id: { type: String, enum: pageSectionKinds, required: true },
        enabled: { type: Boolean, required: true, default: true },
    },
    { _id: false }
);

const pageSectionStyleSchema = new Schema<IPageSectionStyle>(
    {
        id: { type: String, enum: pageSectionKinds, required: true },
        backgroundColor: { type: String, required: true },
        textColor: { type: String, required: true },
        accentColor: { type: String, required: true },
    },
    { _id: false }
);

const pageContentSchema = new Schema<IPageContent>(
    {
        layout: {
            type: [pageLayoutSectionSchema],
            required: true,
            default: defaultPageLayout,
        },
        sectionStyles: {
            type: [pageSectionStyleSchema],
            required: true,
            default: defaultSectionStyles,
        },
        hero: {
            titleLines: { type: [String], required: true },
            backgroundImageUrl: { type: String, default: '' },
            taglinePrimary: { type: String, required: true },
            taglineSecondary: { type: String, required: true },
            countdownLabel: { type: String, required: true },
            registrationDeadline: { type: String, required: true },
            ctaLabel: { type: String, required: true },
            ctaUrl: { type: String, required: true },
            partnerLabel: { type: String, required: true },
            partnerLogos: { type: [pageImageSchema], default: [] },
            closingLinePrimary: { type: String, required: true },
            closingLineSecondary: { type: String, required: true },
        },
        about: {
            sectionLabel: { type: String, required: true },
            title: { type: String, required: true },
            images: { type: [pageImageSchema], default: [] },
            highlightOne: { type: String, required: true },
            paragraphOne: { type: String, required: true },
            highlightTwo: { type: String, required: true },
            paragraphTwo: { type: String, required: true },
            paragraphThree: { type: String, required: true },
        },
        researchTitle: { type: String, required: true },
        researchFields: [
            {
                _id: false,
                id: { type: Number, required: true },
                icon: {
                    type: String,
                    enum: researchIconKeys,
                    required: true,
                },
                title: { type: String, required: true },
                accordionItems: { type: [String], required: true },
                carouselItems: { type: [String], required: true },
            },
        ],
        awardsTitle: { type: String, required: true },
        awardsStandardLabel: { type: String, required: true },
        awardsSmallLabel: { type: String, required: true },
        awards: [
            {
                _id: false,
                id: { type: Number, required: true },
                name: { type: String, required: true },
                nameVi: { type: String, required: true },
                color: { type: String, required: true },
                accentGradient: { type: String, required: true },
                borderColor: { type: String, required: true },
                standardAwards: { type: [awardTierSchema], required: true },
                smallAwards: { type: [awardTierSchema], required: true },
                expandedNote: String,
                expandedAwards: [awardTierSchema],
            },
        ],
        awardsNote: { type: String, required: true },
        regulationsTitle: { type: String, required: true },
        regulationsSubtitle: { type: String, required: true },
        regulations: [
            {
                _id: false,
                id: { type: Number, required: true },
                title: { type: String, required: true },
                items: { type: [String], required: true },
            },
        ],
        newsTitle: { type: String, required: true },
        newsSubtitle: { type: String, required: true },
        newsReadAllLabel: { type: String, required: true },
        news: [
            {
                _id: false,
                id: { type: Number, required: true },
                title: { type: String, required: true },
                description: { type: String, required: true },
                author: { type: String, required: true },
                date: { type: String, required: true },
            },
        ],
        milestonesTitle: { type: String, required: true },
        milestonesNote: { type: String, required: true },
        milestones: [
            {
                _id: false,
                id: { type: Number, required: true },
                date: { type: String, required: true },
                title: { type: String, required: true },
                detail: String,
            },
        ],
        publicationsHome: {
            eyebrow: { type: String, required: true },
            badge: { type: String, required: true },
            readMoreLabel: { type: String, required: true },
            viewAllLabel: { type: String, required: true },
        },
        workshops: [
            {
                _id: false,
                id: { type: Number, required: true },
                eyebrow: { type: String, required: true },
                title: { type: String, required: true },
                description: { type: String, required: true },
                backgroundImageUrl: { type: String, default: '' },
                scheduleLabel: { type: String, required: true },
                date: { type: String, required: true },
                note: { type: String, required: true },
                sessionTitle: { type: String, required: true },
                sessionSubtitle: { type: String, required: true },
                time: { type: String, required: true },
            },
        ],
        footer: {
            headlineOne: { type: String, required: true },
            headlineTwo: { type: String, required: true },
            headlineThree: { type: String, required: true },
            ctaLabel: { type: String, required: true },
            ctaUrl: { type: String, required: true },
            logos: { type: [pageImageSchema], default: [] },
            contactHeading: { type: String, required: true },
            facebookLabel: { type: String, required: true },
            facebookUrl: { type: String, required: true },
            emailLabel: { type: String, required: true },
            email: { type: String, required: true },
            phoneLabel: { type: String, required: true },
            phone: { type: String, required: true },
            copyrightLine: { type: String, required: true },
            rightsLine: { type: String, required: true },
        },
    },
    { timestamps: true }
);
const pageContentDb = mongoose.connection.useDb('pageContentDb');
const PageContent = pageContentDb.model<IPageContent>(
    'PageContent',
    pageContentSchema,
    'pageContentCollection'
);

export default PageContent;
