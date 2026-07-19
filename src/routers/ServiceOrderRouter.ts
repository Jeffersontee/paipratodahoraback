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
        this.router.put('/:id', ServiceOrderValidator.update(), ServiceOrderController.update);
        this.router.delete('/:id', ServiceOrderController.delete);
    }
}

export default new ServiceOrderRouter().router;
