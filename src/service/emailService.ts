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
    publishTitle: string;
    author: string;
    publishDate: string;
    content: string;
    authorGmail: string;
}

const sendPublicationEmail = async (data: PublicationEmailData): Promise<void> => {
    const { publishTitle, author, publishDate, content, authorGmail } = data;

    const mailOptions = {
        from: process.env.GMAIL_USER,
        to: process.env.NOTIFY_EMAIL,
        subject: `New Publication Submitted: ${publishTitle}`,
        html: `
            <h2>📄 New Publication Submitted</h2>
            <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Title</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${publishTitle}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Author</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${author}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Date</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${publishDate}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Author Gmail</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${authorGmail}</td>
                </tr>
            </table>
            <h3>Content:</h3>
            <p>${content}</p>
        `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Notification email sent to ${process.env.NOTIFY_EMAIL}`);
};

export default sendPublicationEmail;
