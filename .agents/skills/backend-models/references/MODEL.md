# Padrão de Criação de Models (Mongoose + ESM)

Sempre crie os models do banco de dados seguindo estritamente as regras abaixo:

## Regras de Estrutura
1. **Imports**: Use `import * as mongoose from 'mongoose';` e desestruture `model` na mesma linha ou abaixo.
2. **Nomes de Referência (`ref`)**: Use sempre o nome da collection em letras minúsculas e no plural (ex: 'establishments', 'users', 'products').
3. **Datas Obrigatórias**: Todos os models devem conter os campos `created_at` e `updated_at` tipados como `Date`, obrigatórios, com default para `Date.now`.
4. **Índices de Performance**: Sempre adicione um bloco final de `.index({...})` para otimizar os filtros mais comuns da feature.

## Exemplo de Referência
```typescript
import * as mongoose from 'mongoose';
import { model } from 'mongoose';

const exemploSchema = new mongoose.Schema({
    establishment_id: { type: mongoose.Types.ObjectId, ref: 'establishments', required: true },
    name: { type: String, required: true },
    status: { type: Boolean, required: true, default: true },
    created_at: { type: Date, required: true, default: Date.now },
    updated_at: { type: Date, required: true, default: Date.now }
});

// Índices compostos para busca rápida
exemploSchema.index({ establishment_id: 1, status: 1 });

export default model('exemplos', exemploSchema);
```
