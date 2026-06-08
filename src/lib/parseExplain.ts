import type {
  ExplainDocument,
  Insight,
  ParsedPlan,
  PipelineStage,
  PlanNode,
  RawStage,
} from "../types";

let idCounter = 0;
function nextId() {
  return `node-${idCounter++}`;
}

// SBE (slot-based engine) and classic stage trees nest children under
// different keys. Follow all of them so deep plans render fully.
const CHILD_KEYS = [
  "inputStage",
  "outerStage",
  "innerStage",
  "thenStage",
  "elseStage",
] as const;
const CHILD_ARRAY_KEYS = ["inputStages", "innerStages"] as const;

/** Build a normalized PlanNode tree from a raw explain stage. */
function buildNode(raw: RawStage): PlanNode {
  const node: PlanNode = {
    id: nextId(),
    stage: (raw.stage as string) ?? "UNKNOWN",
    children: [],
    raw,
    nReturned: numOrUndef(raw.nReturned),
    executionTimeMillisEstimate: numOrUndef(raw.executionTimeMillisEstimate),
    works: numOrUndef(raw.works),
    advanced: numOrUndef(raw.advanced),
    keysExamined: numOrUndef(raw.keysExamined ?? raw.totalKeysExamined),
    docsExamined: numOrUndef(raw.docsExamined ?? raw.totalDocsExamined),
    indexName: (raw.indexName ?? raw.indexKeyPattern) as string | undefined,
    keyPattern: (raw.keyPattern ?? raw.indexKeyPattern) as PlanNode["keyPattern"],
    direction: raw.direction as string | undefined,
    isMultiKey: raw.isMultiKey as boolean | undefined,
    filter: raw.filter,
    indexBounds: raw.indexBounds,
    sortPattern: raw.sortPattern as PlanNode["sortPattern"],
    memLimit: numOrUndef(raw.memLimit),
    memUsage: numOrUndef(raw.totalDataSizeSortedBytesEstimate ?? raw.memUsage),
    usedDisk: raw.usedDisk as boolean | undefined,
  };

  if (typeof raw.indexName === "string") node.indexName = raw.indexName;

  for (const key of CHILD_KEYS) {
    const child = raw[key] as RawStage | undefined;
    if (child && typeof child === "object") node.children.push(buildNode(child));
  }
  for (const key of CHILD_ARRAY_KEYS) {
    const arr = raw[key];
    if (Array.isArray(arr)) {
      for (const child of arr) node.children.push(buildNode(child));
    }
  }
  return node;
}

function numOrUndef(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}

/** Collect every node in the tree (depth-first). */
export function flatten(node: PlanNode): PlanNode[] {
  return [node, ...node.children.flatMap(flatten)];
}

function countNodes(node: PlanNode): number {
  return flatten(node).length;
}

// ---------------------------------------------------------------------------
// find-style explains
// ---------------------------------------------------------------------------

function findRootStage(
  doc: ExplainDocument,
): { root: RawStage; hasExec: boolean } | null {
  if (doc.executionStats?.executionStages) {
    return { root: doc.executionStats.executionStages, hasExec: true };
  }
  const winning = doc.queryPlanner?.winningPlan;
  if (winning) {
    const root = (winning.queryPlan as RawStage) ?? winning;
    return { root, hasExec: false };
  }
  return null;
}

// ---------------------------------------------------------------------------
// aggregation pipeline explains
// ---------------------------------------------------------------------------

/** The query plan tree shown for a $cursor stage (classic, readable stages). */
function cursorQueryPlan(cursor: ExplainDocument): PlanNode | undefined {
  const winning = cursor.queryPlanner?.winningPlan;
  if (!winning) return undefined;
  const root = (winning.queryPlan as RawStage) ?? winning;
  return buildNode(root);
}

function describePipelineStage(op: string, spec: unknown): string | undefined {
  if (!spec || typeof spec !== "object") return undefined;
  const s = spec as Record<string, unknown>;
  switch (op) {
    case "$lookup": {
      const from = s.from ?? s.foreignCollection;
      const as = s.as;
      const fk = s.foreignField ? ` on ${String(s.foreignField)}` : "";
      return from ? `from "${String(from)}" → "${String(as)}"${fk}` : undefined;
    }
    case "$unwind":
      return typeof s.path === "string"
        ? s.path
        : typeof s === "string"
          ? (s as unknown as string)
          : undefined;
    case "$sort":
      return JSON.stringify(s.sortKey ?? s);
    case "$group": {
      const id = s._id;
      return id !== undefined ? `_id: ${JSON.stringify(id)}` : undefined;
    }
    case "$project":
    case "$addFields":
    case "$set": {
      const keys = Object.keys(s);
      return keys.length ? `${keys.length} fields` : undefined;
    }
    case "$match":
      return JSON.stringify(s).slice(0, 80);
    default:
      return undefined;
  }
}

function parsePipeline(stages: unknown[]): {
  pipeline: PipelineStage[];
  cursorExec?: ExplainDocument["executionStats"];
  namespace?: string;
} {
  const pipeline: PipelineStage[] = [];
  let cursorExec: ExplainDocument["executionStats"] | undefined;
  let namespace: string | undefined;
  let prevTime: number | undefined;

  for (const raw of stages as Record<string, unknown>[]) {
    const op = Object.keys(raw).find((k) => k.startsWith("$")) ?? "?";
    const spec = raw[op];

    const stage: PipelineStage = {
      id: nextId(),
      name: op,
      raw,
      nReturned: numOrUndef(raw.nReturned),
      executionTimeMillisEstimate: numOrUndef(raw.executionTimeMillisEstimate),
      totalDocsExamined: numOrUndef(raw.totalDocsExamined),
      totalKeysExamined: numOrUndef(raw.totalKeysExamined),
      collectionScans: numOrUndef(raw.collectionScans),
      indexesUsed: Array.isArray(raw.indexesUsed)
        ? (raw.indexesUsed as string[])
        : undefined,
    };

    if (op === "$cursor") {
      const cursor = spec as ExplainDocument;
      namespace = cursor.queryPlanner?.namespace;
      cursorExec = cursor.executionStats;
      stage.queryPlan = cursorQueryPlan(cursor);
      stage.detail = namespace;
      // prefer the cursor's own roll-up stats
      stage.totalDocsExamined ??= cursor.executionStats?.totalDocsExamined;
      stage.totalKeysExamined ??= cursor.executionStats?.totalKeysExamined;
    } else {
      stage.detail = describePipelineStage(op, spec);
    }

    // MongoDB reports executionTimeMillisEstimate cumulatively across the
    // pipeline; derive each stage's own cost from the running difference.
    if (typeof stage.executionTimeMillisEstimate === "number") {
      const self =
        prevTime === undefined
          ? stage.executionTimeMillisEstimate
          : stage.executionTimeMillisEstimate - prevTime;
      stage.selfTimeMillis = Math.max(0, self);
      prevTime = stage.executionTimeMillisEstimate;
    }

    pipeline.push(stage);
  }

  return { pipeline, cursorExec, namespace };
}

// ---------------------------------------------------------------------------
// insights
// ---------------------------------------------------------------------------

function nodeTreeInsights(root: PlanNode): Insight[] {
  const insights: Insight[] = [];
  const nodes = flatten(root);
  const stages = new Set(nodes.map((n) => n.stage));

  if (stages.has("COLLSCAN")) {
    insights.push({
      severity: "danger",
      title: "Collection scan detected",
      detail:
        "A COLLSCAN reads every document in the collection. Add an index that covers the query's filter (and ideally its sort) to avoid scanning the whole collection.",
    });
  }

  const sortNode = nodes.find((n) => n.stage === "SORT");
  if (sortNode) {
    const disk = sortNode.usedDisk ? " It spilled to disk." : "";
    insights.push({
      severity: "warning",
      title: "Blocking in-memory sort",
      detail: `A SORT stage sorts results in memory before returning them.${disk} Create an index whose key order matches the sort to let MongoDB return results already sorted.`,
    });
  }

  const multikey = nodes.find((n) => n.stage === "IXSCAN" && n.isMultiKey);
  if (multikey) {
    insights.push({
      severity: "info",
      title: "Multikey index in use",
      detail: `Index "${multikey.indexName ?? "?"}" is multikey (indexes array fields). This can expand the number of keys examined; verify it stays selective.`,
    });
  }

  return insights;
}

function examinedRatioInsights(plan: {
  hasExecutionStats: boolean;
  nReturned?: number;
  totalDocsExamined?: number;
  totalKeysExamined?: number;
}): Insight[] {
  const insights: Insight[] = [];
  if (!plan.hasExecutionStats || !plan.nReturned) return insights;

  if (typeof plan.totalDocsExamined === "number") {
    const ratio = plan.totalDocsExamined / plan.nReturned;
    if (ratio >= 100) {
      insights.push({
        severity: "danger",
        title: `Examined ${ratio.toFixed(0)}× more documents than returned`,
        detail: `Examined ${plan.totalDocsExamined.toLocaleString()} documents to return ${plan.nReturned.toLocaleString()}. The query is reading far more than it needs — a more selective index would help.`,
      });
    } else if (ratio >= 10) {
      insights.push({
        severity: "warning",
        title: `Examined ${ratio.toFixed(1)}× more documents than returned`,
        detail: `Examined ${plan.totalDocsExamined.toLocaleString()} documents to return ${plan.nReturned.toLocaleString()}. Consider a more selective index.`,
      });
    }
  }
  return insights;
}

function pipelineInsights(pipeline: PipelineStage[]): Insight[] {
  const insights: Insight[] = [];

  // Slowest stage by self time
  const timed = pipeline.filter((s) => typeof s.selfTimeMillis === "number");
  const totalTime = timed.reduce((a, s) => a + (s.selfTimeMillis ?? 0), 0);
  const slowest = timed.reduce<PipelineStage | null>(
    (max, s) => ((s.selfTimeMillis ?? 0) > (max?.selfTimeMillis ?? -1) ? s : max),
    null,
  );
  if (
    slowest &&
    (slowest.selfTimeMillis ?? 0) >= 100 &&
    (slowest.selfTimeMillis ?? 0) >= totalTime * 0.4
  ) {
    insights.push({
      severity: "warning",
      title: `${slowest.name} dominates execution time`,
      detail: `${slowest.name}${
        slowest.detail ? ` (${slowest.detail})` : ""
      } took ~${(slowest.selfTimeMillis ?? 0).toLocaleString()} ms of ~${totalTime.toLocaleString()} ms total. Focus optimization here.`,
    });
  }

  // $lookup stages scanning huge numbers of documents
  for (const s of pipeline) {
    if (s.name !== "$lookup") continue;
    const docs = s.totalDocsExamined ?? 0;
    const keys = s.totalKeysExamined ?? 0;
    const examined = Math.max(docs, keys);
    if (examined >= 10000) {
      const onId = s.indexesUsed?.length === 1 && s.indexesUsed[0] === "_id_";
      insights.push({
        severity: "danger",
        title: `${s.name} examined ${examined.toLocaleString()} entries`,
        detail: `${s.detail ?? s.name} examined ${examined.toLocaleString()} index keys/documents to return ${s.nReturned?.toLocaleString() ?? "?"}.${
          onId
            ? " It only had the _id_ index available — add an index on the foreign field being joined."
            : " Add or improve an index on the joined foreign field."
        }`,
      });
    }
  }

  return insights;
}

export class ExplainParseError extends Error {}

export function parseExplain(input: string): ParsedPlan {
  let doc: ExplainDocument;
  try {
    doc = JSON.parse(input);
  } catch (e) {
    throw new ExplainParseError(
      `Invalid JSON: ${(e as Error).message}. Paste the output of explain("executionStats").`,
    );
  }

  idCounter = 0;

  // Aggregation pipeline explain
  if (Array.isArray(doc.stages)) {
    const { pipeline, cursorExec, namespace } = parsePipeline(doc.stages);
    if (pipeline.length === 0) {
      throw new ExplainParseError("Aggregation explain has an empty pipeline.");
    }
    const lastReturned = pipeline[pipeline.length - 1]?.nReturned;
    const totalDocs = pipeline.reduce(
      (a, s) => a + (s.totalDocsExamined ?? 0),
      0,
    );
    const totalKeys = pipeline.reduce(
      (a, s) => a + (s.totalKeysExamined ?? 0),
      0,
    );

    const insights: Insight[] = [];
    const cursorStage = pipeline.find((s) => s.name === "$cursor");
    if (cursorStage?.queryPlan) {
      insights.push(...nodeTreeInsights(cursorStage.queryPlan));
    }
    insights.push(...pipelineInsights(pipeline));
    if (insights.length === 0) {
      insights.push({
        severity: "good",
        title: "No obvious problems in the pipeline",
        detail:
          "No collection scans, blocking sorts, or oversized $lookup scans were detected.",
      });
    }

    return {
      kind: "aggregation",
      pipeline,
      namespace,
      hasExecutionStats: cursorExec !== undefined || lastReturned !== undefined,
      nReturned: lastReturned ?? cursorExec?.nReturned,
      executionTimeMillis:
        pipeline[pipeline.length - 1]?.executionTimeMillisEstimate ??
        cursorExec?.executionTimeMillis,
      totalKeysExamined: totalKeys || cursorExec?.totalKeysExamined,
      totalDocsExamined: totalDocs || cursorExec?.totalDocsExamined,
      insights,
    };
  }

  // find-style explain
  const found = findRootStage(doc);
  if (!found) {
    throw new ExplainParseError(
      "Could not find a query plan. Expected a 'queryPlanner', 'executionStats', or aggregation 'stages' field.",
    );
  }

  const root = buildNode(found.root);
  const base = {
    kind: "find" as const,
    root,
    namespace: doc.queryPlanner?.namespace,
    hasExecutionStats: found.hasExec,
    nReturned: doc.executionStats?.nReturned,
    executionTimeMillis: doc.executionStats?.executionTimeMillis,
    totalKeysExamined: doc.executionStats?.totalKeysExamined,
    totalDocsExamined: doc.executionStats?.totalDocsExamined,
  };

  const insights: Insight[] = [
    ...nodeTreeInsights(root),
    ...examinedRatioInsights(base),
  ];
  const stages = new Set(flatten(root).map((n) => n.stage));
  if (
    insights.length === 0 &&
    (stages.has("IXSCAN") ||
      stages.has("COUNT_SCAN") ||
      stages.has("DISTINCT_SCAN"))
  ) {
    insights.push({
      severity: "good",
      title: "Query is using an index efficiently",
      detail:
        "The plan uses an index scan with no obvious red flags. Nice.",
    });
  }
  console.log("Extracted plan:", base);
  console.log("Generated insights:", insights);

  return { ...base, insights };
}

export { countNodes };
