import { Router } from 'express';
import { AddressController } from '../controllers/AddressController';
import { AuthMiddleware } from '../middlewares/global/auth.middleware';

class AddressRouter {
    public router: Router;

    constructor() {
        this.router = Router();
        this.setRoutes();
    }

    setRoutes() {
        // Rotas públicas / utilitárias de verificação
        this.router.get('/checkCoverage', AddressController.checkCoverage);

        // Rotas protegidas por autenticação
        this.router.get('/userAddresses', AuthMiddleware.authenticate, AddressController.getUserAddresses);
        this.router.get('/getUserLimitedAddresses', AuthMiddleware.authenticate, AddressController.getUserAddresses);
        this.router.get('/checkAddress', AuthMiddleware.authenticate, AddressController.checkAddress);
        
        this.router.post('/create', AuthMiddleware.authenticate, AddressController.create);
        this.router.post('/', AuthMiddleware.authenticate, AddressController.create);
        
        this.router.get('/:id', AuthMiddleware.authenticate, AddressController.get);
        
        this.router.put('/edit/:id', AuthMiddleware.authenticate, AddressController.update);
        this.router.put('/:id', AuthMiddleware.authenticate, AddressController.update);
        
        this.router.patch('/default/:id', AuthMiddleware.authenticate, AddressController.setDefault);
        
        this.router.delete('/delete/:id', AuthMiddleware.authenticate, AddressController.delete);
        this.router.delete('/:id', AuthMiddleware.authenticate, AddressController.delete);
    }
}

export default new AddressRouter().router;
