---
name: backend-models
description: Standard patterns for defining Mongoose schemas and models with Multi-tenancy support.
---
# Backend Models

This skill covers the standard patterns for defining Mongoose schemas, types, and model registrations in both tenant and hub databases.

## Regras de Estrutura de Models e Subdocumentos (Importante)

Para facilitar a legibilidade, organização e manutenção do código, adotamos a seguinte convenção para subdocumentos e schemas complexos:

1. **Separação de Subdocumentos:** Nunca declare subschemas extensos diretamente no arquivo do modelo principal. Crie arquivos dedicados para os subschemas dentro de `src/models/` (ex: `src/models/Question.ts`).
2. **Importação nos Modelos Principais:** Importe esses subschemas específicos no modelo principal onde o array ou objeto será embutido (ex: importar `questionSchema` no modelo `Product.ts` e usá-lo como `questions: [questionSchema]`).
3. **Padrão de Nome de Arquivo:** O arquivo do subdocumento deve usar PascalCase ou camelCase coerente com o subschema e ser colocado na pasta `src/models/`.

## References
- [Model Reference Guide](file:///c:/workspace/BravosBravoV2/BravoBravoback/.agents/skills/backend-models/references/MODEL.md)
