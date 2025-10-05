import * as nodemailer from 'nodemailer';
import {
  type EmailTemplateData,
  emailTemplateService,
} from './email-template.service';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  requireTLS?: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  fromName?: string; // Optional display name
}

export interface EmailTemplate {
  subject: string;
  html: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private fromAddress: string;

  constructor(config: EmailConfig) {
    // Format the from address with optional display name
    if (config.fromName) {
      this.fromAddress = `"${config.fromName}" <${config.from}>`;
    } else {
      this.fromAddress = config.from;
    }

    // AWS SES configuration with proper TLS settings
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure, // false for port 587, true for port 465
      requireTLS: config.requireTLS !== undefined ? config.requireTLS : true,
      auth: config.auth,
      tls: {
        // Do not fail on invalid certs for AWS SES
        rejectUnauthorized: false,
      },
    });
  }

  async sendEmail(to: string, template: EmailTemplate): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject: template.subject,
        html: template.html,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send verification code using template service
   */
  async sendVerificationCode(email: string, code: string): Promise<void> {
    const template = await emailTemplateService.getTemplate(
      'signup-verification',
      {
        code,
        expiryMinutes: 15,
      }
    );
    await this.sendEmail(email, template);
  }

  /**
   * Send login verification code using template service
   */
  async sendLoginVerificationCode(
    email: string,
    code: string,
    userName: string = 'User'
  ): Promise<void> {
    const template = await emailTemplateService.getTemplate(
      'login-verification',
      {
        code,
        expiryMinutes: 15,
        userName,
      }
    );
    await this.sendEmail(email, template);
  }

  /**
   * Send email using a template name and data
   */
  async sendTemplatedEmail(
    to: string,
    templateName: string,
    data: EmailTemplateData
  ): Promise<void> {
    const template = await emailTemplateService.getTemplate(templateName, data);
    await this.sendEmail(to, template);
  }

  /**
   * Debug method to list available methods
   */
  listMethods(): string[] {
    return Object.getOwnPropertyNames(Object.getPrototypeOf(this));
  }
}
