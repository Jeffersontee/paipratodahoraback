# CQRS Principle — Guia de Referência

## Definição

**CQRS (Command Query Responsibility Segregation)** é o princípio de separar operações de **leitura** (Queries) de operações de **escrita** (Commands). Cada lado pode ter modelos, validações e otimizações diferentes.

---

## Aplicação Prática no Ecossistema

### O Conceito Base

```
Escrita (Command)                    Leitura (Query)
┌─────────────────────┐              ┌──────────────────────┐
│ POST /orders        │              │ GET /orders          │
│ PATCH /orders/:id   │              │ GET /orders/:id      │
│ DELETE /orders/:id  │              │ GET /reports/sales   │
│                     │              │ GET /dashboard/kpis  │
│ Validação rigorosa  │              │ Sem validação pesada │
│ Eventos/Side-effects│              │ Projections otimiz.  │
│ Consistência forte  │              │ Pode usar cache      │
└─────────────────────┘              └──────────────────────┘
```

### No Backend (Node/Express)

#### Separação de Controllers

```typescript
// ❌ ERRADO — Controller "faz tudo"
class OrderController {
  static async getAll() { /* query complexa */ }
  static async getById() { /* query com populate */ }
  static async getReport() { /* agregação pesada */ }
  static async create() { /* validação + criação + estoque + notificação */ }
  static async updateStatus() { /* validação + transição + webhook */ }
}

// ✅ CORRETO — Separação por responsabilidade
class OrderCommandController {
  static async create() { /* Validação rigorosa + criação + side-effects */ }
  static async updateStatus() { /* Máquina de estados + eventos */ }
  static async cancel() { /* Rollback de estoque + notificação */ }
}

class OrderQueryController {
  static async getAll() { /* Projeção otimizada, pode usar cache */ }
  static async getById() { /* Populate seletivo */ }
}

class OrderReportController {
  static async getSalesReport() { /* Agregação pesada, leitura pura */ }
  static async getKPIs() { /* Dados agregados, pode ser eventual consistency */ }
}
```

#### Routers Separados

```typescript
// Command router — Validações pesadas, middlewares de autenticação
this.router.post('/', Auth, Validator.create(), handleErrors, CommandController.create);
this.router.patch('/:id/status', Auth, AdminRole, CommandController.updateStatus);

// Query router — Leve, pode ter cache
this.router.get('/', Auth, QueryController.getAll);
this.router.get('/:id', Auth, QueryController.getById);

// Report router — Leitura analítica, geralmente admin-only
this.router.get('/reports/sales', Auth, AdminRole, ReportController.getSales);
```

### No Frontend (Angular)

#### Separação de Serviços

```typescript
// Serviço de Comandos — muta estado
@Injectable({ providedIn: 'root' })
export class OrderCommandService {
  private http = inject(HttpClient);
  
  create(data: CreateOrderDto) {
    return this.http.post(Strings.API_ORDERS, data);
  }
  
  updateStatus(id: string, status: string) {
    return this.http.patch(`${Strings.API_ORDERS}/${id}/status`, { status });
  }
}

// Serviço de Queries — leitura pura
@Injectable({ providedIn: 'root' })
export class OrderQueryService {
  private http = inject(HttpClient);
  
  getAll(filters?: OrderFilters) {
    return this.http.get(Strings.API_ORDERS, { params: filters as any });
  }
  
  getById(id: string) {
    return this.http.get(`${Strings.API_ORDERS}/${id}`);
  }
}
```

---

## Quando CQRS é Overkill?

| Cenário | Usar CQRS? |
|---------|-----------|
| CRUD simples (< 5 entidades) | ❌ Overkill |
| Dashboard com relatórios pesados | ✅ Separar queries analíticas |
| Sistema com webhooks/eventos | ✅ Commands disparam side-effects |
| API pública com alto tráfego de leitura | ✅ Cache seletivo nas queries |
| MVP inicial | ❌ KISS primeiro, CQRS depois |

---

## Checklist

- [ ] Controllers de escrita (Command) e leitura (Query) estão separados
- [ ] Relatórios/Analytics vivem em controllers dedicados (Report)
- [ ] Queries pesadas podem ser cacheadas sem afetar consistência de escrita
- [ ] Side-effects (notificação, estoque, auditoria) ocorrem apenas em Commands
- [ ] Frontend separa serviços de mutação e consulta quando o módulo cresce
