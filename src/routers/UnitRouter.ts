import { Router } from 'express';
import { UnitController } from '../controllers/UnitController';

class UnitRouter {
    public router: Router;

    constructor() {
        this.router = Router();
        this.setRoutes();
    }

    setRoutes() {
        this.router.get('/', UnitController.list);
        this.router.post('/', UnitController.create);
        this.router.get('/:id', UnitController.get);
        this.router.put('/:id', UnitController.update);
        this.router.delete('/:id', UnitController.delete);
    }
}

export default new UnitRouter().router;
