import { z } from 'zod'
import BaseFormController from './BaseFormController'
import { createMockRequest, createMockResponse } from '../../../test/mocks/mockExpress'
import { getMockOrder } from '../../../test/mocks/mockOrder'
import TaskListService from '../../services/taskListService'
import { ValidationResult } from '../../models/Validation'
import { ContactDetails } from '../../models/ContactDetails'
import { DeviceWearer } from '../../models/DeviceWearer'

type ContactDetailsFormData = { contactNumber: string | null }

describe('BaseFormController', () => {
  const mockTaskListService = {
    getNextPage: jest.fn(),
  } as unknown as jest.Mocked<TaskListService>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createViewHandler', () => {
    it('renders the template with entity data when there are no errors', async () => {
      // Arrange
      const controller = new BaseFormController(mockTaskListService)
      const mockOrder = getMockOrder({ contactDetails: { contactNumber: '01234567890' } })
      const req = createMockRequest({
        order: mockOrder,
        flash: jest.fn().mockReturnValue([]),
      })
      const res = createMockResponse()
      const next = jest.fn()

      const viewHandler = controller.createViewHandler<ContactDetails, ContactDetailsFormData, object>({
        template: 'pages/test-page',
        getEntity: order => order.contactDetails,
        constructViewModel: entity => ({
          contactNumber: { value: entity?.contactNumber ?? '' },
          errorSummary: null,
        }),
      })

      // Act
      await viewHandler(req, res, next)

      // Assert
      expect(res.render).toHaveBeenCalledWith('pages/test-page', {
        contactNumber: { value: '01234567890' },
        errorSummary: null,
      })
    })

    it('renders the template using flash form data when validation errors are present', async () => {
      // Arrange
      const controller = new BaseFormController(mockTaskListService)
      const mockOrder = getMockOrder({ contactDetails: { contactNumber: '01234567890' } })
      const validationErrors = [{ field: 'contactNumber', error: 'Invalid phone number' }]
      const flashFormData = { contactNumber: 'invalid' }

      const req = createMockRequest({
        order: mockOrder,
        flash: jest.fn().mockReturnValueOnce(validationErrors).mockReturnValueOnce([flashFormData]),
      })
      const res = createMockResponse()
      const next = jest.fn()

      const viewHandler = controller.createViewHandler<ContactDetails, ContactDetailsFormData, object>({
        template: 'pages/test-page',
        getEntity: order => order.contactDetails,
        constructViewModel: (entity, formData, errors) => ({
          contactNumber: {
            value: formData?.contactNumber ?? entity?.contactNumber ?? '',
            error: errors.length > 0 ? { text: errors[0].error } : undefined,
          },
          errorSummary: errors.length > 0 ? { titleText: 'Error', errorList: [] } : null,
        }),
      })

      // Act
      await viewHandler(req, res, next)

      // Assert
      expect(res.render).toHaveBeenCalledWith('pages/test-page', {
        contactNumber: {
          value: 'invalid',
          error: { text: 'Invalid phone number' },
        },
        errorSummary: { titleText: 'Error', errorList: [] },
      })
    })
  })

  describe('createUpdateHandler', () => {
    const formDataSchema = z.object({
      action: z.string(),
      contactNumber: z.string().nullable(),
    })

    it('calls the service with correct parameters', async () => {
      // Arrange
      const controller = new BaseFormController(mockTaskListService)
      const mockOrder = getMockOrder()
      const mockUpdateService = jest.fn().mockResolvedValue({ contactNumber: '01234567890' })
      mockTaskListService.getNextPage.mockReturnValue('/next-page')

      const req = createMockRequest({
        order: mockOrder,
        params: { orderId: mockOrder.id },
        body: { action: 'continue', contactNumber: '01234567890' },
        flash: jest.fn(),
      })
      const res = createMockResponse()
      const next = jest.fn()

      const updateHandler = controller.createUpdateHandler({
        formDataSchema,
        updateService: mockUpdateService,
        currentPagePath: '/order/:orderId/test-page',
        taskListPage: 'CONTACT_DETAILS',
      })

      // Act
      await updateHandler(req, res, next)

      // Assert
      expect(mockUpdateService).toHaveBeenCalledWith(res.locals.user.token, mockOrder.id, {
        contactNumber: '01234567890',
      })
    })

    it('redirects with flash data on validation error', async () => {
      // Arrange
      const controller = new BaseFormController(mockTaskListService)
      const mockOrder = getMockOrder()
      const validationErrors: ValidationResult = [{ field: 'contactNumber', error: 'Invalid' }]
      const mockUpdateService = jest.fn().mockResolvedValue(validationErrors)

      const req = createMockRequest({
        order: mockOrder,
        params: { orderId: mockOrder.id },
        body: { action: 'continue', contactNumber: 'invalid' },
        flash: jest.fn(),
      })
      const res = createMockResponse()
      const next = jest.fn()

      const updateHandler = controller.createUpdateHandler({
        formDataSchema,
        updateService: mockUpdateService,
        currentPagePath: '/order/:orderId/test-page',
        taskListPage: 'CONTACT_DETAILS',
      })

      // Act
      await updateHandler(req, res, next)

      // Assert
      expect(req.flash).toHaveBeenCalledWith('formData', { contactNumber: 'invalid' })
      expect(req.flash).toHaveBeenCalledWith('validationErrors', validationErrors)
      expect(res.redirect).toHaveBeenCalledWith(`/order/${mockOrder.id}/test-page`)
    })

    it('redirects to next page on continue action', async () => {
      // Arrange
      const controller = new BaseFormController(mockTaskListService)
      const mockOrder = getMockOrder()
      const mockUpdateService = jest.fn().mockResolvedValue({ contactNumber: '01234567890' })
      mockTaskListService.getNextPage.mockReturnValue('/order/123/next-page')

      const req = createMockRequest({
        order: mockOrder,
        params: { orderId: mockOrder.id },
        body: { action: 'continue', contactNumber: '01234567890' },
        flash: jest.fn(),
      })
      const res = createMockResponse()
      const next = jest.fn()

      const updateHandler = controller.createUpdateHandler({
        formDataSchema,
        updateService: mockUpdateService,
        currentPagePath: '/order/:orderId/test-page',
        taskListPage: 'CONTACT_DETAILS',
      })

      // Act
      await updateHandler(req, res, next)

      // Assert
      expect(mockTaskListService.getNextPage).toHaveBeenCalledWith('CONTACT_DETAILS', mockOrder)
      expect(res.redirect).toHaveBeenCalledWith('/order/123/next-page')
    })

    it('redirects to summary page on back action', async () => {
      // Arrange
      const controller = new BaseFormController(mockTaskListService)
      const mockOrder = getMockOrder()
      const mockUpdateService = jest.fn().mockResolvedValue({ contactNumber: '01234567890' })

      const req = createMockRequest({
        order: mockOrder,
        params: { orderId: mockOrder.id },
        body: { action: 'back', contactNumber: '01234567890' },
        flash: jest.fn(),
      })
      const res = createMockResponse()
      const next = jest.fn()

      const updateHandler = controller.createUpdateHandler({
        formDataSchema,
        updateService: mockUpdateService,
        currentPagePath: '/order/:orderId/test-page',
        taskListPage: 'CONTACT_DETAILS',
      })

      // Act
      await updateHandler(req, res, next)

      // Assert
      expect(res.redirect).toHaveBeenCalledWith(`/order/${mockOrder.id}/summary`)
    })

    it('uses updated order for navigation when getUpdatedOrder is provided', async () => {
      // Arrange
      const controller = new BaseFormController(mockTaskListService)
      const mockOrder = getMockOrder()
      mockOrder.deviceWearer.noFixedAbode = null

      const mockUpdateService = jest.fn().mockResolvedValue({ noFixedAbode: false })
      mockTaskListService.getNextPage.mockReturnValue('/order/123/next-page')

      const req = createMockRequest({
        order: mockOrder,
        params: { orderId: mockOrder.id },
        body: { action: 'continue', noFixedAbode: false },
        flash: jest.fn(),
      })
      const res = createMockResponse()
      const next = jest.fn()

      const noFixedAbodeSchema = z.object({
        action: z.string(),
        noFixedAbode: z.boolean(),
      })

      const updateHandler = controller.createUpdateHandler<
        { noFixedAbode: boolean },
        Pick<DeviceWearer, 'noFixedAbode'>
      >({
        formDataSchema: noFixedAbodeSchema,
        updateService: mockUpdateService,
        currentPagePath: '/order/:orderId/no-fixed-abode',
        taskListPage: 'NO_FIXED_ABODE',
        getUpdatedOrder: (order, result) => ({
          ...order,
          deviceWearer: {
            ...order.deviceWearer,
            noFixedAbode: result.noFixedAbode,
          },
        }),
      })

      // Act
      await updateHandler(req, res, next)

      // Assert
      expect(mockTaskListService.getNextPage).toHaveBeenCalledWith(
        'NO_FIXED_ABODE',
        expect.objectContaining({
          deviceWearer: expect.objectContaining({ noFixedAbode: false }),
        }),
      )
    })
  })
})
