export interface ModuleManifestEntry {
  name: string;
  pluginPath: string;
  routePrefix?: string;
  dependencies: string[];
  startupFlags?: {
    required?: boolean;
    diagnostics?: boolean;
  };
}

export interface ModuleManifest {
  infrastructure: ModuleManifestEntry[];
  modules: ModuleManifestEntry[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  type:
    | 'missing_dependency'
    | 'cycle'
    | 'unknown_module'
    | 'duplicate_module'
    | 'invalid_dependency';
  message: string;
  module?: string;
  dependency?: string;
  cycle?: string[];
}

export interface BootstrapResult {
  success: boolean;
  registeredModules: string[];
  errors?: ValidationError[];
}
