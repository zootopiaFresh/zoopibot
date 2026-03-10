import { getUserPreference, buildStylePrompt } from './preferences';
import { getUserContext, buildContextPrompt } from './context';
import { getUnprocessedFeedbacks, buildFeedbackPrompt } from './feedback';
import { getFrequentTables, buildFrequentTablesPrompt } from './learning';
import { logGenerationError } from './error-logger';
import { runAI, runClaudeCLI } from './ai-runtime';
import {
  buildFallbackPresentation,
  extractJsonObject,
  type QueryResultSnapshot,
  type ReportBlock,
  reportPresentationSchema,
  type ReportPresentation,
  toPreferredLabel,
} from './presentation';

export { runAI, runClaudeCLI } from './ai-runtime';

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

  const result = await runAI(prompts[type]);

  return {
    result,
    usage: {
      input: 0,
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
  parseError?: boolean;  // JSON 파싱 실패 플래그
  usage: { input: number; output: number };
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}

export async function generateSQL(
  prompt: string,
  schema?: string,
  history?: ChatHistory[],
  queryResult?: { query: string; data: any[] },
  userId?: string,
  sessionId?: string
): Promise<SQLResponse> {
  // 사용자 선호도 및 컨텍스트 로드
  let stylePrompt = '';
  let contextPrompt = '';
  let feedbackPrompt = '';
  let frequentTablesPrompt = '';

  if (userId) {
    // 병렬로 모든 사용자 컨텍스트 로드 (개별 실패 허용)
    const [preferenceResult, contextResult, feedbacksResult, frequentTablesResult] = await Promise.allSettled([
      getUserPreference(userId),
      getUserContext(userId),
      getUnprocessedFeedbacks(userId, 5),
      getFrequentTables(userId, 10)
    ]);

    // 선호도 로드
    if (preferenceResult.status === 'fulfilled') {
      stylePrompt = buildStylePrompt(preferenceResult.value);
    } else {
      console.warn('[generateSQL] 선호도 로드 실패:', preferenceResult.reason);
      logGenerationError({
        errorType: 'context_load_error',
        errorMessage: `선호도 로드 실패: ${preferenceResult.reason}`,
        userId,
        sessionId,
        prompt,
        metadata: { component: 'preference' }
      });
    }

    // 도메인 용어 & 비즈니스 규칙 로드
    if (contextResult.status === 'fulfilled') {
      contextPrompt = buildContextPrompt(contextResult.value.terms, contextResult.value.rules);
    } else {
      console.warn('[generateSQL] 컨텍스트 로드 실패:', contextResult.reason);
      logGenerationError({
        errorType: 'context_load_error',
        errorMessage: `컨텍스트 로드 실패: ${contextResult.reason}`,
        userId,
        sessionId,
        prompt,
        metadata: { component: 'context' }
      });
    }

    // 최근 피드백 로드 (최대 5개)
    if (feedbacksResult.status === 'fulfilled') {
      feedbackPrompt = buildFeedbackPrompt(feedbacksResult.value);
    } else {
      console.warn('[generateSQL] 피드백 로드 실패:', feedbacksResult.reason);
      logGenerationError({
        errorType: 'context_load_error',
        errorMessage: `피드백 로드 실패: ${feedbacksResult.reason}`,
        userId,
        sessionId,
        prompt,
        metadata: { component: 'feedback' }
      });
    }

    // 자주 사용하는 테이블 로드 (최대 10개)
    if (frequentTablesResult.status === 'fulfilled') {
      frequentTablesPrompt = buildFrequentTablesPrompt(frequentTablesResult.value);
    } else {
      console.warn('[generateSQL] 자주 사용 테이블 로드 실패:', frequentTablesResult.reason);
      logGenerationError({
        errorType: 'context_load_error',
        errorMessage: `자주 사용 테이블 로드 실패: ${frequentTablesResult.reason}`,
        userId,
        sessionId,
        prompt,
        metadata: { component: 'frequentTables' }
      });
    }
  }

  // 대화 히스토리 포맷팅
  let conversationContext = '';
  if (history && history.length > 0) {
    conversationContext = '\n\n이전 대화:\n';
    const recentHistory = history.slice(-4);
    for (const msg of recentHistory) {
      if (msg.role === 'user') {
        conversationContext += `사용자: ${truncateText(msg.content, 400)}\n`;
      } else {
        conversationContext += `어시스턴트: ${truncateText(msg.content, 500)}`;
        if (msg.sql) {
          conversationContext += `\nSQL: ${truncateText(msg.sql, 600)}`;
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

${stylePrompt}${contextPrompt}${feedbackPrompt}${frequentTablesPrompt}

**결과 표현 우선순위**:
- 사용자가 지표, 순위, 비교, 추이, 비율, TOP N, 기간별 변화 등을 물으면 결과를 표/그래프로 바로 보여주기 쉬운 형태로 SQL을 작성하세요.
- 단일 KPI 질문이면 한 행에 핵심 수치가 나오도록 집계하세요.
- 비교 질문이면 "차원 1개 + 수치 1개" 형태가 되도록 작성하세요.
- 추이 질문이면 "날짜/기간 1개 + 수치 1개" 형태가 되도록 작성하세요.
- 컬럼 alias는 value, category, period처럼 의미가 드러나게 작성하세요.

**중요**: 질문에 정확히 답변하기 위해 실제 데이터 확인이 필요한 경우:
- 예: "현재 회원이 몇 명이야?", "가장 많이 팔린 상품은?", "특정 값이 있는지 확인" 등
- needsData를 true로 설정하고, dataQuery에 확인용 SQL을 작성하세요.
- 단순 쿼리 작성 요청이면 needsData는 false입니다.

**스키마 사용 규칙**:
- 아래에 제공되는 스키마는 현재 질문과 관련성이 높은 실제 스키마 일부입니다.
- 질문과 맞는 테이블/컬럼이 보이면 그 정보를 근거로 SQL을 적극적으로 작성하세요.
- 제공된 테이블/컬럼만 사용하고, 없는 테이블이나 컬럼을 새로 지어내지는 마세요.
- 정말로 핵심 테이블이나 핵심 컬럼이 전혀 없을 때만 explanation에 한계를 적으세요. 이미 보이는 스키마가 있으면 다시 스키마를 요청하지 마세요.

**반드시** 아래 JSON 형식으로만 응답하세요. JSON 외의 텍스트는 절대 포함하지 마세요:
{"sql": "SELECT ...", "explanation": "이 쿼리는...", "needsData": false, "dataQuery": ""}

또는 실제 데이터 확인이 필요한 경우:
{"sql": "", "explanation": "데이터를 확인하고 있습니다...", "needsData": true, "dataQuery": "SELECT ..."}

${schema ? `DB 스키마:\n${schema}\n\n` : ''}${conversationContext}${dataContext}현재 요청: ${prompt}`;

  // AI 백엔드 모드에 따라 호출 (OpenClaw 또는 Claude CLI)
  const result = await runAI(fullPrompt, sessionId);

  let parsed;
  let parseError = false;
  try {
    parsed = JSON.parse(extractJsonObject(result));
  } catch (e) {
    const errorMessage = (e as Error).message;
    console.warn('[generateSQL] JSON 파싱 실패:', errorMessage);
    console.warn('[generateSQL] 원본 응답 (200자):', result.substring(0, 200));
    parseError = true;

    // 파싱 실패 로그 저장
    logGenerationError({
      errorType: 'parse_error',
      errorMessage: `JSON 파싱 실패: ${errorMessage}`,
      userId,
      sessionId,
      prompt,
      rawResponse: result,
    });

    // 파싱 실패 시 응답에서 SQL과 설명을 최대한 추출
    const sqlBlockMatch = result.match(/```sql\s*([\s\S]*?)\s*```/);
    if (sqlBlockMatch) {
      // SQL 코드블록 발견 → sql + 나머지를 explanation으로
      const extractedSql = sqlBlockMatch[1].trim();
      const explanation = result.replace(sqlBlockMatch[0], '').trim();
      parsed = { sql: extractedSql, explanation };
      parseError = false;
    } else if (result.length > 20) {
      // SQL 블록 없지만 응답이 충분하면 → 전체를 explanation으로 (데이터 조회 후 직접 답변한 경우)
      parsed = { sql: '', explanation: result };
      parseError = false;
    } else {
      parsed = {
        sql: '',
        explanation: `⚠️ SQL 생성 중 파싱 오류가 발생했습니다.\n\n**원본 응답:**\n${result}`
      };
    }
  }

  return {
    sql: parsed.sql || '',
    explanation: parsed.explanation || '',
    needsData: parsed.needsData || false,
    dataQuery: parsed.dataQuery || '',
    parseError,
    usage: { input: 0, output: 0 }
  };
}

function sanitizePresentation(
  presentation: ReportPresentation,
  snapshot: QueryResultSnapshot,
  explanation: string,
  question: string
): ReportPresentation {
  const allowedFields = new Set(snapshot.fields.map((field) => field.name));
  const normalizeDisplayLabel = (label: string | undefined, field: string) => {
    if (!label || label.trim() === '' || label.trim() === field || !/[가-힣]/.test(label)) {
      return toPreferredLabel(field);
    }

    return label;
  };
  const blocks: ReportBlock[] = [];

  for (const block of presentation.blocks) {
    if (block.type === 'metric-row') {
      const items = block.items.filter((item) => allowedFields.has(item.field));
      if (items.length > 0) {
        blocks.push({
          ...block,
          items: items.map((item) => ({
            ...item,
            label: normalizeDisplayLabel(item.label, item.field),
          })),
        });
      }
      continue;
    }

    if (block.type === 'table') {
      const columns = block.columns.filter((column) => allowedFields.has(column.key));
      blocks.push({
        ...block,
        columns: columns.length > 0
          ? columns.map((column) => ({
              ...column,
              label: normalizeDisplayLabel(column.label, column.key),
            }))
          : snapshot.fields.map((field) => ({ key: field.name, label: toPreferredLabel(field.name) })),
        maxRows: block.maxRows ? Math.min(Math.max(block.maxRows, 1), 100) : 20,
      });
      continue;
    }

    if (block.type === 'vega-lite') {
      const spec = JSON.parse(JSON.stringify(block.spec));
      delete spec.data;
      delete spec.datasets;
      if (spec.encoding?.x?.field) {
        spec.encoding.x.title = normalizeDisplayLabel(spec.encoding.x.title, spec.encoding.x.field);
      }
      if (spec.encoding?.y?.field) {
        spec.encoding.y.title = normalizeDisplayLabel(spec.encoding.y.title, spec.encoding.y.field);
      }
      if (Array.isArray(spec.encoding?.tooltip)) {
        spec.encoding.tooltip = spec.encoding.tooltip.map((tooltip: any) => (
          tooltip?.field
            ? { ...tooltip, title: normalizeDisplayLabel(tooltip.title, tooltip.field) }
            : tooltip
        ));
      }
      blocks.push({ ...block, spec });
      continue;
    }

    blocks.push(block);
  }

  const limitedBlocks = blocks.slice(0, 6);

  if (limitedBlocks.length === 0) {
    return buildFallbackPresentation(question, explanation, snapshot);
  }

  return {
    version: 'v1',
    title: presentation.title,
    blocks: limitedBlocks,
  };
}

export async function generatePresentation(
  question: string,
  sql: string,
  explanation: string,
  snapshot: QueryResultSnapshot,
  sessionId?: string
): Promise<ReportPresentation> {
  if (snapshot.rows.length === 0) {
    return buildFallbackPresentation(question, explanation, snapshot);
  }

  const previewRows = snapshot.rows.slice(0, 20);
  const prompt = `당신은 BI 리포트 편집자입니다.
질문과 SQL 결과를 보고 사람이 이해하기 쉬운 블록형 응답 계획 JSON만 반환하세요.

허용 블록:
- narrative: 짧은 한국어 요약
- callout: 상태/주의 안내
- metric-row: 단일 행 결과의 핵심 수치
- table: 상세 목록 또는 기본 표
- vega-lite: 시계열/카테고리 집계 차트

중요 규칙:
- 상세 레코드 목록, 사용자 목록, 주문 목록, 식별자(ID/이메일/전화번호/이름) 중심 데이터는 차트 금지, table을 우선 사용하세요.
- 기간별 집계는 line 또는 area 계열 spec을 우선 사용하세요.
- 카테고리별 집계는 bar 계열 spec을 우선 사용하세요.
- 사용자가 보는 제목, 설명, KPI label, table columns.label, chart axis title, tooltip title은 가능한 한 자연스러운 한국어로 작성하세요.
- field/key 값은 실제 결과 필드명을 유지하고, 사람이 읽는 label/title만 한글로 바꾸세요.
- metric-row의 items는 실제 필드명을 field에 넣으세요.
- table은 rows를 넣지 말고 columns와 maxRows만 정하세요. 프론트가 실제 rows를 주입합니다.
- vega-lite spec에도 data를 넣지 마세요. 프론트가 data.values를 주입합니다.
- spec의 field 이름은 반드시 실제 결과 필드명만 사용하세요.
- blocks는 1~4개만 사용하세요.
- 확신이 없으면 table을 포함하세요.
- JSON 외 텍스트를 절대 출력하지 마세요.

반환 형식:
{
  "version": "v1",
  "title": "짧은 제목",
  "blocks": [
    { "type": "narrative", "title": "요약", "body": "..." },
    { "type": "metric-row", "title": "핵심 지표", "items": [{ "label": "활성 구독자", "field": "active_users", "format": "number" }] },
    { "type": "vega-lite", "title": "추이", "description": "...", "spec": { "$schema": "https://vega.github.io/schema/vega-lite/v5.json", "width": "container", "height": 320, "mark": { "type": "line", "point": true }, "encoding": { "x": { "field": "period", "type": "temporal", "title": "기간" }, "y": { "field": "value", "type": "quantitative", "title": "값" }, "tooltip": [{ "field": "period", "type": "temporal" }, { "field": "value", "type": "quantitative" }] } } },
    { "type": "table", "title": "상세 목록", "columns": [{ "key": "user_id", "label": "사용자 ID", "format": "text" }], "maxRows": 20 }
  ]
}

사용자 질문:
${question}

SQL:
${sql}

설명:
${explanation}

결과 메타:
- 총 ${snapshot.totalRows}행
- ${snapshot.truncated ? '상위 100행만 저장됨' : '전체 결과 저장됨'}

결과 필드:
${JSON.stringify(snapshot.fields, null, 2)}

결과 미리보기:
${JSON.stringify(previewRows, null, 2)}`;

  try {
    const raw = await runAI(prompt, {
      sessionKey: sessionId ? `${sessionId}:presentation` : undefined,
      timeout: 30000,
    });
    const parsed = reportPresentationSchema.parse(JSON.parse(extractJsonObject(raw)));
    return sanitizePresentation(parsed, snapshot, explanation, question);
  } catch (error) {
    console.warn('[generatePresentation] fallback:', error);
    return buildFallbackPresentation(question, explanation, snapshot);
  }
}
