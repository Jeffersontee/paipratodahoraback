import { Router } from 'express';
import { ServiceOrderController } from '../controllers/ServiceOrderController';
import { ServiceOrderValidator } from '../validators/ServiceOrderValidator';

class ServiceOrderRouter {
    public router: Router;

    constructor() {
        this.router = Router();
        this.setRoutes();
    }

    setRoutes() {
        this.router.get('/', ServiceOrderController.list);
        this.router.post('/', ServiceOrderValidator.create(), ServiceOrderController.create);
        this.router.get('/:id', ServiceOrderController.get);
        this.router.patch('/:id/status', ServiceOrderController.updateStatus);
        this.router.patch('/:id/assign-technician', ServiceOrderController.assignTechnician);
        this.router.patch('/:id/accept-schedule', ServiceOrderController.acceptSchedule);
        this.router.patch('/:id/propose-schedule', ServiceOrderController.proposeNewSchedule);
        this.router.patch('/:id/cancel', ServiceOrderController.cancelOrder);
        this.router.patch('/:id/transit-issue', ServiceOrderController.reportTransitIssue);
        this.router.patch('/:id/transit-resolve', ServiceOrderController.resolveTransitIssue);
        this.router.patch('/:id/impediment', ServiceOrderController.reportExecutionImpediment);
        this.router.post('/:id/aditive', ServiceOrderController.addAditive);
        this.router.patch('/:id/checkout', ServiceOrderController.checkoutOrder);
        this.router.patch('/:id/evaluate', ServiceOrderController.evaluateOrder);
        this.router.put('/:id', ServiceOrderValidator.update(), ServiceOrderController.update);
        this.router.delete('/:id', ServiceOrderController.delete);
    }
}

export default new ServiceOrderRouter().router;
