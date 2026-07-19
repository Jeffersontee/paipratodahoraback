# Padrão de Criação de Validators (Express Validator Class)

Sempre crie as classes de validação de dados seguindo estritamente as regras abaixo para higienizar e validar o payload das requisições na borda da aplicação.

## 1. Diretriz de Localização
- **Pasta Obrigatória**: Todas as classes de validação de entrada devem ser salvas estritamente no diretório `src/validators/` do backend.
- **Nomenclatura**: O nome do arquivo deve seguir o formato `[Entidade]Validator.ts` (ex: `ServiceOrderValidator.ts`).

## 2. Regras de Estrutura
1. **Métodos Estáticos**: A classe de validação deve expor métodos estáticos (ex: `static create()`, `static update()`) para facilitar a chamada direta no arquivo de rotas.
2. **Retorno de Array**: Cada método deve retornar uma lista (Array) de middlewares de validação (ex: `body()`, `param()`, `query()`) do `express-validator`.
3. **Interceptação de Erros**: O último item do array de retorno de qualquer método de validação deve ser obrigatoriamente o middleware global de interceptação de erros: `ValidatorMiddleware.checkError`.
4. **Validações Obrigatórias por Tipo**:
   - **Campos de ID**: Sempre valide se são ObjectIds válidos do MongoDB usando `.isMongoId()`.
   - **Campos Numéricos**: Garanta que inteiros ou decimais usem `.isNumeric()` ou `.isInt()`.
   - **Textos**: Use `.isString().trim().notEmpty()` para evitar strings vazias ou cheias de espaços em branco.
   - **Higienização de Nulos**: Use `.customSanitizer` para tratar valores opcionais que possam vir do front-end como string vazia `""`, `"null"` ou `undefined`, convertendo-os para `null` antes de atingir os controllers.

## 3. Exemplo de Referência
```typescript
import { body, param } from 'express-validator';
import { ValidatorMiddleware } from '../middlewares/global/validator.middleware';

export class ServiceOrderValidator {

    static create() {
        return [
            body('company_id', 'O ID da empresa é obrigatório.').isMongoId(),
            body('unit_id', 'O ID da unidade é obrigatório.').isMongoId(),
            body('scheduled_date', 'A data é obrigatória.').notEmpty(),
            body('collaborator_id').optional({ nullable: true }).customSanitizer(v => v === '' ? null : v),
            ValidatorMiddleware.checkError
        ];
    }
}
```

## 4. Script de Auditoria Automatizada
A skill possui o script `check-validators.ts` na pasta `scripts/`. Ele analisa de forma inteligente todos os arquivos de rotas em `src/routers/` e reporta quaisquer rotas de escrita (`POST`, `PUT`, `PATCH`) que não possuam middlewares de validação associados, ajudando a manter a segurança da API a cada build.
