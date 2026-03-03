import { ZodSchema } from 'zod'
import { Order } from '../../models/Order'
import { ValidationResult } from '../../models/Validation'
import { Page } from '../../services/taskListService'

/**
 * Configuration for creating a view handler
 */
export type ViewConfig<TEntity, TFormData, TViewModel> = {
  /**
   * Template path for rendering the view
   */
  template: string

  /**
   * Extracts the entity data from the order
   */
  getEntity: (order: Order) => TEntity

  /**
   * Constructs the view model from entity data, form data, and validation errors
   */
  constructViewModel: (entity: TEntity, formData: TFormData | undefined, errors: ValidationResult) => TViewModel
}

/**
 * Configuration for creating an update handler
 */
export type UpdateConfig<TFormData, TResult> = {
  /**
   * Zod schema to parse and validate form data
   */
  formDataSchema: ZodSchema<TFormData & { action: string }>

  /**
   * Service method to call with the parsed form data
   */
  updateService: (
    accessToken: string,
    orderId: string,
    data: Omit<TFormData, 'action'>,
  ) => Promise<TResult | ValidationResult>

  /**
   * Path to redirect to when there are validation errors
   */
  currentPagePath: string

  /**
   * Page identifier for task list navigation
   */
  taskListPage: Page

  /**
   * Optional: Transforms the order with the result for navigation calculation
   * Useful when the next page depends on the saved data
   */
  getUpdatedOrder?: (order: Order, result: TResult) => Order
}

/**
 * Extract form data type from an update config (excluding action field)
 */
export type FormDataFromConfig<T> = T extends UpdateConfig<infer TFormData, unknown> ? Omit<TFormData, 'action'> : never
