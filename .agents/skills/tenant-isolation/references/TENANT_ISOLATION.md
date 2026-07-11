# Tenant Isolation — Guia de Referência

## Definição

**Tenant Isolation** é o conjunto de técnicas que garante que os dados de um cliente/organização sejam completamente isolados e inacessíveis por outros. Existem três estratégias principais:

---

## Estratégias de Isolação

### 1. Database-per-Tenant (Bravo Instalações)

Cada tenant possui seu próprio banco de dados MongoDB.

```
hubdb (central)           ← Usuários, planos, configurações
Bravo-luffy (tenant A)    ← Itens, categorias, pedidos da Bravo Luffy
Bravo-zoro (tenant B)     ← Itens, categorias, pedidos da Bravo Zoro
```

**Vantagens:**
- Isolação total — impossível vazar dados
- Backup/restore independente por tenant
- Performance isolada

**Desvantagens:**
- Overhead de conexões (MongoDB Atlas limita)
- Analytics cruzadas requerem agregação de N bancos
- Mais complexo para manter schemas sincronizados

### 2. Collection-per-Tenant

Cada tenant tem suas próprias collections dentro do mesmo banco.

```
appdb
├── orders_tenant_a
├── orders_tenant_b
├── items_tenant_a
├── items_tenant_b
```

**Vantagens:**
- Menor overhead de conexão
- Backup único

**Desvantagens:**
- Poluição de collections
- Sem isolação real de performance

### 3. Row-Level Isolation (RBAC) — Recomendado para Bravo

Todos os dados vivem no mesmo banco/collections, filtrados por `company_id` ou `user_id`.

```
appdb
├── users          ← Todos os usuários (filtro por type + company_id)
├── companies      ← Todas as empresas
├── service_requests ← Todas as solicitações (filtro por company_id)
```

**Vantagens:**
- Simples de implementar e manter
- Analytics triviais (tudo no mesmo banco)
- Menor custo de infraestrutura

**Desvantagens:**
- Risco de query sem filtro de tenant (data leak)
- Deve-se garantir filtros em **todas** as queries

---

## Implementação — Database-per-Tenant (Mongoose)

### TenantManager

```typescript
class TenantManager {
  private static connections: Record<string, Connection> = {};
  
  static async getTenantDb(tenantName: string): Promise<Connection> {
    if (this.connections[tenantName]) {
      return this.connections[tenantName];
    }
    
    const dbUri = `${process.env.MONGO_BASE_URI}/${slugify(tenantName)}`;
    const conn = await mongoose.createConnection(dbUri).asPromise();
    this.connections[tenantName] = conn;
    return conn;
  }
}
```

### Middleware de Resolução

```typescript
static async resolveTenant(req: Request, res: Response, next: NextFunction) {
  const tenantId = req.headers['x-establishment-id'] 
    || req.params.establishmentId 
    || req.user?.establishment_id;
  
  if (!tenantId) {
    return res.status(400).json({ message: 'Tenant não identificado' });
  }
  
  const establishment = await Establishment.findById(tenantId);
  if (!establishment) {
    return res.status(404).json({ message: 'Estabelecimento não encontrado' });
  }
  
  req.db = await TenantManager.getTenantDb(establishment.db_name);
  next();
}
```

---

## Implementação — Row-Level (RBAC)

### Middleware de Escopo

```typescript
static async scopeToCompany(req: Request, res: Response, next: NextFunction) {
  if (req.user.type === 'admin') {
    req.companyFilter = { company_id: req.user.company_id };
  } else if (req.user.type === 'technician') {
    req.companyFilter = { technician_id: req.user._id };
  } else {
    req.companyFilter = { user_id: req.user._id };
  }
  next();
}

// No controller — SEMPRE aplicar o filtro
static async getServiceRequests(req: Request, res: Response) {
  const requests = await ServiceRequest.find({
    ...req.companyFilter,  // Nunca esquecer este filtro!
    ...req.query.filters,
  });
  return res.json({ success: true, data: requests });
}
```

---

## Quando usar cada estratégia?

| Critério | Database-per-Tenant | Row-Level (RBAC) |
|----------|-------------------|-------------------|
| Dados totalmente isolados por empresa | ✅ | ⚠️ Depende de filtros |
| Catálogo compartilhado globalmente | ❌ Duplicação | ✅ Trivial |
| Usuários transitam entre empresas | ❌ Complexo | ✅ Natural |
| Compliance rigoroso (LGPD/GDPR) | ✅ Perfeito | ⚠️ Exige auditoria |
| Custo de infraestrutura | 💰 Alto | 💰 Baixo |
| Complexidade de manutenção | 🔴 Alta | 🟢 Baixa |

---

## Checklist de Segurança

- [ ] **Toda** query de leitura inclui filtro de tenant/company
- [ ] **Todo** endpoint de escrita valida ownership antes de modificar
- [ ] Guards/Middlewares de escopo são aplicados **no Router**, não no Controller
- [ ] Testes automatizados verificam que Tenant A não acessa dados do Tenant B
- [ ] Logs de auditoria registram qual tenant/user executou cada ação
- [ ] Índices compostos incluem `company_id` para performance
