interface EmailParams {
    to: string;
    subject: string;
    html: string;
    text: string;
}
export declare const emailService: {
    sendEmail({ to, subject, html, text }: EmailParams): Promise<void>;
};
export {};
//# sourceMappingURL=email.service.d.ts.map