import nodemailer from 'nodemailer'


interface EmailParams {
  to: string
  subject: string
  html: string
  text: string
}

export const emailService = {
  async sendEmail({ to, subject, html, text }: EmailParams) {
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = process.env.SMTP_PORT
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.warn('SMTP credentials are not fully configured. Email will not be sent.')
      if (process.env.NODE_ENV !== 'production') {
        console.log('--- MOCK EMAIL ---')
        console.log(`To: ${to}`)
        console.log(`Subject: ${subject}`)
        console.log('--- HTML BODY ---')
        console.log(html)
        console.log('--- TEXT BODY ---')
        console.log(text)
        console.log('------------------')
      }
      return
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: parseInt(smtpPort, 10) === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })

    try {
      await transporter.sendMail({
        from: `"Meu Personal" <${smtpUser}>`,
        to,
        subject,
        html,
        text,
      })
    } catch (error) {
      console.error('Error sending email via SMTP:', error)
      throw new Error('Failed to send email')
    }
  },
}
