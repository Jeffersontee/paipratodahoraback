import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';

class DashboardRouter {
    public router: Router;

    constructor() {
        this.router = Router();
        this.setRoutes();
    }

    setRoutes() {
        this.router.get('/', DashboardController.getStats);
    }
}

export default new DashboardRouter().router;
