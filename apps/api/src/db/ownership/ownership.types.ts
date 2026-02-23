export interface TableOwnership {
  schema: string;
  table: string;
  module: string;
}

export interface OwnershipManifest {
  ownership: TableOwnership[];
  sharedTables: string[];
  exceptions: TableOwnershipException[];
}

export interface TableOwnershipException {
  schema: string;
  table: string;
  allowedModules: string[];
  justification: string;
}

export interface BoundaryViolation {
  type: 'unauthorized_access' | 'raw_sql_foreign_schema';
  file: string;
  line?: number;
  module: string;
  table: string;
  schema: string;
  message: string;
}
