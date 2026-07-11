# Domain Events (DDD) — Guia de Referência

## Definição

**Domain Events** são notificações que representam algo significativo que **aconteceu** no domínio de negócio. Permitem comunicação desacoplada entre módulos e são a base para auditoria, side-effects e extensibilidade.

---

## Exemplos de Eventos no Ecossistema

| Evento | Contexto de Origem | Interessados |
|--------|-------------------|-------------|
| `OrderCreated` | Pedidos | Estoque (decrementar), Notificação (push), Analytics |
| `PaymentApproved` | Pagamento | Pedidos (atualizar status), Notificação (push) |
| `ServiceRequestAssigned` | Solicitações | Técnico (notificar), Admin (dashboard) |
| `StockBelowMinimum` | Estoque | Admin (alerta), Compras (reposição) |
| `UserRegistered` | Autenticação | Marketing (welcome email), Analytics |

---

## Implementação — Event Emitter Simples (Node.js)

### 1. Definir o Event Bus

```typescript
// src/utils/EventBus.ts
import { EventEmitter } from 'events';

class DomainEventBus extends EventEmitter {
  emitDomainEvent(eventName: string, payload: any) {
    console.log(`[DomainEvent] ${eventName}`, JSON.stringify(payload).substring(0, 100));
    this.emit(eventName, payload);
  }
}

export const eventBus = new DomainEventBus();
```

### 2. Emitir Eventos no Controller/Service

```typescript
// No OrderController — após criar o pedido
import { eventBus } from '../utils/EventBus';

static async create(req: Request, res: Response) {
  const order = await OrderModel.create(req.body);
  
  // Emitir evento — desacoplado dos side-effects
  eventBus.emitDomainEvent('OrderCreated', {
    order_id: order._id,
    user_id: order.user_id,
    items: order.items,
    total: order.total,
  });
  
  return res.status(201).json({ success: true, data: order });
}
```

### 3. Registrar Listeners (Subscribers)

```typescript
// src/events/OrderEventListeners.ts
import { eventBus } from '../utils/EventBus';

// Listener de Estoque
eventBus.on('OrderCreated', async (payload) => {
  try {
    await StockService.decrementForOrder(payload.order_id, payload.items);
    console.log(`[Stock] Estoque decrementado para pedido ${payload.order_id}`);
  } catch (error) {
    console.error(`[Stock] Falha ao decrementar estoque:`, error);
    // Aqui poderia emitir outro evento: 'StockDecrementFailed'
  }
});

// Listener de Notificação
eventBus.on('OrderCreated', async (payload) => {
  await NotificationService.sendPush(payload.user_id, {
    title: 'Pedido Confirmado!',
    body: `Seu pedido #${payload.order_id} foi recebido.`,
  });
});

// Listener de Auditoria
eventBus.on('OrderCreated', async (payload) => {
  await AuditService.log({
    action: 'order_created',
    entity_id: payload.order_id,
    user_id: payload.user_id,
    severity: 'info',
  });
});
```

### 4. Registrar Listeners no Bootstrap

```typescript
// src/server.ts
import './events/OrderEventListeners';
import './events/PaymentEventListeners';
import './events/StockEventListeners';

// Os listeners são registrados automaticamente via import
```

---

## Padrão para o Bravo Instalações

```typescript
// Eventos específicos do Bravo
eventBus.on('ServiceRequestCreated', async (payload) => {
  // Notificar admin da empresa
  await NotificationService.notifyAdmin(payload.company_id, {
    title: 'Nova Solicitação',
    body: `${payload.category_name} — ${payload.description}`,
  });
});

eventBus.on('ServiceRequestAssigned', async (payload) => {
  // Notificar técnico designado
  await NotificationService.notifyTechnician(payload.technician_id, {
    title: 'Novo Serviço Designado',
    body: `Você foi designado para: ${payload.category_name}`,
  });
});

eventBus.on('ServiceRequestCompleted', async (payload) => {
  // Notificar cliente que solicitou
  await NotificationService.notifyUser(payload.user_id, {
    title: 'Serviço Concluído!',
    body: 'O técnico finalizou o serviço. Avalie a experiência.',
  });
  
  // Gerar relatório automático
  await ReportService.generateVisitReport(payload.request_id);
});
```

---

## Quando NÃO usar Domain Events?

| Cenário | Usar Eventos? | Alternativa |
|---------|-------------|-------------|
| CRUD simples sem side-effects | ❌ | Chamada direta |
| Operação síncrona que PRECISA do resultado | ❌ | Chamada de serviço |
| Side-effects que podem falhar silenciosamente | ✅ | Evento + retry |
| Auditoria/Logging | ✅ | Sempre via evento |
| Notificações push | ✅ | Desacoplar do controller |

---

## Checklist

- [ ] Side-effects (notificação, estoque, auditoria) são disparados via eventos
- [ ] Controllers emitem eventos e retornam imediatamente (não esperam side-effects)
- [ ] Listeners são registrados em arquivos separados (`src/events/`)
- [ ] Falha de um listener **não** bloqueia o controller
- [ ] Eventos têm nomes no passado (`OrderCreated`, não `CreateOrder`)
- [ ] Payload do evento contém **apenas** os dados necessários
- [ ] Event Bus é importado no `server.ts` para registro automático
