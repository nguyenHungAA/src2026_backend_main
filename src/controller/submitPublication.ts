import { Request, Response } from 'express';
import Publication from '../model/publicationModel.js';
import { sendPublicationEmail } from '../service/emailService.js';
// @ts-ignore — bibtex-parse-js has no type declarations
import bibtexParse from 'bibtex-parse-js';

const submitPublication = async (req: Request, res: Response): Promise<void> => {
    try {
        const { bibtex, authorGmail, images } = req.body;

        if (!bibtex || !authorGmail) {
            res.status(400).json({ message: 'Missing required fields (bibtex, authorGmail)' });
            return;
        }

        // Parse BibTeX string to JSON
        let parsed;
        try {
            parsed = bibtexParse.toJSON(bibtex);
        } catch (parseErr) {
            res.status(400).json({ message: 'Invalid BibTeX format', error: String(parseErr) });
            return;
        }

        if (!parsed || parsed.length === 0) {
            res.status(400).json({ message: 'No entries found in BibTeX input' });
            return;
        }

        // Take the first entry
        const entry = parsed[0];
        const tags = entry.entryTags || {};

        const publicationData = {
            entryType: entry.entryType || '',
            citationKey: entry.citationKey || '',
            title: tags.title || tags.TITLE || '',
            author: tags.author || tags.AUTHOR || '',
            journal: tags.journal || tags.JOURNAL || '',
            booktitle: tags.booktitle || tags.BOOKTITLE || '',
            year: tags.year || tags.YEAR || '',
            volume: tags.volume || tags.VOLUME || '',
            number: tags.number || tags.NUMBER || '',
            pages: tags.pages || tags.PAGES || '',
            doi: tags.doi || tags.DOI || '',
            abstract: tags.abstract || tags.ABSTRACT || '',
            keywords: tags.keywords || tags.KEYWORDS || '',
            publisher: tags.publisher || tags.PUBLISHER || '',
            url: tags.url || tags.URL || '',
            rawBibtex: bibtex,
            authorGmail,
            images: images || [],
        };

        if (!publicationData.title || !publicationData.author) {
            res.status(400).json({ message: 'BibTeX must contain at least title and author fields' });
            return;
        }

        const newPublication = new Publication(publicationData);
        const saved = await newPublication.save();

        // Send notification email (non-blocking)
        sendPublicationEmail({
            title: publicationData.title,
            author: publicationData.author,
            year: publicationData.year,
            journal: publicationData.journal || publicationData.booktitle,
            doi: publicationData.doi,
            authorGmail,
        }).catch((err: any) => console.error('Failed to send notification email:', err));

        res.status(201).json({ message: 'Publication submitted successfully', data: saved });
    } catch (error) {
        console.error('Error submitting publication:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export default submitPublication;
