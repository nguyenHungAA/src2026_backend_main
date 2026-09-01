import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS ?? 10000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS ?? 10000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS ?? 15000),
});

export type SignupEmailData = {
    email: string;
    token: string;
};

export type PublicationEmailData = {
    referenceId: string;
    submittedAt: string;
    title: string;
    author: string;
    year: string;
    journal: string;
    doi: string;
    authorGmail: string;
};

export type MentorProfileEmailData = {
    referenceId: string;
    submittedAt: string;
    title: string;
    fullName: string;
    department: string;
    email: string;
    researchAreas: string;
    researchTopics: string;
};

export type RegistrationEmailData = {
    referenceId: string;
    submittedAt: string;
    name: string;
    email: string;
    topic: string;
    field: string;
    mentor: string;
};

const escapeHtml = (value: unknown): string => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const formatTime = (value: string): string => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? String(value)
        : `${date.toISOString()} (${date.toLocaleString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' })} Asia/Ho_Chi_Minh)`;
};

const table = (rows: Array<[string, unknown]>): string => `
    <table style="border-collapse:collapse;width:100%;max-width:680px">
        ${rows.map(([label, value]) => `
            <tr>
                <th scope="row" style="padding:8px;border:1px solid #ddd;text-align:left">${escapeHtml(label)}</th>
                <td style="padding:8px;border:1px solid #ddd">${escapeHtml(value) || 'Not provided'}</td>
            </tr>`).join('')}
    </table>`;

const send = async (to: string, subject: string, html: string, text: string): Promise<void> => {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        throw new Error('SMTP is not configured');
    }
    await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to,
        subject,
        html,
        text,
    });
};

export const sendSignupConfirmationEmail = async ({ email, token }: SignupEmailData): Promise<void> => {
    const backendUrl = (process.env.BACKEND_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
    const confirmationUrl = `${backendUrl}/api/v1/auth/confirm-email?token=${encodeURIComponent(token)}`;
    await send(
        email,
        '[SRC2026][ACCOUNT] Confirm your email address',
        `<h2>Confirm your SRC2026 account</h2><p><a href="${escapeHtml(confirmationUrl)}">Confirm email</a></p><p>This link expires in 24 hours.</p>`,
        `Confirm your SRC2026 account within 24 hours: ${confirmationUrl}`,
    );
};

export const sendPublicationEmail = async (data: PublicationEmailData): Promise<void> => {
    const subject = `[SRC2026][PUBLICATION][${data.referenceId}] New submission`;
    await send(
        String(process.env.NOTIFY_EMAIL ?? ''),
        subject,
        `<h2>Publication submission</h2>${table([
            ['Reference', data.referenceId],
            ['Submitted at', formatTime(data.submittedAt)],
            ['Title', data.title],
            ['Author', data.author],
            ['Year', data.year],
            ['Journal / conference', data.journal],
            ['DOI', data.doi],
            ['Submitted by', data.authorGmail],
        ])}`,
        `${subject}\nSubmitted at: ${data.submittedAt}\nTitle: ${data.title}\nAuthor: ${data.author}\nSubmitted by: ${data.authorGmail}`,
    );
};

export const sendMentorProfileEmail = async (data: MentorProfileEmailData): Promise<void> => {
    const subject = `[SRC2026][MENTOR][${data.referenceId}] New submission`;
    await send(
        String(process.env.NOTIFY_EMAIL ?? ''),
        subject,
        `<h2>Mentor profile submission</h2>${table([
            ['Reference', data.referenceId],
            ['Submitted at', formatTime(data.submittedAt)],
            ['Title', data.title],
            ['Full name', data.fullName],
            ['Department', data.department],
            ['Email', data.email],
            ['Research areas', data.researchAreas],
            ['Research topics', data.researchTopics],
        ])}`,
        `${subject}\nSubmitted at: ${data.submittedAt}\nName: ${data.fullName}\nEmail: ${data.email}`,
    );
};

export const sendRegistrationEmail = async (data: RegistrationEmailData): Promise<void> => {
    const subject = `[SRC2026][REGISTRATION][${data.referenceId}] New registration`;
    await send(
        String(process.env.NOTIFY_EMAIL ?? ''),
        subject,
        `<h2>Research registration</h2>${table([
            ['Reference', data.referenceId],
            ['Submitted at', formatTime(data.submittedAt)],
            ['Name', data.name],
            ['Email', data.email],
            ['Topic', data.topic],
            ['Field', data.field],
            ['Mentor', data.mentor],
        ])}`,
        `${subject}\nSubmitted at: ${data.submittedAt}\nName: ${data.name}\nTopic: ${data.topic}\nMentor: ${data.mentor}`,
    );
};
