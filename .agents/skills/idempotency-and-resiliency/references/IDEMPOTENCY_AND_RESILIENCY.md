# Idempotency & Resiliency — Guia de Referência

## Definição

**Idempotência**: Uma operação é idempotente quando executá-la múltiplas vezes produz o mesmo resultado que executá-la uma única vez. Essencial para retry patterns e webhooks.

**Resiliência**: A capacidade de um sistema de lidar com falhas transitórias (timeout, indisponibilidade de serviço) sem perder dados ou consistência.

---

## Padrões de Idempotência

### 1. Idempotency Key (Webhooks e Pagamentos)

```typescript
// Middleware de idempotência para webhooks
static async handleWebhook(req: Request, res: Response) {
  const idempotencyKey = req.headers['x-idempotency-key'] || req.body.id;
  
  // Verifica se já processou esta operação
  const existing = await WebhookLog.findOne({ idempotency_key: idempotencyKey });
  if (existing) {
    console.log(`[Webhook] Duplicado ignorado: ${idempotencyKey}`);
    return res.status(200).json({ success: true, message: 'Already processed' });
  }
  
  // Processa e registra
  await WebhookLog.create({
    idempotency_key: idempotencyKey,
    payload: req.body,
    processed_at: new Date(),
  });
  
  // Lógica de negócio aqui...
  return res.status(200).json({ success: true });
}
```

### 2. Upsert em vez de Insert + Check

```typescript
// ❌ ERRADO — Race condition entre find e create
const existing = await Model.findOne({ external_id: data.id });
if (!existing) {
  await Model.create(data); // Pode duplicar se duas requisições chegam simultaneamente
}

// ✅ CORRETO — Upsert atômico
await Model.findOneAndUpdate(
  { external_id: data.id },     // Critério de busca
  { $set: data },                // Dados a atualizar
  { upsert: true, new: true }   // Cria se não existir
);
```

### 3. Status Machine com Transições Válidas

```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  'pending':     ['assigned', 'cancelled'],
  'assigned':    ['in_progress', 'cancelled'],
  'in_progress': ['completed', 'cancelled'],
  'completed':   [],  // Estado final
  'cancelled':   [],  // Estado final
};

static async updateStatus(orderId: string, newStatus: string) {
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Pedido não encontrado');
  
  const allowed = VALID_TRANSITIONS[order.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Transição inválida: ${order.status} → ${newStatus}`);
  }
  
  order.status = newStatus;
  return order.save();
}
```

---

## Padrões de Resiliência

### 1. Retry com Backoff Exponencial

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt === maxRetries) throw error;
      
      // Só retry em erros transitórios (5xx, timeout)
      if (error.status && error.status < 500) throw error;
      
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.warn(`[Retry] Tentativa ${attempt + 1}/${maxRetries} em ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Retry exhausted');
}

// Uso
const payment = await retryWithBackoff(() => 
  mercadoPagoApi.createPayment(paymentData)
);
```

### 2. Circuit Breaker (Simplificado)

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private readonly threshold = 5;
  private readonly resetTimeout = 60000; // 1 minuto

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Circuito aberto — falha rápido
    if (this.failures >= this.threshold) {
      if (Date.now() - this.lastFailure < this.resetTimeout) {
        throw new Error('Circuit breaker OPEN — serviço temporariamente indisponível');
      }
      this.failures = 0; // Reset após timeout
    }

    try {
      const result = await fn();
      this.failures = 0; // Sucesso reseta o contador
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailure = Date.now();
      throw error;
    }
  }
}
```

### 3. Sync-on-Check (Verificação Proativa)

```typescript
// Se o webhook não chegou, consulta o gateway proativamente
static async checkOrderStatus(orderId: string) {
  const order = await Order.findById(orderId);
  if (order.status === 'pending' && order.payment_id) {
    const gatewayStatus = await PaymentProvider.getStatus(order.payment_id);
    
    if (gatewayStatus.status === 'approved' && order.status !== 'paid') {
      order.status = 'paid';
      order.paid_at = new Date();
      await order.save();
    }
  }
  return order;
}
```

---

## Checklist

- [ ] Webhooks possuem **idempotency key** e log de processamento
- [ ] Operações de criação usam **upsert** quando possível
- [ ] Status seguem **máquina de estados** com transições válidas
- [ ] Chamadas a APIs externas usam **retry com backoff**
- [ ] Erros transitórios (5xx) são retentados; erros de negócio (4xx) não
- [ ] Pagamentos e operações financeiras são **idempotentes**
- [ ] Há mecanismo de **sync-on-check** para compensar webhooks perdidos
