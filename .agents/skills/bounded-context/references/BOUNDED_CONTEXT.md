# Bounded Context (DDD) — Guia de Referência

## Definição

**Bounded Context** é o padrão DDD que define limites claros entre módulos de um sistema. Cada contexto tem seu próprio vocabulário, modelos e regras de negócio. Um `User` no contexto de Autenticação pode ter atributos diferentes de um `User` no contexto de Pedidos.

---

## Identificando Contextos no Ecossistema

### Exemplo: Bravo Instalações

```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│   Autenticação      │  │   Catálogo/Menu      │  │   Pedidos           │
│                     │  │                     │  │                     │
│ User (email, pwd)   │  │ Item (nome, preço)  │  │ Order (items, total)│
│ Session (token)     │  │ Category            │  │ OrderItem           │
│ RefreshToken        │  │ Variation           │  │ Payment             │
│                     │  │ ProductType/Size    │  │                     │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘

┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│   Financeiro        │  │   Notificações      │  │   Analytics         │
│                     │  │                     │  │                     │
│ Subscription        │  │ PushNotification    │  │ GlobalOrder (índice)│
│ Invoice             │  │ EmailTemplate       │  │ KPI                 │
│ PaymentConfig       │  │ Alert               │  │ ChurnMetric         │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

### Exemplo: Bravo Instalações

```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│   Identidade        │  │   Catálogo           │  │   Solicitações      │
│                     │  │                     │  │                     │
│ User (nome, tipo)   │  │ ServiceCategory     │  │ ServiceRequest      │
│ Company             │  │ ChecklistTemplate   │  │ ChecklistResponse   │
│ TechnicianProfile   │  │ ServiceArea         │  │ VisitReport         │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

---

## Regras de Separação

### 1. Cada contexto tem seu próprio Controller + Router

```
src/controllers/
├── AuthController.ts         // Contexto: Autenticação
├── CatalogController.ts      // Contexto: Catálogo
├── OrderController.ts        // Contexto: Pedidos
├── ReportController.ts       // Contexto: Analytics
└── PaymentController.ts      // Contexto: Financeiro
```

### 2. Models podem ser compartilhados, mas com projeções diferentes

```typescript
// No contexto de Autenticação — só precisa de credenciais
const user = await User.findById(id).select('email password type');

// No contexto de Pedidos — precisa de dados de entrega
const user = await User.findById(id).select('name phone address');

// No contexto de Analytics — precisa de métricas
const user = await User.findById(id).select('name created_at order_count');
```

### 3. Comunicação entre contextos é via Interface Pública

```typescript
// ❌ ERRADO — Controller de Pedidos acessa Model de Pagamento diretamente
class OrderController {
  static async create(req, res) {
    const payment = await PaymentConfig.findOne({ establishment_id: req.user.est_id });
    // Acoplamento direto ao contexto de Pagamento
  }
}

// ✅ CORRETO — Usa serviço do contexto de Pagamento
class OrderController {
  static async create(req, res) {
    const canProcess = await PaymentService.canProcessPayment(req.user.est_id);
    // Interface pública do contexto de Pagamento
  }
}
```

---

## Anti-Padrão: God Model

```typescript
// ❌ God Model — um schema que tenta representar TUDO
const EstablishmentSchema = new Schema({
  // Identidade
  name: String, owner: ObjectId, cnpj: String,
  // Catálogo
  categories: [CategorySchema], items: [ItemSchema],
  // Financeiro
  subscription: SubscriptionSchema, payment_config: PaymentConfigSchema,
  // Configurações
  theme: ThemeSchema, delivery_config: DeliverySchema,
  // Analytics
  total_orders: Number, monthly_revenue: Number,
});

// ✅ Separado — cada contexto tem seu próprio schema
// Establishment.ts — Identidade
// Subscription.ts — Financeiro
// PaymentConfig.ts — Pagamento
// Theme.ts — Configurações
```

---

## Checklist

- [ ] Cada módulo/contexto tem seus próprios Controllers + Routers
- [ ] Não há imports cruzados diretos entre controllers de contextos diferentes
- [ ] Comunicação entre contextos usa serviços com interface pública
- [ ] Models gigantes (God Models) são divididos em schemas específicos
- [ ] Cada contexto pode evoluir independentemente sem quebrar outros
