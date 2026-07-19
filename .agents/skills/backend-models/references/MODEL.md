# Padrão de Criação de Models (Mongoose + ESM)

Sempre crie os models do banco de dados seguindo estritamente as regras abaixo:

## Regras de Estrutura
1. **Separar Interfaces Limpas (Clean Interfaces)**: 
   - A interface pura do recurso (ex: `ICompany`, `IUser`) deve ficar na pasta de interfaces (ex: `src/interfaces/company.interface.ts`). Esta interface serve para o frontend, payloads de API (DTOs) e objetos JS puros.
   - Ela pode conter o atributo `_id?: string;` para uso no frontend ou em JSONs.

2. **Evitar Conflitos de Tipo com o Mongoose (`_id`)**:
   - A interface do documento Mongoose (ex: `ICompanyDocument` no model) deve estender `Omit<CleanInterface, '_id'>` e `Document` da biblioteca `mongoose`.
   - Isso evita o erro: `Interface 'ICompanyDocument' cannot simultaneously extend types 'ICompany' and 'Document'`.
   - Exemplo: `export interface ICompanyDocument extends Omit<ICompany, '_id'>, Document {}`

3. **Nomes de Referência (`ref`)**: Use sempre o nome da collection em letras minúsculas e no plural (ex: 'establishments', 'users', 'products').
4. **Datas e Timestamps**:
   - Utilize a opção `{ timestamps: true }` no Schema do Mongoose ou declare explicitamente `createdAt` e `updatedAt`.
5. **Índices de Performance**: Sempre adicione um bloco final de `.index({...})` para otimizar os filtros mais comuns da feature.

## Exemplo de Referência (Model com Interface Limpa)

### 1. Interface Limpa (`src/interfaces/company.interface.ts`):
```typescript
export interface ICompany {
    _id?: string;
    name: string;
    cnpj: string;
    active: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
```

### 2. Mongoose Model (`src/models/company.model.ts`):
```typescript
import { Schema, Document, model } from 'mongoose';
import { ICompany } from '../interfaces/company.interface';

// Estende a interface pura omitindo o _id para evitar conflito com Document
export interface ICompanyDocument extends Omit<ICompany, '_id'>, Document {}

const CompanySchema = new Schema<ICompanyDocument>(
    {
        name: { type: String, required: true },
        cnpj: { type: String, required: true, unique: true },
        active: { type: Boolean, default: true }
    },
    {
        timestamps: true
    }
);

// Índice de performance
CompanySchema.index({ cnpj: 1, active: 1 });

export const Company = model<ICompanyDocument>('Company', CompanySchema);
export default Company;
```

