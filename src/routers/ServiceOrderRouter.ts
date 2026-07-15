import { Router } from 'express';
import { ServiceOrderController } from '../controllers/ServiceOrderController';

class ServiceOrderRouter {
    public router: Router;

    constructor() {
        this.router = Router();
        this.setRoutes();
    }

    setRoutes() {
        this.router.get('/', ServiceOrderController.list);
        this.router.post('/', ServiceOrderController.create);
        this.router.get('/:id', ServiceOrderController.get);
        this.router.patch('/:id/status', ServiceOrderController.updateStatus);
        this.router.put('/:id', ServiceOrderController.update);
        this.router.delete('/:id', ServiceOrderController.delete);
    }
}

export default new ServiceOrderRouter().router;
