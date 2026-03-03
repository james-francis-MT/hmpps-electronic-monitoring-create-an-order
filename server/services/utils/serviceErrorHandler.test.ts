import { z } from 'zod'
import { withValidationErrorHandling } from './serviceErrorHandler'
import { SanitisedError } from '../../sanitisedError'

describe('withValidationErrorHandling', () => {
  describe('when operation succeeds', () => {
    it('returns the result from the operation', async () => {
      const expectedResult = { id: '123', name: 'test' }
      const operation = jest.fn().mockResolvedValue(expectedResult)

      const result = await withValidationErrorHandling(operation)

      expect(result).toEqual(expectedResult)
      expect(operation).toHaveBeenCalledTimes(1)
    })
  })

  describe('when operation throws a ZodError', () => {
    it('converts the ZodError to a ValidationResult', async () => {
      const schema = z.object({
        firstName: z.string().min(1, 'First name is required'),
        lastName: z.string().min(1, 'Last name is required'),
      })

      const operation = jest.fn().mockImplementation(() => {
        schema.parse({ firstName: '', lastName: '' })
      })

      const result = await withValidationErrorHandling(operation)

      expect(result).toEqual([
        { field: 'firstName', error: 'First name is required' },
        { field: 'lastName', error: 'Last name is required' },
      ])
    })
  })

  describe('when operation throws a 400 backend error', () => {
    it('converts the backend error to a ValidationResult', async () => {
      const backendError = new Error('Bad Request') as SanitisedError
      backendError.status = 400
      backendError.data = [{ field: 'contactNumber', error: 'Invalid phone number' }]
      backendError.stack = ''

      const operation = jest.fn().mockRejectedValue(backendError)

      const result = await withValidationErrorHandling(operation)

      expect(result).toEqual([{ field: 'contactNumber', error: 'Invalid phone number' }])
    })

    it('adds focusTarget for date fields', async () => {
      const backendError = new Error('Bad Request') as SanitisedError
      backendError.status = 400
      backendError.data = [{ field: 'dateOfBirth', error: 'Invalid date' }]
      backendError.stack = ''

      const operation = jest.fn().mockRejectedValue(backendError)

      const result = await withValidationErrorHandling(operation)

      expect(result).toEqual([{ field: 'dateOfBirth', error: 'Invalid date', focusTarget: 'dateOfBirth-day' }])
    })
  })

  describe('when operation throws a non-400 error', () => {
    it('rethrows the error', async () => {
      const serverError = new Error('Internal Server Error') as SanitisedError
      serverError.status = 500
      serverError.stack = ''

      const operation = jest.fn().mockRejectedValue(serverError)

      await expect(withValidationErrorHandling(operation)).rejects.toThrow('Internal Server Error')
    })

    it('rethrows errors without a status', async () => {
      const networkError = new Error('Network error')

      const operation = jest.fn().mockRejectedValue(networkError)

      await expect(withValidationErrorHandling(operation)).rejects.toThrow('Network error')
    })
  })
})
