# Padrão de Criação de Routers (Express Router Class)

Sempre crie os arquivos de rotas seguindo estritamente as regras abaixo:

## Regras de Estrutura
1. **Instanciação Interna**: A classe do Router deve possuir uma propriedade pública `router: Router` e instanciar o seu respectivo Controller de forma privada no construtor.
2. **Métodos Segmentados**: O construtor deve obrigatoriamente chamar funções separadas por métodos HTTP: `this.getRoutes()`, `this.postRoutes()`, `this.patchRoutes()`, `this.putRoutes()`, `this.deleteRoutes()`.
3. **Middlewares Injetados**: Use a ordem lógica: Autenticação (`GlobalMiddleWare.auth`) -> Permissão (`GlobalMiddleWare.adminRole`) -> Validador de Schema -> `GlobalMiddleWare.checkError` -> Método do Controller.
4. **Exportação**: Exporte a classe já instanciada retornando a propriedade `.router` (`export default new ExemploRouter().router;`).

## Exemplo de Referência
```typescript
import { Router } from "express";
import { GlobalMiddleWare } from '../middlewares/GlobalMiddleWare';
import { ExemploController } from '../controllers/ExemploController';

class ExemploRouter {
    public router: Router;
    private exemploController: ExemploController;

    constructor() {
        this.router = Router();
        this.exemploController = new ExemploController();
        this.getRoutes();
        this.postRoutes();
    }

    getRoutes() {
        this.router.get('/', GlobalMiddleWare.auth, (req, res) => this.exemploController.getAll(req, res));
    }
    
    postRoutes() {
        this.router.post('/create', GlobalMiddleWare.auth, (req, res) => this.exemploController.create(req, res));
    }
    patchRoutes() {}
    putRoutes() {}
    deleteRoutes() {}
}
export default new ExemploRouter().router;
```
