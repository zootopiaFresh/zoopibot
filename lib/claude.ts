import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { getUserPreference, buildStylePrompt } from './preferences';
import { getUserContext, buildContextPrompt } from './context';

const execAsync = promisify(exec);

// Claude CLI를 사용하여 프롬프트 실행
async function runClaudeCLI(prompt: string): Promise<string> {
  // 임시 파일에 프롬프트 저장
  const tempFile = join(tmpdir(), `claude-prompt-${Date.now()}.txt`);
  await writeFile(tempFile, prompt, 'utf-8');

  try {
    console.log('[Claude CLI] Executing command...');
    console.log('[Claude CLI] HOME:', process.env.HOME);
    console.log('[Claude CLI] PATH:', process.env.PATH?.split(':').slice(0, 3));

    // 환경변수를 명시적으로 전달 (HOME, PATH 등)
    const command = `cat ${tempFile} | claude --output-format json`;

    const { stdout, stderr } = await execAsync(command, {
      env: {
        ...process.env,
        HOME: process.env.HOME || '',
        PATH: process.env.PATH || '',
      },
      maxBuffer: 1024 * 1024 * 10, // 10MB
      timeout: 120000, // 120초 타임아웃
    });

    if (stderr) {
      console.error('[Claude CLI] stderr:', stderr);
    }

    console.log('[Claude CLI] stdout length:', stdout.length);
    console.log('[Claude CLI] stdout preview:', stdout.substring(0, 300));

    // output-format json이 작동하지 않는 경우를 위한 처리
    if (!stdout.trim()) {
      throw new Error('Claude CLI에서 응답을 받지 못했습니다.');
    }

    // JSON 파싱 시도
    try {
      const result = JSON.parse(stdout);

      // Claude CLI의 응답 형식: { type: "result", result: "실제 응답" }
      if (result.type === 'result' && result.is_error === false) {
        return result.result || '';
      }

      // 에러인 경우
      if (result.is_error === true) {
        throw new Error(result.result || 'Claude CLI 에러');
      }

      // 배열인 경우
      if (Array.isArray(result)) {
        const textBlocks = result.filter((item: any) => item.type === 'text');
        return textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].text : stdout;
      }

      // 기타 형식
      return result.output || result.text || result.result || stdout;
    } catch (parseError) {
      // JSON이 아닌 경우 원본 텍스트 반환
      console.warn('[Claude CLI] JSON parse failed, returning raw output');
      return stdout.trim();
    }
  } catch (error: any) {
    console.error('[Claude CLI] Execution error:', error);

    if (error.code === 'ENOENT') {
      throw new Error('Claude CLI가 설치되지 않았습니다. npm install -g @anthropic-ai/claude-code 를 실행하세요.');
    }
    if (error.killed) {
      throw new Error('Claude CLI 실행 시간이 초과되었습니다. (120초)');
    }

    throw new Error(`Claude CLI 실행 실패: ${error.message}`);
  } finally {
    await unlink(tempFile).catch(() => {});
  }
}

export async function generateDocumentation(
  code: string,
  type: 'explanation' | 'docstring' | 'readme',
  language: string
): Promise<{ result: string; usage: { input: number; output: number } }> {
  const prompts = {
    explanation: `다음 ${language} 코드를 한국어로 상세히 설명해주세요.
코드의 목적, 동작 방식, 입력/출력을 설명해주세요.

\`\`\`${language}
${code}
\`\`\``,
    docstring: `다음 ${language} 코드에 적절한 docstring/주석을 추가해주세요.
원본 코드와 함께 반환해주세요.

\`\`\`${language}
${code}
\`\`\``,
    readme: `다음 코드를 기반으로 README.md 초안을 한국어로 작성해주세요.

\`\`\`${language}
${code}
\`\`\``
  };

  const result = await runClaudeCLI(prompts[type]);

  return {
    result,
    usage: {
      input: 0, // CLI는 usage 정보 제공 안함
      output: 0
    }
  };
}

interface ChatHistory {
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
}

interface SQLResponse {
  sql: string;
  explanation: string;
  needsData?: boolean;
  dataQuery?: string;
  usage: { input: number; output: number };
}

export async function generateSQL(
  prompt: string,
  schema?: string,
  history?: ChatHistory[],
  queryResult?: { query: string; data: any[] },
  userId?: string
): Promise<SQLResponse> {
  // 사용자 선호도 및 컨텍스트 로드
  let stylePrompt = '';
  let contextPrompt = '';
  if (userId) {
    const preference = await getUserPreference(userId);
    stylePrompt = buildStylePrompt(preference);

    const { terms, rules } = await getUserContext(userId);
    contextPrompt = buildContextPrompt(terms, rules);
  }

  // 대화 히스토리 포맷팅
  let conversationContext = '';
  if (history && history.length > 0) {
    conversationContext = '\n\n이전 대화:\n';
    for (const msg of history) {
      if (msg.role === 'user') {
        conversationContext += `사용자: ${msg.content}\n`;
      } else {
        conversationContext += `어시스턴트: ${msg.content}`;
        if (msg.sql) {
          conversationContext += `\nSQL: ${msg.sql}`;
        }
        conversationContext += '\n';
      }
    }
    conversationContext += '\n';
  }

  // 실제 데이터 조회 결과가 있는 경우
  let dataContext = '';
  if (queryResult) {
    const dataPreview = JSON.stringify(queryResult.data.slice(0, 20), null, 2);
    dataContext = `
실행한 쿼리: ${queryResult.query}
조회 결과 (${queryResult.data.length}행${queryResult.data.length > 20 ? ', 20개만 표시' : ''}):
${dataPreview}

위 실제 데이터를 참고하여 사용자의 질문에 정확하게 답변해주세요.
`;
  }

  const fullPrompt = `당신은 SQL 전문가입니다.
사용자의 자연어 요청을 SQL 쿼리로 변환하고, 쿼리에 대한 설명을 한국어로 제공합니다.
이전 대화 맥락이 있다면 참고하여 응답해주세요.

${stylePrompt}${contextPrompt}

**중요**: 질문에 정확히 답변하기 위해 실제 데이터 확인이 필요한 경우:
- 예: "현재 회원이 몇 명이야?", "가장 많이 팔린 상품은?", "특정 값이 있는지 확인" 등
- needsData를 true로 설정하고, dataQuery에 확인용 SQL을 작성하세요.
- 단순 쿼리 작성 요청이면 needsData는 false입니다.

응답은 다음 JSON 형식으로 반환해주세요:
{
  "sql": "SELECT ... (사용자가 원하는 최종 쿼리)",
  "explanation": "이 쿼리는...",
  "needsData": false,
  "dataQuery": ""
}

또는 실제 데이터 확인이 필요한 경우:
{
  "sql": "",
  "explanation": "데이터를 확인하고 있습니다...",
  "needsData": true,
  "dataQuery": "SELECT ... (확인용 쿼리)"
}

${schema ? `DB 스키마:\n${schema}\n\n` : ''}${conversationContext}${dataContext}현재 요청: ${prompt}`;

  const result = await runClaudeCLI(fullPrompt);

  let parsed;
  try {
    const jsonMatch = result.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : result;
    parsed = JSON.parse(jsonText);
  } catch {
    console.warn('[generateSQL] JSON 파싱 실패, 원본:', result.substring(0, 200));
    parsed = { sql: '', explanation: result };
  }

  return {
    sql: parsed.sql || '',
    explanation: parsed.explanation || '',
    needsData: parsed.needsData || false,
    dataQuery: parsed.dataQuery || '',
    usage: { input: 0, output: 0 }
  };
}
