# Padrão de Criação de Validators (Express Validator Class)

Sempre crie as classes de validação de dados seguindo estritamente as regras abaixo para higienizar e validar o payload das requisições.

## Regras de Estrutura
1. **Métodos Estáticos**: A classe de validação deve expor métodos estáticos (ex: `static createFeature()`) para facilitar a chamada direta no arquivo de rotas.
2. **Retorno de Array**: Cada método deve retornar uma lista (Array) de middlewares de validação (ex: `body()`, `param()`, `query()`).
3. **Validações Obrigatórias por Tipo**:
   - **Campos de ID**: Sempre valide se são ObjectIds válidos do MongoDB usando `.isMongoId()`.
   - **Campos Numéricos**: Garanta que inteiros ou decimais usem `.isNumeric()` ou `.isInt()` com ranges definidos (`min`/`max`) se necessário.
   - **Textos**: Use `.isString().trim().notEmpty()` para evitar strings vazias ou cheias de espaços em branco.

## Exemplo de Referência
```typescript
import { body, param, query } from 'express-validator';

export class ExemploValidators {

    static createExemplo() {
        return [
            body('establishment_id', 'O ID do estabelecimento enviado é inválido.').isMongoId(),
            body('name', 'O nome do item é obrigatório e deve ser uma string.').isString().trim().notEmpty(),
            body('score', 'A nota deve ser um número inteiro entre 1 e 5.').isInt({ min: 1, max: 5 }),
            body('status', 'O status deve ser um valor booleano.').isBoolean()
        ];
    }

    static getById() {
        return [
            param('id', 'O ID parâmetro informado é inválido.').isMongoId()
        ];
    }
}
```
