import type { AIRunner } from '@/lib/ai-runtime';
import type { QueryResultSnapshot, ReportPresentation } from '@/lib/presentation';

export type ConversationRole = 'user' | 'assistant' | 'tool';
export type ConversationMessageStatus = 'pending' | 'running' | 'completed' | 'failed';
export type ConversationRunStatus = 'queued' | 'running' | 'completed' | 'failed';
export type ValidationMode = 'none' | 'data-query' | 'final-sql';

export type StepKind =
  | 'prepare_history'
  | 'emit_step'
  | 'resolve_schema'
  | 'model_call'
  | 'execute_query'
  | 'build_result'
  | 'update_message';

export type StepStateFlag =
  | 'hasSql'
  | 'needsData'
  | 'validatedFalse'
  | 'hasValidatedExecution'
  | 'hasPresentation'
  | 'hasResultSnapshot';

export interface ValidationResult {
  validated?: boolean | null;
  mode?: ValidationMode | null;
  error?: string | null;
  attempts?: number | null;
}

export interface PresentationArtifact {
  kind: 'presentation';
  data: ReportPresentation;
}

export interface ResultSnapshotArtifact {
  kind: 'resultSnapshot';
  data: QueryResultSnapshot;
}

export interface ConversationResultEnvelope {
  sql?: string | null;
  presentation?: PresentationArtifact | null;
  resultSnapshot?: ResultSnapshotArtifact | null;
  validation?: ValidationResult | null;
}

export interface ConversationMessage {
  id: string;
  threadId: string;
  runId?: string | null;
  role: ConversationRole;
  content: string;
  status: ConversationMessageStatus;
  result?: ConversationResultEnvelope | null;
  parseError?: boolean;
  error?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface ConversationThread {
  id: string;
  title?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConversationRun {
  id: string;
  threadId: string;
  agentId: string;
  requirementSetId?: string | null;
  status: ConversationRunStatus;
  inputMessageId?: string | null;
  outputMessageId?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  error?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface ConversationRunAck {
  run: ConversationRun;
  inputMessage: ConversationMessage;
  outputMessage: ConversationMessage;
}

export interface ConversationState {
  backend?: string;
  threadKey?: string;
  lastRunId?: string;
  meta?: Record<string, unknown>;
}

export interface WorkflowCheckpoint {
  runId: string;
  threadId: string;
  step: string;
  status: ConversationRunStatus | ConversationMessageStatus;
  attempt?: number;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface WorkflowStepState {
  runId: string;
  step: string;
  label?: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  detail?: string;
  updatedAt: string;
}

export interface ConversationEventMap {
  'run.created': { type: 'run.created'; threadId: string; run: ConversationRun };
  'run.started': { type: 'run.started'; threadId: string; run: ConversationRun };
  'run.completed': { type: 'run.completed'; threadId: string; run: ConversationRun };
  'run.failed': { type: 'run.failed'; threadId: string; run: ConversationRun };
  'step.changed': {
    type: 'step.changed';
    threadId: string;
    runId: string;
    step: WorkflowStepState;
  };
  'message.created': {
    type: 'message.created';
    threadId: string;
    message: ConversationMessage;
  };
  'message.updated': {
    type: 'message.updated';
    threadId: string;
    message: ConversationMessage;
  };
  'message.completed': {
    type: 'message.completed';
    threadId: string;
    message: ConversationMessage;
  };
  'message.failed': {
    type: 'message.failed';
    threadId: string;
    message: ConversationMessage;
  };
  'artifact.ready': {
    type: 'artifact.ready';
    threadId: string;
    runId: string;
    artifact: PresentationArtifact | ResultSnapshotArtifact;
  };
}

export type ConversationEvent =
  ConversationEventMap[keyof ConversationEventMap];

export interface EventSink {
  emit(event: ConversationEvent): Promise<void> | void;
}

export interface PromptRules {
  plannerAppendix?: string[];
  sqlAppendix?: string[];
  presentationAppendix?: string[];
}

export interface Thresholds {
  initialSchemaLimit: number;
  recoverySchemaLimit: number;
  maxSchemaRecoveryAttempts: number;
  maxQueryExecutionRecoveryAttempts: number;
}

export interface ProgressStageConfig {
  id: string;
  label: string;
  detail: string;
}

export interface OutputContract {
  includeSql: boolean;
  includePresentation: boolean;
  includeResultSnapshot: boolean;
  includeValidation: boolean;
}

export interface StepCondition {
  metaEquals?: Record<string, unknown>;
  stateTrue?: StepStateFlag[];
  stateFalse?: StepStateFlag[];
}

export interface StepDefinition {
  id: string;
  kind: StepKind;
  label?: string;
  when?: StepCondition;
  config?: Record<string, unknown>;
}

export interface RequirementSpec {
  id: string;
  steps?: StepDefinition[];
  allowedTools?: string[];
  thresholds?: Partial<Thresholds>;
  outputContract?: Partial<OutputContract>;
  promptRules?: PromptRules;
  progressStages?: ProgressStageConfig[];
}

export interface AgentSpec {
  id: string;
  defaultRequirementSpec: RequirementSpec;
}

export interface ResolvedAgentSpec {
  id: string;
  requirementSetId: string;
  steps: StepDefinition[];
  allowedTools: string[];
  thresholds: Thresholds;
  outputContract: OutputContract;
  promptRules: PromptRules;
  progressStages: ProgressStageConfig[];
}

export interface BeginRunInput {
  threadId: string;
  input: string;
  agentId: string;
  requirementSetId?: string;
  meta?: Record<string, unknown>;
  initialOutputContent: string;
}

export interface StartRunInput {
  input: string;
  agentId: string;
  requirementSetId?: string;
  meta?: Record<string, unknown>;
}

export interface SendInput extends StartRunInput {
  pollIntervalMs?: number;
  timeoutMs?: number;
}

export interface ConversationStore {
  getThread(threadId: string): Promise<ConversationThread | null>;
  ensureThread(threadId: string, meta?: Record<string, unknown>): Promise<ConversationThread>;
  beginRun(input: BeginRunInput): Promise<ConversationRunAck>;
  listMessages(threadId: string): Promise<ConversationMessage[]>;
  updateMessage(
    messageId: string,
    patch: Partial<ConversationMessage>
  ): Promise<ConversationMessage>;
  getRun(runId: string): Promise<ConversationRun | null>;
  updateRun(runId: string, patch: Partial<ConversationRun>): Promise<ConversationRun>;
  saveThreadState(threadId: string, state: ConversationState): Promise<void>;
  loadThreadState(threadId: string): Promise<ConversationState | null>;
  saveCheckpoint(runId: string, checkpoint: WorkflowCheckpoint): Promise<void>;
  loadLatestCheckpoint(runId: string): Promise<WorkflowCheckpoint | null>;
}

export interface TransportRequest {
  prompt: string;
  systemPrompt?: string;
  threadKey?: string;
  timeoutMs?: number;
}

export interface TransportResponse {
  content: string;
}

export interface TransportAdapter {
  call(input: TransportRequest): Promise<TransportResponse>;
  health(): Promise<boolean>;
}

export interface ToolExecutionContext {
  threadId: string;
  runId: string;
  meta?: Record<string, unknown>;
}

export interface ToolDefinition<Input = unknown, Output = unknown> {
  id: string;
  description: string;
  execute(input: Input, context: ToolExecutionContext): Promise<Output>;
}

export interface ResolveSchemaInput {
  question: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string; sql?: string }>;
  sessionId?: string;
  limit?: number;
  excludedTables?: string[];
  retryReason?: string;
  previousSelectedItems?: string[];
  promptRules?: PromptRules;
  aiRunner?: AIRunner;
}

export interface ResolveSchemaResult {
  schema: string;
  source: 'mysql-explorer' | 'schema-prompts';
  selectedItems: string[];
  selectedChars: number;
  fallbackUsed: boolean;
}

export interface QueryExecutionResult {
  rows: any[];
  fields: any[];
}

export interface BuildPresentationInput {
  question: string;
  sql: string;
  explanation: string;
  queryResult: QueryExecutionResult;
  sessionId?: string;
  promptRules?: PromptRules;
  aiRunner?: AIRunner;
}

export interface WorkflowErrorLogInput {
  errorType: string;
  errorMessage: string;
  userId?: string;
  threadId?: string;
  runId?: string;
  messageId?: string;
  prompt?: string;
  rawResponse?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowContext {
  threadId: string;
  runId: string;
  agentId: string;
  requirementSetId?: string;
  userId?: string;
  input: string;
  run: ConversationRun;
  inputMessage: ConversationMessage;
  outputMessage: ConversationMessage;
  history: ConversationMessage[];
  threadState: ConversationState | null;
  spec: ResolvedAgentSpec;
  transport: TransportAdapter;
  store: ConversationStore;
  events: EventSink;
  tools: ToolRegistry;
  capabilities: {
    resolveSchema?: (input: ResolveSchemaInput) => Promise<ResolveSchemaResult>;
    executeQuery?: (sql: string) => Promise<QueryExecutionResult>;
    buildPresentation?: (input: BuildPresentationInput) => Promise<{
      snapshot: QueryResultSnapshot;
      presentation: ReportPresentation;
    }>;
    logError?: (input: WorkflowErrorLogInput) => Promise<void>;
  };
  meta?: Record<string, unknown>;
}

export interface WorkflowResult {
  messagePatch: Partial<ConversationMessage>;
  runPatch: Partial<ConversationRun>;
}

export interface AgentWorkflowState {
  history: Array<{ role: 'user' | 'assistant'; content: string; sql?: string }>;
  recoveryHistory?: Array<{ role: 'user' | 'assistant'; content: string; sql?: string }>;
  schemaResult?: ResolveSchemaResult;
  schemaResults: ResolveSchemaResult[];
  result?: {
    sql: string;
    explanation: string;
    needsData?: boolean;
    dataQuery?: string;
    parseError?: boolean;
    validated?: boolean;
    validationMode?: ValidationMode;
    validationError?: string;
    validationAttempts?: number;
  };
  queryResult?: QueryExecutionResult;
  validatedExecution?: QueryExecutionResult | null;
  presentation?: ReportPresentation | null;
  resultSnapshot?: QueryResultSnapshot | null;
  dataQueryExecuted: boolean;
  executionRecoveryAttempts: number;
  activeStageId?: string;
}

export interface AgentWorkflow {
  name: string;
  run(ctx: WorkflowContext): Promise<WorkflowResult>;
}

export interface AgentRegistry {
  get(agentId: string): AgentSpec | undefined;
}

export interface SpecResolver {
  resolve(agentId: string, requirementSetId?: string): Promise<ResolvedAgentSpec>;
}

export interface ToolRegistry {
  get(id: string): ToolDefinition | undefined;
  list(): ToolDefinition[];
}

export interface ConversationThreadHandle {
  start(input: StartRunInput): Promise<ConversationRunAck>;
  send(input: SendInput): Promise<ConversationRun>;
  history(): Promise<ConversationMessage[]>;
  state(): Promise<ConversationState | null>;
  clear(): Promise<void>;
}

export interface ConversationRuntime {
  ask(input: string, options?: Omit<StartRunInput, 'input'>): Promise<string>;
  thread(id: string): ConversationThreadHandle;
}
