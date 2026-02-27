import { z } from 'zod';

export const SCIM_MAX_OPERATIONS_PER_BULK_REQUEST = 1000;
export const SCIM_MAX_PAYLOAD_SIZE_BYTES = 1048576;

export const scimUserSchema = z.object({
  id: z.string().uuid().optional(),
  userName: z.string(),
  name: z
    .object({
      formatted: z.string().optional(),
      familyName: z.string().optional(),
      givenName: z.string().optional(),
      middleName: z.string().optional(),
      honorificPrefix: z.string().optional(),
      honorificSuffix: z.string().optional(),
    })
    .optional(),
  displayName: z.string().optional(),
  nickName: z.string().optional(),
  profileUrl: z.string().url().optional(),
  title: z.string().optional(),
  userType: z.string().optional(),
  preferredLanguage: z.string().optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
  active: z.boolean().optional(),
  password: z.string().optional(),
  emails: z
    .array(
      z.object({
        value: z.string().email().optional(),
        type: z.string().optional(),
        primary: z.boolean().optional(),
      }),
    )
    .optional(),
  phoneNumbers: z
    .array(
      z.object({
        value: z.string().optional(),
        type: z.string().optional(),
        primary: z.boolean().optional(),
      }),
    )
    .optional(),
  roles: z
    .array(
      z.object({
        value: z.string().optional(),
        type: z.string().optional(),
        primary: z.boolean().optional(),
      }),
    )
    .optional(),
  groups: z
    .array(
      z.object({
        value: z.string().uuid().optional(),
        $ref: z.string().optional(),
        display: z.string().optional(),
      }),
    )
    .optional(),
  meta: z
    .object({
      resourceType: z.string().optional(),
      created: z.string().datetime().optional(),
      lastModified: z.string().datetime().optional(),
      location: z.string().optional(),
      version: z.string().optional(),
    })
    .optional(),
});

export type SCIMUser = z.infer<typeof scimUserSchema>;

export const scimGroupSchema = z.object({
  id: z.string().uuid().optional(),
  displayName: z.string(),
  members: z
    .array(
      z.object({
        value: z.string().uuid().optional(),
        $ref: z.string().optional(),
        display: z.string().optional(),
      }),
    )
    .optional(),
  meta: z
    .object({
      resourceType: z.string().optional(),
      created: z.string().datetime().optional(),
      lastModified: z.string().datetime().optional(),
      location: z.string().optional(),
      version: z.string().optional(),
    })
    .optional(),
});

export type SCIMGroup = z.infer<typeof scimGroupSchema>;

export const scimListResponseSchema = z.object({
  schemas: z.array(z.string()),
  totalResults: z.number().int().nonnegative(),
  startIndex: z.number().int().positive(),
  itemsPerPage: z.number().int().positive(),
  Resources: z.array(z.unknown()),
});

export type SCIMListResponse = z.infer<typeof scimListResponseSchema>;

export const scimBulkGetOperationSchema = z.object({
  method: z.literal('get'),
  path: z.string(),
  bulkId: z.string().optional(),
});

export const scimBulkPostOperationSchema = z.object({
  method: z.literal('post'),
  path: z.string(),
  bulkId: z.string(),
  data: z.unknown(),
});

export const scimBulkPutOperationSchema = z.object({
  method: z.literal('put'),
  path: z.string(),
  bulkId: z.string().optional(),
  data: z.unknown(),
});

export const scimBulkPatchOperationSchema = z.object({
  method: z.literal('patch'),
  path: z.string(),
  bulkId: z.string().optional(),
  data: z.unknown(),
});

export const scimBulkDeleteOperationSchema = z.object({
  method: z.literal('delete'),
  path: z.string(),
  bulkId: z.string().optional(),
});

export const scimBulkOperationSchema = z.discriminatedUnion('method', [
  scimBulkGetOperationSchema,
  scimBulkPostOperationSchema,
  scimBulkPutOperationSchema,
  scimBulkPatchOperationSchema,
  scimBulkDeleteOperationSchema,
]);

export const scimBulkRequestSchema = z.object({
  schemas: z.array(z.literal('urn:ietf:params:scim:api:messages:2.0:BulkRequest')),
  failOnErrors: z.number().int().positive().optional(),
  operations: z.array(scimBulkOperationSchema),
});

export type SCIMBulkRequest = z.infer<typeof scimBulkRequestSchema>;

export const scimBulkResponseSchema = z.object({
  schemas: z.array(z.literal('urn:ietf:params:scim:api:messages:2.0:BulkResponse')),
  Operations: z.array(
    z.object({
      bulkId: z.string().optional(),
      method: z.string(),
      status: z.number().int(),
      location: z.string().optional(),
      response: z.unknown().optional(),
    }),
  ),
});

export type SCIMBulkResponse = z.infer<typeof scimBulkResponseSchema>;

export interface SCIMServiceProviderConfig {
  schemas: ['urn:ietf:params:scim:api:messages:2.0:ServiceProviderConfig'];
  documentationUri: string;
  patch: { supported: boolean };
  bulk: {
    supported: boolean;
    maxOperations: number;
    maxPayloadSize: number;
  };
  filter: {
    supported: boolean;
    maxResults: number;
  };
  changePassword: { supported: boolean };
  sort: { supported: boolean };
  etag: { supported: boolean };
  authenticationSchemes: Array<{
    name: string;
    description: string;
    specUri: string;
    type: string;
    primary: boolean;
  }>;
}

export const scimServiceProviderConfig: SCIMServiceProviderConfig = {
  schemas: ['urn:ietf:params:scim:api:messages:2.0:ServiceProviderConfig'],
  documentationUri: 'https://docs.example.com/scim',
  patch: { supported: true },
  bulk: {
    supported: true,
    maxOperations: SCIM_MAX_OPERATIONS_PER_BULK_REQUEST,
    maxPayloadSize: SCIM_MAX_PAYLOAD_SIZE_BYTES,
  },
  filter: {
    supported: true,
    maxResults: 1000,
  },
  changePassword: { supported: false },
  sort: { supported: false },
  etag: { supported: false },
  authenticationSchemes: [
    {
      name: 'OAuth 2.0 Bearer Token',
      description:
        'The API uses OAuth 2.0 bearer tokens for authentication. Clients must obtain an access token using the client credentials flow.',
      specUri: 'https://tools.ietf.org/html/rfc6749',
      type: 'oauth2',
      primary: true,
    },
  ],
};

export const scimUserSchemaResource = {
  schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
  id: 'urn:ietf:params:scim:schemas:core:2.0:User',
  name: 'User',
  description: 'SCIM User schema',
  attributes: [
    {
      name: 'id',
      type: 'string',
      multiValued: false,
      required: false,
      caseExact: false,
      mutability: 'readOnly',
    },
    {
      name: 'userName',
      type: 'string',
      multiValued: false,
      required: true,
      caseExact: false,
      mutability: 'readWrite',
    },
    {
      name: 'name',
      type: 'complex',
      multiValued: false,
      required: false,
      caseExact: false,
      mutability: 'readWrite',
    },
    {
      name: 'displayName',
      type: 'string',
      multiValued: false,
      required: false,
      caseExact: false,
      mutability: 'readWrite',
    },
    {
      name: 'nickName',
      type: 'string',
      multiValued: false,
      required: false,
      caseExact: false,
      mutability: 'readWrite',
    },
    {
      name: 'profileUrl',
      type: 'reference',
      multiValued: false,
      required: false,
      caseExact: false,
      mutability: 'readWrite',
    },
    {
      name: 'title',
      type: 'string',
      multiValued: false,
      required: false,
      caseExact: false,
      mutability: 'readWrite',
    },
    {
      name: 'userType',
      type: 'string',
      multiValued: false,
      required: false,
      caseExact: false,
      mutability: 'readWrite',
    },
    {
      name: 'preferredLanguage',
      type: 'string',
      multiValued: false,
      required: false,
      caseExact: false,
      mutability: 'readWrite',
    },
    {
      name: 'locale',
      type: 'string',
      multiValued: false,
      required: false,
      caseExact: false,
      mutability: 'readWrite',
    },
    {
      name: 'timezone',
      type: 'string',
      multiValued: false,
      required: false,
      caseExact: false,
      mutability: 'readWrite',
    },
    {
      name: 'active',
      type: 'boolean',
      multiValued: false,
      required: false,
      caseExact: false,
      mutability: 'readWrite',
    },
    {
      name: 'password',
      type: 'string',
      multiValued: false,
      required: false,
      caseExact: false,
      mutability: 'writeOnly',
    },
    {
      name: 'emails',
      type: 'complex',
      multiValued: true,
      required: false,
      caseExact: false,
      mutability: 'readWrite',
    },
    {
      name: 'phoneNumbers',
      type: 'complex',
      multiValued: true,
      required: false,
      caseExact: false,
      mutability: 'readWrite',
    },
    {
      name: 'roles',
      type: 'complex',
      multiValued: true,
      required: false,
      caseExact: false,
      mutability: 'readWrite',
    },
    {
      name: 'groups',
      type: 'complex',
      multiValued: true,
      required: false,
      caseExact: false,
      mutability: 'readOnly',
    },
  ],
  meta: {
    resourceType: 'Schema',
    created: '2024-01-01T00:00:00Z',
    lastModified: '2024-01-01T00:00:00Z',
    location:
      'https://api.example.com/v1/scim/v2/Schemas/urn:ietf:params:scim:schemas:core:2.0:User',
    version: 'W/"1"',
  },
};

export const scimGroupSchemaResource = {
  schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
  id: 'urn:ietf:params:scim:schemas:core:2.0:Group',
  name: 'Group',
  description: 'SCIM Group schema',
  attributes: [
    {
      name: 'id',
      type: 'string',
      multiValued: false,
      required: false,
      caseExact: false,
      mutability: 'readOnly',
    },
    {
      name: 'displayName',
      type: 'string',
      multiValued: false,
      required: true,
      caseExact: false,
      mutability: 'readWrite',
    },
    {
      name: 'members',
      type: 'complex',
      multiValued: true,
      required: false,
      caseExact: false,
      mutability: 'readWrite',
    },
  ],
  meta: {
    resourceType: 'Schema',
    created: '2024-01-01T00:00:00Z',
    lastModified: '2024-01-01T00:00:00Z',
    location:
      'https://api.example.com/v1/scim/v2/Schemas/urn:ietf:params:scim:schemas:core:2.0:Group',
    version: 'W/"1"',
  },
};

export const scimResourceTypes = [
  {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
    id: 'User',
    name: 'User',
    endpoint: '/Users',
    schema: 'urn:ietf:params:scim:schemas:core:2.0:User',
    schemaExtensions: [],
    meta: {
      resourceType: 'ResourceType',
      created: '2024-01-01T00:00:00Z',
      lastModified: '2024-01-01T00:00:00Z',
      location: 'https://api.example.com/v1/scim/v2/ResourceTypes/User',
    },
  },
  {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
    id: 'Group',
    name: 'Group',
    endpoint: '/Groups',
    schema: 'urn:ietf:params:scim:schemas:core:2.0:Group',
    schemaExtensions: [],
    meta: {
      resourceType: 'ResourceType',
      created: '2024-01-01T00:00:00Z',
      lastModified: '2024-01-01T00:00:00Z',
      location: 'https://api.example.com/v1/scim/v2/ResourceTypes/Group',
    },
  },
];
