import { Router } from 'express';
import { InvoiceController } from '../controllers/InvoiceController';
import { GlobalMiddleWare } from '../middlewares/GlobalMiddleware';

class InvoiceRouter {
    public router: Router;

    constructor() {
        this.router = Router();
        this.setRoutes();
    }

    setRoutes() {
        this.router.get('/', GlobalMiddleWare.auth, InvoiceController.getInvoices);
        this.router.get('/stats', GlobalMiddleWare.auth, InvoiceController.getInvoiceStats);
        this.router.get('/:id', GlobalMiddleWare.auth, InvoiceController.getInvoiceById);
        this.router.post('/:id/pay', GlobalMiddleWare.auth, GlobalMiddleWare.adminRole, InvoiceController.markAsPaid);
        this.router.post('/:id/pix', GlobalMiddleWare.auth, InvoiceController.generatePixForInvoice);
    }
}

export default new InvoiceRouter().router;
