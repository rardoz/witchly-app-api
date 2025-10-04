import { type EmailConfig, EmailService } from '../services/email.service';

// Email configuration from environment variables
const emailConfig: EmailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number.parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  requireTLS: true, // Always require TLS for AWS SES
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  from: process.env.EMAIL_FROM || 'noreply@witchly.app',
  ...(process.env.EMAIL_FROM_NAME && { fromName: process.env.EMAIL_FROM_NAME }),
};

// Create and export email service instance
export const emailService = new EmailService(emailConfig);

// Development mode warning
if (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) {
  console.warn(`
⚠️  Email service warning: SMTP credentials not configured.
   Email sending will fail unless you configure the following environment variables:
   - SMTP_HOST (default: smtp.gmail.com)
   - SMTP_PORT (default: 587)
   - SMTP_SECURE (default: false)
   - SMTP_USER (required)
   - SMTP_PASS (required)
   - EMAIL_FROM (default: noreply@witchly.app)
  `);
}
