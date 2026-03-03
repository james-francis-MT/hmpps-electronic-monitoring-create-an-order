import { ZodError } from 'zod'
import { ValidationResult } from '../../models/Validation'
import { SanitisedError } from '../../sanitisedError'
import { convertZodErrorToValidationError, convertBackendErrorToValidationError } from '../../utils/errors'

/**
 * Wraps an async operation and converts validation errors (ZodError or 400 backend errors)
 * into a ValidationResult. Non-validation errors are rethrown.
 *
 * @param operation - The async operation to execute
 * @returns The result of the operation, or a ValidationResult if validation fails
 */
// eslint-disable-next-line import/prefer-default-export
export async function withValidationErrorHandling<T>(operation: () => Promise<T> | T): Promise<T | ValidationResult> {
  try {
    return await operation()
  } catch (e) {
    if (e instanceof ZodError) {
      return convertZodErrorToValidationError(e)
    }

    const sanitisedError = e as SanitisedError
    if (sanitisedError.status === 400) {
      return convertBackendErrorToValidationError(sanitisedError)
    }

    throw e
  }
}
