// Import and register all your controllers from the importmap via controllers/**/*_controller
import { application } from "controllers/application"
import { eagerLoadControllersFrom } from "@hotwired/stimulus-loading"
eagerLoadControllersFrom("controllers", application)
import SubscribersController from "controllers/subscribers_controller"
application.register("subscribers", SubscribersController)
import NotificationRowsController from "controllers/notification_rows_controller"
application.register("notification-rows", NotificationRowsController)
import StudentVaultController from "controllers/student_vault_controller"
application.register("student-vault", StudentVaultController)
