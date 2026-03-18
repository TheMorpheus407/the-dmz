export interface EmailTemplateVariables {
  [key: string]: string | number | boolean | null | undefined;
}

export interface RenderedEmailTemplate {
  subject: string;
  bodyHtml: string;
  bodyText: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
}

export interface TenantBranding {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  companyName?: string;
  websiteUrl?: string;
  address?: string;
  supportEmail?: string;
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
}

const VARIABLE_PATTERN = /\{\{([a-zA-Z_][a-zA-Z0-9_.]*)\}\}/g;

export function substituteVariables(template: string, variables: EmailTemplateVariables): string {
  return template.replace(VARIABLE_PATTERN, (match, key) => {
    const value = variables[key as keyof EmailTemplateVariables];
    if (value === undefined || value === null) {
      return match;
    }
    return String(value);
  });
}

export function extractVariables(template: string): string[] {
  const matches = template.matchAll(VARIABLE_PATTERN);
  const variables = new Set<string>();
  for (const match of matches) {
    if (match[1] !== undefined) {
      variables.add(match[1]);
    }
  }
  return Array.from(variables);
}

function htmlEscape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

const DEFAULT_TEMPLATE_LAYOUT = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
</head>
<body style="margin: 0; padding: 0; font-family: {{fontFamily}}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <div style="background-color: {{primaryColor}}; padding: 20px; text-align: center;">
      {{#if logoUrl}}
      <img src="{{logoUrl}}" alt="{{companyName}}" style="max-width: 200px; height: auto;">
      {{/if}}
      {{#unless logoUrl}}
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">{{companyName}}</h1>
      {{/unless}}
    </div>
    <div style="padding: 30px; color: #333333; line-height: 1.6;">
      {{content}}
    </div>
    <div style="padding: 20px; background-color: #f9f9f9; border-top: 1px solid #eeeeee; font-size: 12px; color: #666666; text-align: center;">
      {{#if companyName}}
      <p style="margin: 0 0 10px 0;">{{companyName}}</p>
      {{/if}}
      {{#if address}}
      <p style="margin: 0 0 10px 0;">{{address}}</p>
      {{/if}}
      {{#if supportEmail}}
      <p style="margin: 0 0 10px 0;">
        Need help? <a href="mailto:{{supportEmail}}" style="color: {{primaryColor}};">Contact Support</a>
      </p>
      {{/if}}
      {{#if privacyPolicyUrl}}
      <p style="margin: 0;">
        <a href="{{privacyPolicyUrl}}" style="color: #666666;">Privacy Policy</a>
        {{#if termsOfServiceUrl}} | <a href="{{termsOfServiceUrl}}" style="color: #666666;">Terms of Service</a>{{/if}}
      </p>
      {{/if}}
    </div>
  </div>
</body>
</html>
`;

function applyBranding(layout: string, branding: TenantBranding): string {
  let result = layout;

  result = result.replace(/\{\{logoUrl\}\}/g, htmlEscape(branding.logoUrl || ''));
  result = result.replace(/\{\{companyName\}\}/g, htmlEscape(branding.companyName || 'The DMZ'));
  result = result.replace(/\{\{primaryColor\}\}/g, htmlEscape(branding.primaryColor || '#1a73e8'));
  result = result.replace(
    /\{\{secondaryColor\}\}/g,
    htmlEscape(branding.secondaryColor || '#34a853'),
  );
  result = result.replace(/\{\{fontFamily\}\}/g, htmlEscape(branding.fontFamily || 'Helvetica'));
  result = result.replace(/\{\{address\}\}/g, htmlEscape(branding.address || ''));
  result = result.replace(/\{\{supportEmail\}\}/g, htmlEscape(branding.supportEmail || ''));
  result = result.replace(/\{\{privacyPolicyUrl\}\}/g, htmlEscape(branding.privacyPolicyUrl || ''));
  result = result.replace(
    /\{\{termsOfServiceUrl\}\}/g,
    htmlEscape(branding.termsOfServiceUrl || ''),
  );
  result = result.replace(/\{\{websiteUrl\}\}/g, htmlEscape(branding.websiteUrl || ''));

  result = result.replace(/\{\{#if logoUrl\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  result = result.replace(/\{\{#unless logoUrl\}\}[\s\S]*?\{\{\/unless\}\}/g, '');
  result = result.replace(/\{\{#if companyName\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  result = result.replace(/\{\{#if address\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  result = result.replace(/\{\{#if supportEmail\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  result = result.replace(/\{\{#if privacyPolicyUrl\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  result = result.replace(/\{\{#if termsOfServiceUrl\}\}[\s\S]*?\{\{\/if\}\}/g, '');

  return result;
}

export const templateService = {
  render(
    template: {
      subject: string;
      bodyHtml: string;
      bodyText?: string;
      fromName?: string;
      fromEmail: string;
      replyTo?: string;
    },
    variables: EmailTemplateVariables,
    branding?: TenantBranding,
  ): RenderedEmailTemplate {
    const subject = substituteVariables(template.subject, variables);
    const contentHtml = substituteVariables(template.bodyHtml, variables);

    let bodyHtml: string;
    if (branding) {
      const layoutWithBranding = applyBranding(DEFAULT_TEMPLATE_LAYOUT, branding);
      bodyHtml = layoutWithBranding.replace(/\{\{content\}\}/g, contentHtml);
    } else {
      bodyHtml = `<div style="font-family: sans-serif; padding: 20px;">${contentHtml}</div>`;
    }

    const bodyText = template.bodyText
      ? substituteVariables(template.bodyText, variables)
      : stripHtml(bodyHtml);

    const fromNameValue = template.fromName || branding?.companyName || 'The DMZ';
    const result: RenderedEmailTemplate = {
      subject,
      bodyHtml,
      bodyText,
      fromName: fromNameValue,
      fromEmail: template.fromEmail,
    };
    if (template.replyTo !== undefined) {
      result.replyTo = template.replyTo;
    }
    return result;
  },

  validateVariables(
    template: { subject: string; bodyHtml: string },
    variables: EmailTemplateVariables,
  ): { valid: boolean; missing: string[]; extra: string[] } {
    const subjectVars = extractVariables(template.subject);
    const bodyVars = extractVariables(template.bodyHtml);
    const allTemplateVars = [...new Set([...subjectVars, ...bodyVars])];

    const providedVars = Object.keys(variables);
    const missing = allTemplateVars.filter((v) => !providedVars.includes(v));
    const extra = providedVars.filter((v) => !allTemplateVars.includes(v));

    return {
      valid: missing.length === 0,
      missing,
      extra,
    };
  },

  extractVariables,
  substituteVariables,
};
