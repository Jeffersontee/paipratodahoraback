# Arquitetura de Agentes e Estruturação de Arquivos TOML

Este documento serve como a referência técnica oficial para a criação e manutenção de agentes automatizados via arquivos `.toml` do Impeccable dentro da workspace TaxSmart.

## 1. Filosofia de Design dos Agentes
Os agentes criados devem seguir o princípio da **Responsabilidade Única**. Não crie um único agente para resolver múltiplos problemas complexos. Em vez disso, fragmente a automação em agentes especializados (ex: um agente para checar legados, outro para aplicar correções).

## 2. Estrutura Padrão do Arquivo TOML
Todo arquivo de configuração de agente deve ser salvo na pasta `.agents/skills/<nome-da-skill>/agents/` utilizando a nomenclatura `impeccable_<funcao_do_agente>.toml`.

### Campos Obrigatórios e Schema Base

```toml
[agent]
name = "nome_unico_do_agente_snake_case"
version = "1.0.0"
description = "Explicação clara da função do agente para que o orquestrador saiba quando ativá-lo."
provider = "openai" # Mantém a consistência com o openai.yaml global

[execution]
mode = "validation_loop" # Opções comuns: validation_loop, single_run, transform_code
trigger_on = ["git_commit", "manual_invocation"]

[context]
# ATENÇÃO: As rotas devem ser relativas partindo do diretório /agents/ da própria skill
base_skill = "../SKILL.md"
reference_dir = "../references/"

[scope]
# Defina estritamente o escopo de atuação para economizar tokens de contexto
include_extensions = [".ts", ".html", ".scss"]
exclude_paths = [
    "node_modules/**",
    "www/**",
    ".angular/**",
    "**/*.spec.ts"
]

[rules]
# Chaves booleanas ou parâmetros que guiam o motor interno do script local
check_compliance = true

[output]
format = "markdown"
destination = "stdout"
generate_diff = true
```

## 3. Regras Críticas de Caminhos Relativos (Paths)
Como os arquivos `.toml` residem na subpasta `agents/` de cada módulo de skill, as diretivas do bloco `[context]` devem obrigatoriamente subir um nível (`../`) para alcançar a raiz daquela skill específica:
* **Incorreto:** `base_skill = "./SKILL.md"` (O motor tentará buscar dentro da pasta de agentes e falhará).
* **Correto:** `base_skill = "../SKILL.md"`
* **Correto:** `reference_dir = "../references/"`

## 4. Integração com a Pasta `scripts/`
Quando um agente precisar disparar uma ação física ou comando no terminal da máquina, ele não deve inferir o código CLI diretamente. Ele deve chamar o script mapeado na pasta local de scripts da skill:
* Exemplo: Se o agente de modernização precisar validar arquivos, o campo de execução delegará a tarefa para `../scripts/validate-syntax.sh`.

