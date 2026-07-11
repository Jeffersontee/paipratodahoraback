# Skill: Identificação de Duplicação de Código (Princípio DRY)

## Objetivo
Analisar o código em busca de lógicas, blocos ou funções que se repetem em múltiplos pontos do projeto. Quando detectados, sugerir a refatoração baseada no princípio DRY (Don't Repeat Yourself), centralizando a lógica em uma única função reutilizável.

## Conceito Chave
* **Nome do Princípio:** DRY (Don't Repeat Yourself)
* **Ação de Engenharia:** Refatoração por Extração de Função (Extract Function)
* **Destino Comum:** Criação de arquivos/pastas de `utils`, `helpers` ou `services` compartilhados.

## Diretrizes de Análise
1. **Regra de Três:** Se a mesma lógica (ou estrutura de código muito similar) aparecer 3 ou mais vezes no projeto, ela DEVE ser centralizada.
2. **Parametrização:** Identificar partes estáticas e partes dinâmicas do código repetido para transformá-las em argumentos/parâmetros da nova função centralizada.
3. **Localização:** 
   * Se a repetição ocorre dentro do mesmo arquivo: extrair para uma função privada ou helper local.
   * Se ocorre em múltiplos arquivos/controllers/componentes: sugerir mover para um serviço compartilhado (ex: `UtilsService` ou um arquivo `shared/utils/`).

## Formato da Sugestão para o Usuário
Sempre que detectar a duplicação, responda seguindo esta estrutura:
1. **Alerta de Violação DRY:** Apontar exatamente onde a duplicação ocorre (arquivos e linhas).
2. **O Conceito:** Explicar brevemente que aplicar o DRY facilitará a manutenção futura.
3. **Proposta de Código:** Mostrar como a nova função centralizada deve ficar.
4. **Exemplo de Substituição:** Mostrar como os pontos antigos devem chamar a nova função.

## Exemplo de Comportamento Esperado (Prompt vs Resposta)

### [Contexto de Entrada Ruim]
O usuário envia dois controllers ou componentes diferentes que fazem exatamente a mesma formatação de data ou cálculo de taxa de entrega.

### [Ação da IA baseada nesta Skill]
"Identifiquei que a lógica de [X] está se repetindo nos arquivos `A.ts` e `B.ts`. Para seguir o princípio **DRY (Don't Repeat Yourself)**, recomendo extrair essa lógica para uma função utilitária única. Veja como estruturar..."
