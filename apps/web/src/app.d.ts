declare global {
  namespace App {
    interface Locals {
      user?: {
        id: string;
        email: string;
        displayName: string;
        tenantId: string;
        role: string;
        isActive: boolean;
      } | null;
    }
    interface PageData {}
    interface Error {
      requestId?: string;
      tenantId?: string;
      userId?: string;
      code?: string;
      status?: number;
      message?: string;
    }
    interface Platform {}
  }
}

export {};
