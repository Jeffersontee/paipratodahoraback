# Aggregate Root (DDD) — Guia de Referência

## Definição

**Aggregate Root** é a entidade principal que atua como "porta de entrada" para um grupo de objetos relacionados. Toda modificação nos objetos filhos deve passar pelo Aggregate Root, que garante as invariantes de negócio.

---

## Conceito Visual

```
┌──────────────────────────────────────┐
│ Aggregate Root: ServiceRequest       │
│                                      │
│  ├── ChecklistResponse[]             │  ← Subdocumentos
│  │   ├── item_name                   │
│  │   ├── status (✅/❌/🕙)           │
│  │   └── observation                 │
│  │                                   │
│  ├── Photos[]                        │  ← Subdocumentos
│  │   ├── url                         │
│  │   └── caption                     │
│  │                                   │
│  └── StatusHistory[]                 │  ← Subdocumentos
│      ├── from_status                 │
│      ├── to_status                   │
│      └── changed_at                  │
│                                      │
│  Invariantes:                        │
│  - Não pode adicionar checklist se   │
│    status != 'in_progress'           │
│  - Não pode mudar para 'completed'   │
│    se checklist tem itens pendentes   │
└──────────────────────────────────────┘
```

---

## Implementação em Mongoose

### 1. Aggregate Root com Subdocumentos

```typescript
// O ServiceRequest é o Aggregate Root
// ChecklistResponse, Photos e StatusHistory são subdocumentos

const ChecklistResponseSchema = new Schema({
  template_item_id: { type: Schema.Types.ObjectId, ref: 'checklist_templates' },
  item_name: { type: String, required: true },
  status: { type: String, enum: ['completed', 'waiting', 'in_progress', 'not_executed', 'not_applicable'] },
  observation: String,
  photo_url: String,
});

const ServiceRequestSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'users', required: true },
  company_id: { type: Schema.Types.ObjectId, ref: 'companies', required: true },
  technician_id: { type: Schema.Types.ObjectId, ref: 'users' },
  category_id: { type: Schema.Types.ObjectId, ref: 'service_categories', required: true },
  
  status: { type: String, enum: ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
  description: String,
  
  // Subdocumentos — gerenciados pelo Aggregate Root
  checklist_responses: [ChecklistResponseSchema],
  photos: [{ url: String, caption: String, uploaded_at: Date }],
  status_history: [{ from: String, to: String, changed_by: Schema.Types.ObjectId, changed_at: Date }],
}, { timestamps: true });
```

### 2. Métodos do Aggregate Root (Invariantes)

```typescript
// Métodos de instância que garantem invariantes
ServiceRequestSchema.methods.assignTechnician = function(technicianId: string) {
  if (this.status !== 'pending') {
    throw new Error('Só é possível designar técnico para solicitações pendentes');
  }
  this.technician_id = technicianId;
  this.status = 'assigned';
  this.status_history.push({ from: 'pending', to: 'assigned', changed_at: new Date() });
};

ServiceRequestSchema.methods.startExecution = function() {
  if (this.status !== 'assigned') {
    throw new Error('Só é possível iniciar execução de solicitações designadas');
  }
  this.status = 'in_progress';
  this.status_history.push({ from: 'assigned', to: 'in_progress', changed_at: new Date() });
};

ServiceRequestSchema.methods.complete = function() {
  if (this.status !== 'in_progress') {
    throw new Error('Só é possível completar solicitações em andamento');
  }
  
  // Invariante: todos os itens do checklist devem estar resolvidos
  const pending = this.checklist_responses.filter(
    (r: any) => !['completed', 'not_applicable'].includes(r.status)
  );
  if (pending.length > 0) {
    throw new Error(`${pending.length} itens do checklist ainda pendentes`);
  }
  
  this.status = 'completed';
  this.status_history.push({ from: 'in_progress', to: 'completed', changed_at: new Date() });
};
```

---

## Regras de Ouro

### 1. Referência Externa vs Subdocumento

| Critério | Subdocumento (embed) | Referência (ref) |
|----------|---------------------|-----------------|
| Pertence exclusivamente ao pai | ✅ Embed | |
| Compartilhado entre entidades | | ✅ Ref |
| Acessado sempre junto com o pai | ✅ Embed | |
| Cresce indefinidamente | | ✅ Ref (coleção separada) |
| Tem ciclo de vida próprio | | ✅ Ref |

### 2. Nunca modificar subdocumentos "por fora"

```typescript
// ❌ ERRADO — Modificar subdocumento sem passar pelo Aggregate Root
await ServiceRequest.updateOne(
  { _id: requestId, 'checklist_responses._id': itemId },
  { $set: { 'checklist_responses.$.status': 'completed' } }
);

// ✅ CORRETO — Carregar o Aggregate Root, validar, salvar
const request = await ServiceRequest.findById(requestId);
const item = request.checklist_responses.id(itemId);
item.status = 'completed';
item.observation = 'Verificado sem problemas';
await request.save(); // Mongoose valida invariantes
```

---

## Checklist

- [ ] Cada entidade principal (Order, ServiceRequest, etc.) é um Aggregate Root
- [ ] Subdocumentos (checklist, items, history) pertencem ao Root
- [ ] Métodos de instância no schema garantem invariantes de negócio
- [ ] Modificações em subdocumentos passam pelo Root (load → modify → save)
- [ ] Referências externas (`ObjectId + ref`) são para entidades independentes
- [ ] Documento MongoDB não excede 16MB (cuidado com arrays enormes)
