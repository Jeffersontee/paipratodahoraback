import { Router } from 'express';
import HelpController from '../controllers/HelpController';
import { GlobalMiddleWare } from '../middlewares/GlobalMiddleware';

class HelpRouter {
    public router: Router;

    constructor() {
        this.router = Router();
        this.init();
    }

    private init(): void {
        // Público (mas requer autenticação no HubDB, ou seja, um usuário válido do sistema)
        // Lojistas precisam ler os tópicos. O middleware authenticate garante que um token JWT foi enviado.
        this.router.get('/', GlobalMiddleWare.auth, HelpController.getHelpCategories);

        // Acesso restrito ao Super Admin
        const superAdminMiddlewares = [
            GlobalMiddleWare.auth,
            GlobalMiddleWare.adminRole
        ];

        this.router.post('/', ...superAdminMiddlewares, HelpController.createCategory);
        this.router.put('/:id', ...superAdminMiddlewares, HelpController.updateCategory);
        this.router.delete('/:id', ...superAdminMiddlewares, HelpController.deleteCategory);

        this.router.post('/:id/topics', ...superAdminMiddlewares, HelpController.addTopic);
        this.router.put('/:categoryId/topics/:topicId', ...superAdminMiddlewares, HelpController.updateTopic);
        this.router.delete('/:categoryId/topics/:topicId', ...superAdminMiddlewares, HelpController.deleteTopic);
    }
}

export default new HelpRouter().router;
