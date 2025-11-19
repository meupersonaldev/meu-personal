"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
exports.emailService = {
    async sendEmail({ to, subject, html, text }) {
        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = process.env.SMTP_PORT;
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
            console.warn('SMTP credentials are not fully configured. Email will not be sent.');
            if (process.env.NODE_ENV !== 'production') {
                console.log('--- MOCK EMAIL ---');
                console.log(`To: ${to}`);
                console.log(`Subject: ${subject}`);
                console.log('--- HTML BODY ---');
                console.log(html);
                console.log('--- TEXT BODY ---');
                console.log(text);
                console.log('------------------');
            }
            return;
        }
        const transporter = nodemailer_1.default.createTransport({
            host: smtpHost,
            port: parseInt(smtpPort, 10),
            secure: parseInt(smtpPort, 10) === 465,
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        });
        try {
            await transporter.sendMail({
                from: `"Meu Personal" <${smtpUser}>`,
                to,
                subject,
                html,
                text,
            });
        }
        catch (error) {
            console.error('Error sending email via SMTP:', error);
            throw new Error('Failed to send email');
        }
    },
};
//# sourceMappingURL=email.service.js.map