import type {
  EmailIntegration,
  EmailIntegrationStatus,
  EmailProviderType,
  CreateEmailIntegrationInput,
  UpdateEmailIntegrationInput,
  EmailReadinessCheckInput,
  EmailReadinessResult,
  ValidationFailure,
} from '@the-dmz/shared/schemas';

export type {
  EmailIntegration,
  EmailIntegrationStatus,
  EmailProviderType,
  CreateEmailIntegrationInput,
  UpdateEmailIntegrationInput,
  EmailReadinessCheckInput,
  EmailReadinessResult,
  ValidationFailure,
};

export interface EmailIntegrationListResult {
  integrations: EmailIntegration[];
  total: number;
  cursor?: string;
}

export interface EmailValidationRequest {
  integrationId: string;
  runSpfCheck?: boolean;
  runDkimCheck?: boolean;
  runDmarcCheck?: boolean;
}

export interface EmailValidationResult {
  integrationId: string;
  posture: {
    spf: { status: string; record: string; aligned: boolean };
    dkim: { status: string; selector: string; aligned: boolean };
    dmarc: { status: string; policy: string; aligned: boolean };
  };
  failures: ValidationFailure[];
  validatedAt: string;
}
