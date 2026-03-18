export { registerScormRoutes } from './scorm.routes.js';

export {
  createScormPackage,
  listScormPackages,
  getScormPackage,
  deleteScormPackage,
  createScormRegistration,
  updateScormRegistration,
  getScormRegistration,
  listScormRegistrations,
  type ScormVersion,
  type CreateScormPackageInput,
} from './scorm.service.js';

export {
  createScormPackageSchema,
  scormPackageResponseSchema,
  createRegistrationSchema,
  updateRegistrationSchema,
  scormRegistrationResponseSchema,
  type CreateScormPackageInput as CreateScormPackageSchemaInput,
  type ScormPackageResponse,
  type ScormRegistrationResponse,
} from './scorm.schemas.js';
