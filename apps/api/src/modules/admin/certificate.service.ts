import { randomUUID, createHash } from 'crypto';

import { eq, and, desc, sql as sqlFn } from 'drizzle-orm';
import PDFDocument from 'pdfkit';

import {
  getFrameworkCertificateText,
  getFrameworkValidityYears,
  type RegulatoryFramework,
} from '@the-dmz/shared';

import { loadConfig, type AppConfig } from '../../config.js';
import { getDatabaseClient } from '../../shared/database/connection.js';
import { certificates } from '../../shared/database/schema/index.js';

export interface Certificate {
  certificateId: string;
  tenantId: string;
  userId: string;
  campaignId: string | null;
  frameworkId: string;
  courseName: string;
  issuedAt: Date;
  expiresAt: Date | null;
  signatureHash: string | null;
  pdfBlob: Buffer | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CertificateInput {
  userId: string;
  campaignId?: string;
  frameworkId: RegulatoryFramework;
  courseName: string;
  userName: string;
  issuedAt?: Date;
}

export interface CertificateListQuery {
  userId?: string;
  campaignId?: string;
  frameworkId?: string;
  limit?: number;
  offset?: number;
}

export interface CertificateListResult {
  certificates: Certificate[];
  total: number;
}

function generateCertificateId(): string {
  return randomUUID();
}

function generateSignatureHash(
  certificateId: string,
  userIdentifier: string,
  courseName: string,
): string {
  const data = `${certificateId}:${userIdentifier}:${courseName}:${Date.now()}`;
  return createHash('sha256').update(data).digest('hex');
}

function generatePDF(
  userName: string,
  courseName: string,
  frameworkId: RegulatoryFramework,
  certificateId: string,
  issuedAt: Date,
  expiresAt: Date | null,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f8f9fa');

    doc
      .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
      .stroke('#1a365d')
      .lineWidth(3);

    doc
      .fontSize(14)
      .fillColor('#1a365d')
      .text('TRAINING COMPLETION CERTIFICATE', 0, 60, { align: 'center' });

    doc.moveDown(2);

    doc.fontSize(12).fillColor('#4a5568').text('This is to certify that', { align: 'center' });

    doc.moveDown();

    doc
      .fontSize(28)
      .fillColor('#1a365d')
      .font('Helvetica-Bold')
      .text(userName, { align: 'center' });

    doc.moveDown();

    doc
      .fontSize(12)
      .fillColor('#4a5568')
      .font('Helvetica')
      .text('has successfully completed the training program', { align: 'center' });

    doc.moveDown();

    doc
      .fontSize(22)
      .fillColor('#1a365d')
      .font('Helvetica-Bold')
      .text(courseName, { align: 'center' });

    doc.moveDown(2);

    const frameworkText = getFrameworkCertificateText(frameworkId);
    doc.fontSize(10).fillColor('#718096').text(frameworkText, { align: 'center' });

    doc.moveDown(2);

    const issuedDateStr = issuedAt.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let validityText = `Issued: ${issuedDateStr}`;
    if (expiresAt) {
      const expiresDateStr = expiresAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      validityText += ` | Expires: ${expiresDateStr}`;
    }

    doc.fontSize(10).fillColor('#718096').text(validityText, { align: 'center' });

    doc.moveDown();

    doc
      .fontSize(9)
      .fillColor('#a0aec0')
      .text(`Certificate ID: ${certificateId}`, { align: 'center' });

    const footerY = doc.page.height - 80;
    doc
      .fontSize(10)
      .fillColor('#1a365d')
      .text('The DMZ: Archive Gate', doc.page.width / 4, footerY, { align: 'center' });

    doc
      .fontSize(8)
      .fillColor('#718096')
      .text('Enterprise Security Training Platform', doc.page.width / 4, footerY + 15, {
        align: 'center',
      });

    doc
      .fontSize(10)
      .fillColor('#1a365d')
      .text('Digital Signature', (doc.page.width * 3) / 4, footerY, {
        align: 'center',
      });

    doc
      .fontSize(8)
      .fillColor('#718096')
      .text('Verified by The DMZ Platform', (doc.page.width * 3) / 4, footerY + 15, {
        align: 'center',
      });

    const signatureHash = generateSignatureHash(certificateId, userName, courseName);
    doc
      .fontSize(6)
      .fillColor('#cbd5e0')
      .text(signatureHash.substring(0, 32), (doc.page.width * 3) / 4, footerY + 30, {
        align: 'center',
      });

    doc.end();
  });
}

export const generateCertificate = async (
  tenantId: string,
  input: CertificateInput,
  config: AppConfig = loadConfig(),
): Promise<Certificate> => {
  const db = getDatabaseClient(config);

  const certificateId = generateCertificateId();
  const issuedAt = input.issuedAt ?? new Date();
  const validityYears = getFrameworkValidityYears(input.frameworkId);
  const expiresAt = new Date(issuedAt);
  expiresAt.setFullYear(expiresAt.getFullYear() + validityYears);

  const pdfBuffer = await generatePDF(
    input.userName,
    input.courseName,
    input.frameworkId,
    certificateId,
    issuedAt,
    expiresAt,
  );

  const signatureHash = generateSignatureHash(certificateId, input.userId, input.courseName);

  const [inserted] = await db
    .insert(certificates)
    .values({
      certificateId,
      tenantId,
      userId: input.userId,
      campaignId: input.campaignId ?? null,
      frameworkId: input.frameworkId,
      courseName: input.courseName,
      issuedAt,
      expiresAt,
      signatureHash,
      pdfBlob: pdfBuffer,
      metadata: {},
    })
    .returning()
    .onConflictDoNothing({
      target: certificates.certificateId,
    });

  if (!inserted) {
    throw new Error('Failed to generate certificate');
  }

  return {
    certificateId: inserted.certificateId,
    tenantId: inserted.tenantId,
    userId: inserted.userId,
    campaignId: inserted.campaignId,
    frameworkId: inserted.frameworkId,
    courseName: inserted.courseName,
    issuedAt: new Date(inserted.issuedAt),
    expiresAt: inserted.expiresAt ? new Date(inserted.expiresAt) : null,
    signatureHash: inserted.signatureHash,
    pdfBlob: inserted.pdfBlob ? Buffer.from(inserted.pdfBlob) : null,
    metadata: inserted.metadata as Record<string, unknown>,
    createdAt: new Date(inserted.createdAt),
    updatedAt: new Date(inserted.updatedAt),
  };
};

export const listCertificates = async (
  tenantId: string,
  query: CertificateListQuery,
  config: AppConfig = loadConfig(),
): Promise<CertificateListResult> => {
  const db = getDatabaseClient(config);

  const conditions = [eq(certificates.tenantId, tenantId)];

  if (query.userId) {
    conditions.push(eq(certificates.userId, query.userId));
  }

  if (query.campaignId) {
    conditions.push(eq(certificates.campaignId, query.campaignId));
  }

  if (query.frameworkId) {
    conditions.push(eq(certificates.frameworkId, query.frameworkId));
  }

  const limit = query.limit ?? 50;
  const offset = query.offset ?? 0;

  const certificateList = await db
    .select()
    .from(certificates)
    .where(and(...conditions))
    .orderBy(desc(certificates.issuedAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sqlFn`count(*)` })
    .from(certificates)
    .where(and(...conditions));

  const total = Number(countResult?.count ?? 0);

  return {
    certificates: certificateList.map((c) => ({
      certificateId: c.certificateId,
      tenantId: c.tenantId,
      userId: c.userId,
      campaignId: c.campaignId,
      frameworkId: c.frameworkId,
      courseName: c.courseName,
      issuedAt: new Date(c.issuedAt),
      expiresAt: c.expiresAt ? new Date(c.expiresAt) : null,
      signatureHash: c.signatureHash,
      pdfBlob: c.pdfBlob ? Buffer.from(c.pdfBlob) : null,
      metadata: c.metadata as Record<string, unknown>,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
    })),
    total,
  };
};

export const getCertificateById = async (
  tenantId: string,
  certificateId: string,
  config: AppConfig = loadConfig(),
): Promise<Certificate | null> => {
  const db = getDatabaseClient(config);

  const [certificate] = await db
    .select()
    .from(certificates)
    .where(and(eq(certificates.tenantId, tenantId), eq(certificates.certificateId, certificateId)))
    .limit(1);

  if (!certificate) {
    return null;
  }

  return {
    certificateId: certificate.certificateId,
    tenantId: certificate.tenantId,
    userId: certificate.userId,
    campaignId: certificate.campaignId,
    frameworkId: certificate.frameworkId,
    courseName: certificate.courseName,
    issuedAt: new Date(certificate.issuedAt),
    expiresAt: certificate.expiresAt ? new Date(certificate.expiresAt) : null,
    signatureHash: certificate.signatureHash,
    pdfBlob: certificate.pdfBlob ? Buffer.from(certificate.pdfBlob) : null,
    metadata: certificate.metadata as Record<string, unknown>,
    createdAt: new Date(certificate.createdAt),
    updatedAt: new Date(certificate.updatedAt),
  };
};

export const getCertificatePDF = async (
  tenantId: string,
  certificateId: string,
  config: AppConfig = loadConfig(),
): Promise<Buffer | null> => {
  const certificate = await getCertificateById(tenantId, certificateId, config);

  if (!certificate || !certificate.pdfBlob) {
    return null;
  }

  return certificate.pdfBlob;
};

export const bulkGenerateCertificates = async (
  tenantId: string,
  inputs: CertificateInput[],
  config: AppConfig = loadConfig(),
): Promise<Certificate[]> => {
  const results: Certificate[] = [];

  for (const input of inputs) {
    try {
      const certificate = await generateCertificate(tenantId, input, config);
      results.push(certificate);
    } catch (error) {
      console.error(`Failed to generate certificate for user ${input.userId}:`, error);
    }
  }

  return results;
};
