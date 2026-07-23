import * as fs from 'fs';
import * as path from 'path';

// O Antigravity IDE armazena logs em: C:\Users\<Username>\.gemini\antigravity-ide
const userHome = process.env.USERPROFILE || process.env.HOME || '';
const appDataDir = path.join(userHome, '.gemini', 'antigravity-ide');

const conversationId = 'd9859055-032f-4c49-93fa-2585c9633e23'; // ID desta conversa
const logsDir = path.join(appDataDir, 'brain', conversationId, '.system_generated', 'logs');
const transcriptPath = path.join(logsDir, 'transcript.jsonl');


interface StepLog {
  step_index?: number;
  source?: string;
  type?: string;
  tool_calls?: Array<{
    name: string;
    arguments?: any;
  }>;
}

function runAudit() {
  console.log("=====================================================================");
  console.log("📊 AUDITORIA DE PROMPTOPS E EFICIÊNCIA DE SKILLS (ADEGA PINGUINS)");
  console.log("=====================================================================\n");

  if (!fs.existsSync(transcriptPath)) {
    console.error(`⚠️ Arquivo de transcript não encontrado no caminho:\n${transcriptPath}\n`);
    console.log("Nota: Certifique-se de que a IDE salvou o histórico recente da conversa ativa.");
    process.exit(1);
  }

  const fileContent = fs.readFileSync(transcriptPath, 'utf-8');
  const lines = fileContent.split('\n').filter(l => l.trim() !== '');

  const skillsUsed = new Set<string>();
  let toolCallsCount = 0;
  let fileReads = 0;
  let commandsRun = 0;
  let stepsCount = lines.length;

  lines.forEach(line => {
    try {
      // 1. Pesquisa genérica na linha por caminhos de skill (muito robusto a escapes e formatos de propriedades do JSON)
      const lowercaseLine = line.toLowerCase();
      const skillMatch = lowercaseLine.match(/[\/|\\]\.agents[\/|\\]skills[\/|\\]([a-zA-Z0-9\-_]+)/g);
      if (skillMatch) {
        skillMatch.forEach(match => {
          const parts = match.replace(/\\/g, '/').split('/');
          const name = parts[parts.length - 1];
          if (name && name !== 'skills') {
            skillsUsed.add(name);
          }
        });
      }

      const step: StepLog = JSON.parse(line);
      if (step.tool_calls) {
        step.tool_calls.forEach(tc => {
          toolCallsCount++;
          
          if (tc.name === 'view_file' || tc.name === 'replace_file_content' || tc.name === 'write_to_file') {
            fileReads++;
          }

          if (tc.name === 'run_command') {
            commandsRun++;
          }
        });
      }
    } catch (e) {
      // Ignora erro de parse em linhas malformadas
    }
  });

  // Métricas estimadas de eficiência
  const baseMinutesPerStep = 3; // Estimativa de tempo para codificar manualmente
  const savedMinutes = (stepsCount * baseMinutesPerStep) + (skillsUsed.size * 10);

  console.log(`💬 Passos Analisados no Chat: ${stepsCount}`);
  console.log(`🔧 Chamadas de Ferramentas Realizadas: ${toolCallsCount}`);
  console.log(`📄 Leitura de Arquivos de Configuração: ${fileReads}`);
  console.log(`💻 Comandos Propostos/Executados: ${commandsRun}`);
  console.log("\n---------------------------------------------------------------------");
  console.log("🧠 Agent Skills Ativadas no Processo:");
  if (skillsUsed.size > 0) {
    skillsUsed.forEach(skill => {
      console.log(`  ✅ [${skill}]`);
    });
  } else {
    console.log("  ℹ️ Nenhuma skill de contexto ativada explicitamente neste trecho.");
  }
  console.log("---------------------------------------------------------------------");

  console.log(`\n🚀 AGILIDADE ESTIMADA:`);
  console.log(`⏱️ Tempo economizado nesta sessão: ~${savedMinutes} minutos.`);
  console.log(`💡 Nota: O uso de regras de contexto economizou cerca de ${skillsUsed.size * 10} min de alinhamento manual de arquitetura.`);
  console.log("=====================================================================\n");
}

runAudit();
