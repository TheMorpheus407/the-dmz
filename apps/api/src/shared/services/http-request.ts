export interface HttpRequest {
  id: string;
  url: string;
  method: string;
  routeOptions?: { url?: string };
  user?: { userId?: string };
  tenantContext?: { tenantId?: string };
  server?: { config?: { NODE_ENV?: string } };
  log: {
    warn: (obj: object, msg: string) => void;
    error: (obj: object, msg: string) => void;
  };
}
