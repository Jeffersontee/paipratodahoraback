import { Router } from 'express';
import { PlanController } from '../controllers/PlanController';
import { GlobalMiddleWare } from '../middlewares/GlobalMiddleware';

class PlanRouter {
    public router: Router;

    constructor() {
        this.router = Router();
        this.setRoutes();
    }

    setRoutes() {
        this.router.get('/', GlobalMiddleWare.auth, PlanController.getPlans);
        this.router.get('/:id', GlobalMiddleWare.auth, PlanController.getPlanById);
        this.router.post('/', GlobalMiddleWare.auth, GlobalMiddleWare.adminRole, PlanController.createPlan);
        this.router.put('/:id', GlobalMiddleWare.auth, GlobalMiddleWare.adminRole, PlanController.updatePlan);
        this.router.patch('/:id/status', GlobalMiddleWare.auth, GlobalMiddleWare.adminRole, PlanController.updateStatus);
        this.router.delete('/:id', GlobalMiddleWare.auth, GlobalMiddleWare.adminRole, PlanController.deletePlan);
        this.router.post('/:subscriptionId/renew-pix', GlobalMiddleWare.auth, PlanController.renewSubscriptionPix);
    }
}

export default new PlanRouter().router;
