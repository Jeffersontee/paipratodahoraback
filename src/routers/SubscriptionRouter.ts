import { Router } from 'express';
import { SubscriptionController } from '../controllers/SubscriptionController';
import { GlobalMiddleWare } from '../middlewares/GlobalMiddleware';

class SubscriptionRouter {
    public router: Router;

    constructor() {
        this.router = Router();
        this.setRoutes();
    }

    setRoutes() {
        this.router.get('/', GlobalMiddleWare.auth, SubscriptionController.getSubscriptions);
        this.router.get('/:id', GlobalMiddleWare.auth, SubscriptionController.getSubscriptionById);
        this.router.post('/', GlobalMiddleWare.auth, GlobalMiddleWare.adminRole, SubscriptionController.createSubscription);
        this.router.post('/checkout', GlobalMiddleWare.auth, SubscriptionController.createCheckoutSession);
        this.router.put('/:id', GlobalMiddleWare.auth, GlobalMiddleWare.adminRole, SubscriptionController.updateSubscription);
        this.router.post('/:id/upgrade', GlobalMiddleWare.auth, SubscriptionController.upgradeSubscription);
        this.router.post('/:id/downgrade', GlobalMiddleWare.auth, SubscriptionController.downgradeSubscription);
        this.router.post('/:id/cancel', GlobalMiddleWare.auth, SubscriptionController.cancelSubscription);
        this.router.delete('/:id', GlobalMiddleWare.auth, GlobalMiddleWare.adminRole, SubscriptionController.deleteSubscription);
    }
}

export default new SubscriptionRouter().router;
