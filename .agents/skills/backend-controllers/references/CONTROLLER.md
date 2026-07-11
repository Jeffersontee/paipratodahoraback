# Padrão de Criação de Controllers (Express + TypeScript Class)

Sempre crie as classes de controle seguindo estritamente as regras abaixo:

## Regras de Estrutura
1. **Tipagem Express**: Sempre tipifique os parâmetros como `req: Request, res: Response` e o retorno do método como `Promise<Response>`.
2. **Padrão de Resposta HTTP**: O retorno deve ser padronizado em JSON contendo a estrutura: `{ error: boolean, message: string, data?: any }`.
3. **Mongoose Transactions (Sessões)**: Em rotas que criam ou editam dados que impactam mais de uma collection (ex: criar um log e atualizar um contador), use obrigatoriamente `mongoose.startSession()` e controle o `commitTransaction` / `abortTransaction` dentro de um bloco `try/catch`.
4. **Tratamento de Erros**: Erros de banco (como código 11000 de duplicidade) devem retornar status 409 ou 400 customizados. Erros desconhecidos retornam 500.

## Exemplo de Referência
```typescript
import { Request, Response } from 'express';
import mongoose from 'mongoose';

export class ExemploController {
    async create(req: Request, res: Response): Promise<Response> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // Lógica de negócio aqui...
            await session.commitTransaction();
            session.endSession();
            return res.status(201).json({ error: false, message: 'Sucesso!' });
        } catch (error: any) {
            await session.abortTransaction();
            session.endSession();
            return res.status(500).json({ error: true, message: error.message });
        }
    }
}
```
