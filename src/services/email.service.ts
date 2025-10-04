import nodemailer, { type Transporter } from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private transporter: Transporter;
  private fromAddress: string;

  constructor(config: EmailConfig) {
    this.fromAddress = config.from;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }

  async sendEmail(to: string, template: EmailTemplate): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    const template = this.generateVerificationTemplate(code);
    await this.sendEmail(email, template);
  }

  private generateVerificationTemplate(code: string): EmailTemplate {
    const subject = 'Your Witchly Verification Code';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verification Code</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            color: #6b46c1;
            margin-bottom: 10px;
        }
        .title {
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 20px;
        }
        .code-container {
            background-color: #f8fafc;
            border: 2px dashed #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
        }
        .verification-code {
            font-size: 36px;
            font-weight: bold;
            color: #6b46c1;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
        }
        .message {
            color: #6b7280;
            font-size: 16px;
            margin-bottom: 20px;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #9ca3af;
            font-size: 14px;
        }
        .warning {
            background-color: #fef3cd;
            border: 1px solid #fbbf24;
            color: #92400e;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">✨ Witchly</div>
            <div class="title">Verify your email address</div>
        </div>
        
        <p class="message">
            Welcome to Witchly! To complete your account setup, please use the verification code below:
        </p>
        
        <div class="code-container">
            <div class="verification-code">${code}</div>
        </div>
        
        <p class="message">
            Enter this code in the app to verify your email address and activate your account.
        </p>
        
        <div class="warning">
            <strong>Important:</strong> This code will expire in 15 minutes. If you didn't request this verification, please ignore this email.
        </div>
        
        <div class="footer">
            <p>This email was sent to you because you requested an account verification.</p>
            <p>If you have any questions, please contact our support team.</p>
        </div>
    </div>
</body>
</html>
    `;

    const text = `
Witchly - Verify your email address

Welcome to Witchly! To complete your account setup, please use the verification code below:

Verification Code: ${code}

Enter this code in the app to verify your email address and activate your account.

Important: This code will expire in 15 minutes. If you didn't request this verification, please ignore this email.

This email was sent to you because you requested an account verification.
If you have any questions, please contact our support team.
    `;

    return { subject, html, text };
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email service connection test failed:', error);
      return false;
    }
  }
}
