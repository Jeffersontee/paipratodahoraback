import { Router } from 'express';
import { AppConfigController } from '../controllers/AppConfigController';

class AppConfigRouter {
    public router: Router;

    constructor() {
        this.router = Router();
        this.setRoutes();
    }

    setRoutes() {
        this.router.get('/check-version', AppConfigController.checkVersion);
    }
}

export default new AppConfigRouter().router;
