import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as Handlebars from 'handlebars';

export interface EmailTemplateData {
  code: string;
  expiryMinutes: number;
  userName?: string;
  [key: string]: unknown;
}

export interface CompiledEmailTemplate {
  subject: string;
  html: string;
}

class EmailTemplateServiceClass {
  private readonly templatesDir = path.join(__dirname, '../templates/emails');
  private templateCache = new Map<
    string,
    {
      htmlTemplate: HandlebarsTemplateDelegate;
    }
  >();

  /**
   * Get a compiled email template by name
   */
  async getTemplate(
    templateName: string,
    data: EmailTemplateData
  ): Promise<CompiledEmailTemplate> {
    // Load and compile templates if not cached
    if (!this.templateCache.has(templateName)) {
      await this.loadTemplate(templateName);
    }

    const templates = this.templateCache.get(templateName);
    if (!templates) {
      throw new Error(`Template '${templateName}' not found`);
    }

    // Render templates with data
    const html = templates.htmlTemplate(data);

    // Get subject based on template type
    const subject = this.getSubjectForTemplate(templateName);

    return { subject, html };
  }

  /**
   * Load and compile HTML tempalate
   */
  private async loadTemplate(templateName: string): Promise<void> {
    try {
      const htmlPath = path.join(this.templatesDir, `${templateName}.html`);

      const htmlContent = await fs.readFile(htmlPath, 'utf-8');

      const htmlTemplate = Handlebars.compile(htmlContent);

      this.templateCache.set(templateName, {
        htmlTemplate,
      });
    } catch (error) {
      throw new Error(
        `Failed to load template '${templateName}': ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get email subject based on template name
   */
  private getSubjectForTemplate(templateName: string): string {
    const subjects: Record<string, string> = {
      'signup-verification': 'Your Witchly Verification Code',
      'login-verification': 'Your login verification code',
    };

    return subjects[templateName] || 'Witchly Notification';
  }

  /**
   * Clear template cache (useful for testing or development)
   */
  clearCache(): void {
    this.templateCache.clear();
  }
}

// Export a singleton instance
export const emailTemplateService = new EmailTemplateServiceClass();
