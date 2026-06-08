// Types describing MongoDB explain output and our normalized plan tree.

export type RawStage = {
  stage?: string;
  // aggregation explains nest the query under different keys
  [key: string]: unknown;
  inputStage?: RawStage;
  inputStages?: RawStage[];
};

export type ExplainDocument = {
  queryPlanner?: {
    namespace?: string;
    indexFilterSet?: boolean;
    parsedQuery?: unknown;
    winningPlan?: RawStage & { queryPlan?: RawStage };
    rejectedPlans?: RawStage[];
  };
  executionStats?: {
    executionSuccess?: boolean;
    nReturned?: number;
    executionTimeMillis?: number;
    totalKeysExamined?: number;
    totalDocsExamined?: number;
    executionStages?: RawStage;
  };
  // aggregation pipeline explains
  stages?: unknown[];
  command?: Record<string, unknown>;
  ok?: number;
  [key: string]: unknown;
};

/** A normalized node in the plan tree, merging planner + execution info. */
export type PlanNode = {
  id: string;
  stage: string;
  children: PlanNode[];
  raw: RawStage;

  // execution stats (present when executionStats was requested)
  nReturned?: number;
  executionTimeMillisEstimate?: number;
  works?: number;
  advanced?: number;
  keysExamined?: number;
  docsExamined?: number;

  // index / scan details
  indexName?: string;
  keyPattern?: Record<string, number | string>;
  direction?: string;
  isMultiKey?: boolean;
  filter?: unknown;
  indexBounds?: unknown;

  // sort details
  sortPattern?: Record<string, number>;
  memLimit?: number;
  memUsage?: number;
  usedDisk?: boolean;
};

export type Severity = "danger" | "warning" | "info" | "good";

export type Insight = {
  severity: Severity;
  title: string;
  detail: string;
};

/** One stage of an aggregation pipeline (e.g. $cursor, $lookup, $unwind). */
export type PipelineStage = {
  id: string;
  name: string; // operator name, e.g. "$cursor", "$lookup"
  detail?: string; // short human description of the operator's target
  raw: Record<string, unknown>;

  // execution stats reported per pipeline stage
  nReturned?: number;
  // cumulative time up to and including this stage (as MongoDB reports it)
  executionTimeMillisEstimate?: number;
  // per-stage time, derived from the difference vs. the previous stage
  selfTimeMillis?: number;
  totalDocsExamined?: number;
  totalKeysExamined?: number;
  collectionScans?: number;
  indexesUsed?: string[];

  // $cursor stages carry an underlying query plan tree
  queryPlan?: PlanNode;
};

export type ParsedPlan = {
  kind: "find" | "aggregation";

  // find-style explains expose a single plan tree
  root?: PlanNode;
  // aggregation explains expose a sequence of pipeline stages
  pipeline?: PipelineStage[];

  namespace?: string;
  hasExecutionStats: boolean;
  nReturned?: number;
  executionTimeMillis?: number;
  totalKeysExamined?: number;
  totalDocsExamined?: number;
  insights: Insight[];
};
