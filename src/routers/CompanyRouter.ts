import { Router } from 'express';
import { CompanyController } from '../controllers/CompanyController';

class CompanyRouter {
    public router: Router;

    constructor() {
        this.router = Router();
        this.setRoutes();
    }

    setRoutes() {
        this.router.get('/', CompanyController.list);
        this.router.post('/', CompanyController.create);
        this.router.get('/:id', CompanyController.get);
        this.router.put('/:id', CompanyController.update);
        this.router.delete('/:id', CompanyController.delete);
    }
}

export default new CompanyRouter().router;
