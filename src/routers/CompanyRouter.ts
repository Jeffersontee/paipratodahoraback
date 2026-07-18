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

        // Usuários da empresa
        this.router.get('/:id/users', CompanyController.listUsers);
        this.router.post('/:id/users', CompanyController.assignUser);
        this.router.delete('/:id/users/:userId', CompanyController.removeUser);
    }
}

export default new CompanyRouter().router;
