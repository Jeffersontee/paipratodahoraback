# Padrão de Criação de Controllers (Express + TypeScript Class)

Sempre crie as classes de controle seguindo estritamente as regras abaixo:

## Regras de Estrutura
1. **Tipagem Express**: Sempre tipifique os parâmetros como `req: Request, res: Response, next: NextFunction`.
2. **Padrão de Resposta HTTP**: O retorno deve ser padronizado em JSON contendo a estrutura de API Envelope: `{ success: boolean, data?: any, message?: string }`.
3. **Cláusulas de Barreira (Early Returns)**: Valide as entradas o quanto antes no início da função. Se houver alguma inconformidade, retorne imediatamente o erro apropriado (geralmente status `422` ou `400`).
4. **Desestruturação Defensiva do Payload**:
   - Nunca use `req.body` diretamente para instanciar ou atualizar modelos no banco sem higienização.
   - Sempre desestruture apenas os campos permitidos no input de criação (ex: `ICompanyCreateInput`), isolando e descartando propriedades de controle do sistema (como `subscription_status`, `next_payment_date`, `subscription_id`, `role`, etc.).
5. **Instanciação Atômica e `Promise.all`**:
   - Evite salvar entidades de forma sequencial com múltiplos `await`.
   - Aloque IDs previamente usando `new Types.ObjectId()` para relacionar os documentos.
   - Instancie os objetos em memória e salve-os de forma concorrente usando `await Promise.all([doc1.save(), doc2.save()])`. Isso otimiza o I/O de rede com o MongoDB.

## Exemplo de Referência (Criação de Estabelecimento)
```typescript
import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import Company from '../models/company.model';
import Subscription from '../models/Subscription.model';
import { ICompanyCreateInput } from '../interfaces/company.interface';

export class CompanyController {
    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            // 1. Desestruturação Defensiva (Ignorando campos sensíveis como subscription_status)
            const { name, owner_name, short_name, description, cnpj, email, active } = req.body as ICompanyCreateInput;

            // 2. Cláusula de Barreira (Early Return)
            if (!cnpj) {
                return res.status(422).json({ success: false, message: 'O CNPJ é obrigatório.' });
            }

            const existingCompany = await Company.findOne({ cnpj });
            if (existingCompany) {
                return res.status(422).json({ success: false, message: 'A empresa com este CNPJ já existe.' });
            }

            // 3. Geração de IDs antecipada para amarração atômica
            const companyId = new Types.ObjectId();
            const subscriptionId = new Types.ObjectId();

            const trialDays = 14;
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + trialDays);

            // 4. Instanciação na Memória
            const company = new Company({
                _id: companyId,
                name,
                owner_name,
                short_name,
                description,
                cnpj,
                email,
                active: active !== undefined ? active : true,
                subscription_status: 'trial',
                next_payment_date: endDate,
                subscription_id: subscriptionId
            });

            const subscription = new Subscription({
                _id: subscriptionId,
                company_id: companyId,
                status: 'trialing',
                current_period_end: endDate,
                price_at_subscription: 0
            });

            // 5. Persistência Concorrente
            await Promise.all([company.save(), subscription.save()]);

            return res.status(201).json({
                success: true,
                data: company
            });
        } catch (e: any) {
            next(e);
        }
    }
}
```

