import { Router } from 'express';
import { ServiceValidator } from '../validators/ServiceValidator';
import { ServiceController } from '../controllers/ServiceController';

class ServiceRouter {
    public router: Router;

    constructor() {
        this.router = Router();
        this.setRoutes();
    }

    setRoutes() {
        this.router.get('/', ServiceController.list);
        this.router.post('/', ServiceController.create);
        this.router.get('/:id', ServiceController.get);
        this.router.put('/:id', ServiceController.update);
        this.router.delete('/:id', ServiceController.delete);
    }
}

export default new ServiceRouter().router;
