import * as fs from 'fs';
import * as path from 'path';

const projectRoot = process.cwd();
const skillsDir = path.join(projectRoot, '.agents', 'skills');

if (!fs.existsSync(skillsDir)) {
  console.error("❌ Diretório de skills não encontrado.");
  process.exit(1);
}

const skills = fs.readdirSync(skillsDir);
console.log("🛠️ Iniciando Auto-Correção em Lote das Agent Skills...\n");

skills.forEach(skill => {
  const skillPath = path.join(skillsDir, skill);
  if (!fs.statSync(skillPath).isDirectory()) return;

  console.log(`Corrigindo estrutura de: [${skill}]`);

  // 1. Garante a criação das subpastas obrigatórias
  const requiredFolders = ['agents', 'references', 'scripts'];
  requiredFolders.forEach(folder => {
    const folderPath = path.join(skillPath, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
      console.log(`  + Pasta criada: ${folder}/`);
    }
  });

  // 2. Garante a existência do SKILL.md
  const skillMdPath = path.join(skillPath, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) {
    const defaultContent = `---\nname: ${skill}\description: Diretrizes automáticas para ${skill}.\n---\n\n# ${skill.toUpperCase()}\n`;
    fs.writeFileSync(skillMdPath, defaultContent);
    console.log(`  + Arquivo SKILL.md criado com YAML válido.`);
  } else {
    // 3. Corrige o arquivo SKILL.md se ele não tiver o YAML Frontmatter
    let content = fs.readFileSync(skillMdPath, 'utf-8');
    if (!content.startsWith('---')) {
      const header = `---\nname: ${skill}\ndescription: Diretrizes atualizadas para ${skill}.\n---\n\n`;
      fs.writeFileSync(skillMdPath, header + content);
      console.log(`  + Injetado cabeçalho YAML Frontmatter no SKILL.md existente.`);
    }
  }

  // 4. Garante que exista pelo menos um arquivo de configuração de agente na pasta /agents
  const agentsDir = path.join(skillPath, 'agents');
  const agentFiles = fs.readdirSync(agentsDir).filter(f => f.endsWith('.toml'));
  if (agentFiles.length === 0) {
    const tomlName = `impeccable_${skill.replace(/-/g, '_')}.toml`;
    const tomlPath = path.join(agentsDir, tomlName);
    const defaultToml = `[agent]
name = "${skill.replace(/-/g, '_')}_agent"
version = "1.0.0"
description = "Agente especializado para atuar sobre as diretrizes da skill ${skill}."
provider = "gemini"

[execution]
mode = "validation_loop"
trigger_on = ["git_commit", "manual_invocation"]

[context]
base_skill = "../SKILL.md"
reference_dir = "../references/"

[scope]
include_extensions = [".ts", ".html", ".scss", ".json"]
exclude_paths = [
    "node_modules/**",
    "www/**",
    ".angular/**"
]

[rules]
check_compliance = true

[output]
format = "markdown"
destination = "stdout"
generate_diff = true
`;
    fs.writeFileSync(tomlPath, defaultToml);
    console.log(`  + Agente padrão criado: agents/${tomlName}`);
  }
});

console.log("\n🎉 Estrutura de todas as skills corrigida com sucesso!");
