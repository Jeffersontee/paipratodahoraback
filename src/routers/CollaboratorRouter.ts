import { Router } from 'express';
import { CollaboratorController } from '../controllers/CollaboratorController';

class CollaboratorRouter {
    public router: Router;

    constructor() {
        this.router = Router();
        this.getRoutes();
        this.postRoutes();
        this.putRoutes();
        this.patchRoutes();
        this.deleteRoutes();
    }

    getRoutes() {
        this.router.get('/', CollaboratorController.getCollaborators);
        this.router.get('/:id', CollaboratorController.getCollaboratorById);
    }

    postRoutes() {
        this.router.post('/', CollaboratorController.createCollaborator);
    }

    putRoutes() {
        this.router.put('/:id', CollaboratorController.updateCollaborator);
    }

    patchRoutes() {
        // ...
    }

    deleteRoutes() {
        this.router.delete('/:id', CollaboratorController.deleteCollaborator);
    }
}

export default new CollaboratorRouter().router;
