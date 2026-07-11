# 🛢️ Padrão Barrel para Middlewares Globais

Este documento explica como funciona a arquitetura de fatiamento e exportação unificada (Barrel) utilizada no diretório `src/middlewares/global/`.

---

## 🎯 Por que usamos o padrão Barrel?

1. **Evitar Arquivos Gigantes**: Mantém nossos middlewares com menos de 100 linhas por arquivo.
2. **Manutenibilidade**: Isola contextos de erro, autenticação e regras de negócio.
3. **Zero Impacto nas Rotas**: Permite reorganizar a arquitetura interna sem quebrar os imports dos mais de 22 arquivos de roteamento existentes.

---

## 📁 Estrutura de Pastas

```text
src/
└── middlewares/
    └── global/
        ├── auth.middleware.ts        # Validação de token JWT e sessão do usuário
        ├── request.middleware.ts     # Correção de protótipos e sanitização do body
        ├── subscription.middleware.ts# Bloqueio por inadimplência (Paywall)
        ├── tenant.middleware.ts      # Resolução de conexão multi-tenant (Banco Isolado)
        ├── validator.middleware.ts   # Interceptador do express-validator
        └── index.ts                  # O BARRIL (Agrupador e Exportador Único)
```

---

## 🛠️ Como Funciona o arquivo `index.ts` (O Barrel)

O arquivo `index.ts` funciona como uma fachada (_Facade_). Ele importa as implementações isoladas de cada arquivo e monta o objeto `GlobalMiddleWare` que o restante do sistema já conhece.

```typescript
import { AuthMiddleware } from "./auth.middleware";
import { ValidatorMiddleware } from "./validator.middleware";
import { TenantMiddleware } from "./tenant.middleware";
import { RequestMiddleware } from "./request.middleware";
import { SubscriptionMiddleware } from "./subscription.middleware";

export const GlobalMiddleWare = {
  auth: AuthMiddleware.authenticate,
  checkError: ValidatorMiddleware.checkError,
  resolveTenant: TenantMiddleware.resolveTenant,
  handleRequestBody: RequestMiddleware.handleRequestBody,
  checkSubscriptionActive: SubscriptionMiddleware.checkSubscriptionActive,
};
```

---

## 🚀 Como Consumir nas Rotas

Graças ao Barrel, o Node.js resolve automaticamente pastas apontando para arquivos `index`. Portanto, a importação fica curta, limpa e padronizada em todos os arquivos de rotas.

```typescript
import { Router } from "express";
import { GlobalMiddleWare } from "../middlewares/global"; // Aponta para a pasta!
import { ProductController } from "../controllers/ProductController";

const router = Router();

router.get(
  "/products",
  GlobalMiddleWare.auth,
  GlobalMiddleWare.resolveTenant,
  ProductController.getAll,
);

export default router;
```

---

## 🛑 Regras para Criar Novos Middlewares Globais

1. **Nunca** adicione código lógico diretamente no arquivo `index.ts`. Ele serve apenas para exportar.
2. Crie um arquivo focado no escopo do middleware (ex: `logging.middleware.ts`).
3. Crie métodos estáticos (`static`) dentro da classe do arquivo.
4. Registre o método dentro do objeto exportado no `index.ts` para disponibilizá-lo para as rotas.
