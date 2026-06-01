import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

interface PublicationEmailData {
    title: string;
    author: string;
    year: string;
    journal: string;
    doi: string;
    authorGmail: string;
}

interface MentorProfileEmailData {
    title: string;
    fullName: string;
    department: string;
    email: string;
    personalWebsite: string;
    orcid: string;
    researchGate: string;
    googleScholar: string;
    researchAreas: string;
    researchTopics: string;
    note: string;
    avatar: { url: string; publicId: string } | null;
}

const sendSignupConfirmationEmail = async (email: string, token: string): Promise<void> => {
    const backendUrl = (process.env.BACKEND_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
    const mailOptions = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: 'Confirm Your Email Address',
        html: `
            <h2>Welcome to ResFes 2026!</h2>
            <p>Thank you for signing up. Please confirm your email address by clicking the link below:</p>
            <a href="${backendUrl}/auth/confirm-email?token=${encodeURIComponent(token)}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #fff; text-decoration: none; border-radius: 4px;">Confirm Email</a>
            <p>If you did not sign up for this account, please ignore this email.</p>
        `,
    };
    await transporter.sendMail(mailOptions);
}

const sendPublicationEmail = async (data: PublicationEmailData): Promise<void> => {
    const { title, author, year, journal, doi, authorGmail } = data;

    const mailOptions = {
        from: process.env.GMAIL_USER,
        to: process.env.NOTIFY_EMAIL,
        subject: `New Publication Submitted: ${title}`,
        html: `
            <h2>📄 New Publication Submitted</h2>
            <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Title</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${title}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Author</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${author}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Year</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${year || 'N/A'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Journal / Conference</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${journal || 'N/A'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">DOI</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${doi ? `<a href="https://doi.org/${doi}">${doi}</a>` : 'N/A'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Submitted by</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${authorGmail}</td>
                </tr>
            </table>
        `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Notification email sent to ${process.env.NOTIFY_EMAIL}`);
};

const sendMentorProfileEmail = async (data: MentorProfileEmailData): Promise<void> => {
    const {
        title, fullName, department, email,
        personalWebsite, orcid, researchGate, googleScholar,
        researchAreas, researchTopics, note, avatar,
    } = data;

    const avatarHtml = avatar
        ? `<img src="${avatar.url}" alt="Avatar" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover;" />`
        : '<em>No avatar uploaded</em>';

    const linkOrEmpty = (url: string, label: string) =>
        url ? `<a href="${url}" style="color: #2563eb;">${label}</a>` : '<em>Not provided</em>';

    const mailOptions = {
        from: process.env.GMAIL_USER,
        to: process.env.NOTIFY_EMAIL,
        subject: `Mentor Profile Submission: ${fullName}`,
        html: `
            <h2>👤 Mentor Profile Submitted for Approval</h2>
            <div style="margin-bottom: 16px;">${avatarHtml}</div>
            <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Title</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${title}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Full Name</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${fullName}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Department</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${department || '<em>Not provided</em>'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Email</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${email}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Personal Website</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${linkOrEmpty(personalWebsite, personalWebsite)}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">OrCID</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${linkOrEmpty(orcid, orcid)}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">ResearchGate</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${linkOrEmpty(researchGate, 'View Profile')}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Google Scholar</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${linkOrEmpty(googleScholar, 'View Profile')}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Research Areas</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${researchAreas || '<em>Not provided</em>'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Research Topics</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${researchTopics || '<em>Not provided</em>'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Note</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${note || '<em>Not provided</em>'}</td>
                </tr>
            </table>
        `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Mentor profile notification email sent to ${process.env.NOTIFY_EMAIL}`);
};

export { sendSignupConfirmationEmail, sendPublicationEmail, sendMentorProfileEmail };
