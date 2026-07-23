import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

// Carrega as variáveis do .env se existir
dotenv.config();

const projectRoot = process.cwd();
const envPath = path.join(projectRoot, 'src', 'environments', 'environment.ts');

let geminiKey = process.env.GEMINI_API_KEY;
let openaiKey = process.env.OPENAI_API_KEY;

// Tenta carregar as chaves do environment.ts do frontend se não estiverem no .env do backend
const frontEnvPath = path.join(projectRoot, '..', 'adegapinguinsfront', 'src', 'environments', 'environment.ts');
if (fs.existsSync(frontEnvPath)) {
  try {
    const envContent = fs.readFileSync(frontEnvPath, 'utf-8');
    
    if (!geminiKey) {
      const match = envContent.match(/gemini_api_key:\s*['"`](.*?)['"`]/);
      if (match && match[1]) {
        geminiKey = match[1].trim();
      }
    }
  } catch (e) {
    console.warn("⚠️ Não foi possível ler o arquivo environment.ts do frontend automaticamente.");
  }
}


const skillsDir = path.join(projectRoot, '.agents', 'skills');

interface SkillContent {
  name: string;
  content: string;
}

async function runCrossAudit() {
  console.log("🔍 Carregando bases de conhecimento para auditoria cruzada semântica...\n");

  if (!fs.existsSync(skillsDir)) {
    console.error("❌ Diretório de skills não encontrado.");
    process.exit(1);
  }

  const skillFolders = fs.readdirSync(skillsDir);
  const loadedSkills: SkillContent[] = [];

  skillFolders.forEach(folder => {
    const skillPath = path.join(skillsDir, folder);
    if (!fs.statSync(skillPath).isDirectory()) return;

    const skillMdPath = path.join(skillPath, 'SKILL.md');
    if (fs.existsSync(skillMdPath)) {
      const content = fs.readFileSync(skillMdPath, 'utf-8');
      loadedSkills.push({ name: folder, content });
    }
  });

  if (loadedSkills.length < 2) {
    console.log("⚠️ Poucas skills encontradas para realizar um cruzamento analítico.");
    process.exit(0);
  }

  const formattedPrompt = loadedSkills.map(s => `=== SKILL: ${s.name} ===\n${s.content}\n`).join('\n');
  const systemInstruction = `Você é um Engenheiro de Software Principal e Auditor de PromptOps da arquitetura do projeto.
Sua missão é analisar o compilado de diretivas Markdown fornecidas (Agent Skills) e buscar INCONSISTÊNCIAS, CONFLITOS DE REGRAS, REDUNDÂNCIAS ou brechas que causem alucinação cognitiva na IA do repositório.

Analise friamente e aponte em português:
1. Contradições Diretas: Onde a Skill A dita um padrão e a Skill B exige o oposto (Ex: Uma pede para usar *ngIf e outra exige @if).
2. Redundâncias Críticas: Regras idênticas duplicadas em arquivos diferentes que sobrecarregam os tokens de contexto.
3. Sugestão de Correção: Como unificar ou mesclar para blindar o framework.`;

  // Flag para sinalizar se tentamos rodar o Gemini e ele falhou
  let geminiSuccess = false;

  // 1. Tenta usar o Gemini se a chave parecer válida
  if (geminiKey && geminiKey.trim() !== '') {
    try {
      console.log(`🧠 Enviando ${loadedSkills.length} regras para o Gemini Auditor...`);
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      
      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-2.5-pro',
          config: { systemInstruction, temperature: 0.1 },
          contents: `Aqui estão as regras atuais da minha workspace:\n\n${formattedPrompt}`,
        });
      } catch (e) {
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: "Você é um Engenheiro de Software Principal e Auditor de PromptOps. Busque inconsistências, conflitos ou redundâncias entre as regras.",
            temperature: 0.1
          },
          contents: `Aqui estão as regras atuais da minha workspace:\n\n${formattedPrompt}`,
        });
      }

      console.log("\n================ REPORT DE CONFORMIDADE SEMÂNTICA (GEMINI) ================\n");
      console.log(response.text || "Nenhum conflito semântico aparente encontrado.");
      console.log("\n===========================================================================\n");
      geminiSuccess = true;
    } catch (error: any) {
      console.warn("⚠️ Ocorreu uma falha com o Gemini. Detalhes:", error?.message || error);
      console.log("Tentando fallback para OpenAI...\n");
    }
  }

  // 2. Fallback para OpenAI caso o Gemini falhe ou não tenha chave válida
  if (!geminiSuccess) {
    if (!openaiKey || openaiKey.trim() === '') {
      console.error("❌ ERRO: Nenhuma chave válida encontrada. Configure GEMINI_API_KEY ou OPENAI_API_KEY no arquivo .env.");
      process.exit(1);
    }

    try {
      console.log(`🧠 Enviando ${loadedSkills.length} regras para o OpenAI GPT-4o Auditor...`);
      const openai = new OpenAI({ apiKey: openaiKey });
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.1,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: `Aqui estão as regras atuais da minha workspace:\n\n${formattedPrompt}` }
        ]
      });

      console.log("\n================ REPORT DE CONFORMIDADE SEMÂNTICA (OPENAI) ================\n");
      console.log(completion.choices[0]?.message?.content || "Nenhum conflito semântico aparente encontrado.");
      console.log("\n===========================================================================\n");
    } catch (error) {
      console.error("❌ Falha crítica ao conectar com a API da OpenAI para auditoria:", error);
      process.exit(1);
    }
  }

  process.exit(0);
}

runCrossAudit();