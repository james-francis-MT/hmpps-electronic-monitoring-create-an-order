import { Request, RequestHandler, Response } from 'express'
import paths from '../../constants/paths'
import { isValidationResult, ValidationResult } from '../../models/Validation'
import TaskListService from '../../services/taskListService'
import { ViewConfig, UpdateConfig } from './types'

/**
 * Base controller providing factory methods for creating standardized form handlers.
 * Eliminates boilerplate code for common view and update patterns.
 */
export default class BaseFormController {
  constructor(protected readonly taskListService: TaskListService) {}

  /**
   * Creates a view handler that:
   * - Retrieves entity data from the order
   * - Checks for flash form data (from validation errors)
   * - Constructs and renders the view model
   */
  createViewHandler<TEntity, TFormData, TViewModel extends object>(
    config: ViewConfig<TEntity, TFormData, TViewModel>,
  ): RequestHandler {
    return async (req: Request, res: Response) => {
      const entity = config.getEntity(req.order!)
      const errors = req.flash('validationErrors') as unknown as ValidationResult
      const formDataArray = req.flash('formData')
      const formData = formDataArray[0] as TFormData | undefined

      const viewModel = config.constructViewModel(entity, formData, errors)

      res.render(config.template, viewModel)
    }
  }

  /**
   * Creates an update handler that:
   * - Parses form data using the provided schema
   * - Calls the update service
   * - Handles validation errors (flash + redirect to current page)
   * - Handles navigation (continue -> next page, back -> summary)
   */
  createUpdateHandler<TFormData extends Record<string, unknown>, TResult>(
    config: UpdateConfig<TFormData, TResult>,
  ): RequestHandler {
    return async (req: Request, res: Response) => {
      const { orderId } = req.params
      const parsed = config.formDataSchema.parse(req.body)
      const { action, ...formData } = parsed

      const result = await config.updateService(res.locals.user.token, orderId, formData as Omit<TFormData, 'action'>)

      if (isValidationResult(result)) {
        req.flash('formData', formData)
        req.flash('validationErrors', result)
        res.redirect(config.currentPagePath.replace(':orderId', orderId))
      } else if (action === 'continue') {
        const orderForNavigation = config.getUpdatedOrder ? config.getUpdatedOrder(req.order!, result) : req.order!

        res.redirect(this.taskListService.getNextPage(config.taskListPage, orderForNavigation))
      } else {
        res.redirect(paths.ORDER.SUMMARY.replace(':orderId', orderId))
      }
    }
  }
}
