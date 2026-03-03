import { RequestHandler } from 'express'
import paths from '../../constants/paths'
import { AuditService, ContactDetailsService } from '../../services'
import contactDetailsViewModel from '../../models/view-models/contactDetails'
import ContactDetailsFormDataModel, { ContactDetailsFormData } from '../../models/form-data/contactDetails'
import TaskListService from '../../services/taskListService'
import BaseFormController from '../base/BaseFormController'
import { ContactDetails } from '../../models/ContactDetails'

export default class ContactDetailsController extends BaseFormController {
  constructor(
    private readonly auditService: AuditService,
    private readonly contactDetailsService: ContactDetailsService,
    taskListService: TaskListService,
  ) {
    super(taskListService)
  }

  view: RequestHandler = this.createViewHandler<ContactDetails, ContactDetailsFormData, object>({
    template: 'pages/order/contact-information/contact-details',
    getEntity: order => order.contactDetails,
    constructViewModel: contactDetailsViewModel.construct,
  })

  update: RequestHandler = this.createUpdateHandler<ContactDetailsFormData, ContactDetails>({
    formDataSchema: ContactDetailsFormDataModel,
    updateService: (accessToken, orderId, data) =>
      this.contactDetailsService.updateContactDetails({
        accessToken,
        orderId,
        data,
      }),
    currentPagePath: paths.CONTACT_INFORMATION.CONTACT_DETAILS,
    taskListPage: 'CONTACT_DETAILS',
  })
}
