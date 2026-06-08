import type { Severity } from "../types";

export type StageMeta = {
  label: string;
  // Plain-language explanation of what this stage does.
  description: string;
  // Baseline severity hint for the stage type itself.
  severity: Severity;
};

// Human-readable explanations for the query execution stages MongoDB emits.
export const STAGE_INFO: Record<string, StageMeta> = {
  COLLSCAN: {
    label: "Collection Scan",
    description:
      "Reads every document in the collection. No index was used. This is usually the slowest option on large collections — consider adding an index that supports the query predicate.",
    severity: "danger",
  },
  IXSCAN: {
    label: "Index Scan",
    description:
      "Walks an index to find matching entries. Efficient, but check that the bounds are tight and the index is not multikey-exploding the work.",
    severity: "good",
  },
  FETCH: {
    label: "Fetch Documents",
    description:
      "Retrieves the full documents from the collection for index entries that passed earlier stages. A high docsExamined here means the index was not selective enough.",
    severity: "info",
  },
  SORT: {
    label: "In-Memory Sort",
    description:
      "Sorts results in memory (blocking). MongoDB must buffer results before returning any. Large sorts hit the 100MB memory limit unless allowDiskUse is set. Add an index matching the sort order to avoid this.",
    severity: "warning",
  },
  SORT_KEY_GENERATOR: {
    label: "Sort Key Generator",
    description: "Generates the keys used by an adjacent SORT stage.",
    severity: "info",
  },
  LIMIT: {
    label: "Limit",
    description: "Caps the number of documents passed up the pipeline.",
    severity: "info",
  },
  SKIP: {
    label: "Skip",
    description:
      "Discards a number of leading documents. Large skips are slow because skipped documents are still processed.",
    severity: "info",
  },
  PROJECTION_DEFAULT: {
    label: "Projection",
    description: "Reshapes documents using a non-trivial projection.",
    severity: "info",
  },
  PROJECTION_COVERED: {
    label: "Covered Projection",
    description:
      "All requested fields came directly from the index — no document fetch needed. This is the most efficient projection.",
    severity: "good",
  },
  PROJECTION_SIMPLE: {
    label: "Simple Projection",
    description: "Applies an inclusion/exclusion projection of top-level fields.",
    severity: "info",
  },
  SHARDING_FILTER: {
    label: "Sharding Filter",
    description:
      "Filters out orphaned documents on a shard during a sharded query.",
    severity: "info",
  },
  SHARD_MERGE: {
    label: "Shard Merge",
    description: "Merges results gathered from multiple shards.",
    severity: "info",
  },
  AND_SORTED: {
    label: "Index Intersection (sorted)",
    description: "Intersects results of multiple sorted index scans.",
    severity: "info",
  },
  AND_HASH: {
    label: "Index Intersection (hash)",
    description: "Intersects results of multiple index scans using a hash.",
    severity: "info",
  },
  OR: {
    label: "Or",
    description: "Combines results of multiple branches for an $or query.",
    severity: "info",
  },
  SUBPLAN: {
    label: "Subplan",
    description: "Plans each $or branch independently and combines them.",
    severity: "info",
  },
  COUNT: {
    label: "Count",
    description: "Counts documents matching the query.",
    severity: "info",
  },
  COUNT_SCAN: {
    label: "Count Scan",
    description:
      "Counts directly from an index without fetching documents — very efficient.",
    severity: "good",
  },
  DISTINCT_SCAN: {
    label: "Distinct Scan",
    description:
      "Returns distinct values directly from an index, skipping duplicates — efficient.",
    severity: "good",
  },
  GROUP: {
    label: "Group",
    description: "Groups documents, as in an aggregation $group stage.",
    severity: "info",
  },
  TEXT: {
    label: "Text Search",
    description: "Executes a $text query using a text index.",
    severity: "info",
  },
  TEXT_MATCH: {
    label: "Text Match",
    description: "Filters text-search results by the matching predicate.",
    severity: "info",
  },
  GEO_NEAR_2D: {
    label: "GeoNear (2d)",
    description: "Finds nearest documents using a 2d index.",
    severity: "info",
  },
  GEO_NEAR_2DSPHERE: {
    label: "GeoNear (2dsphere)",
    description: "Finds nearest documents using a 2dsphere index.",
    severity: "info",
  },
  EOF: {
    label: "EOF",
    description:
      "End of stream — the query is known to return no documents without scanning.",
    severity: "info",
  },
  EQ_LOOKUP: {
    label: "Equality Lookup ($lookup)",
    description:
      "Joins to a foreign collection on an equality match, pushed down into the query engine. With an IndexedLoopJoin strategy it seeks the foreign collection by index per input document.",
    severity: "info",
  },
};

// Plain-language descriptions for aggregation pipeline operators.
export const PIPELINE_INFO: Record<string, string> = {
  $cursor:
    "Initial query against the collection that feeds the pipeline. Its underlying query plan is shown below.",
  $lookup:
    "Joins documents from another collection. Without an index on the foreign field, each input document triggers a scan of the foreign collection.",
  $unwind: "Deconstructs an array field into one document per element.",
  $match: "Filters documents. Place $match as early as possible so the query engine can use indexes.",
  $sort: "Sorts documents. A $sort that cannot use an index buffers all input in memory (blocking).",
  $group: "Groups documents by a key. Blocking — must consume all input before emitting.",
  $project: "Reshapes documents, including or excluding fields.",
  $addFields: "Adds or overwrites computed fields on each document.",
  $set: "Adds or overwrites computed fields on each document.",
  $limit: "Caps the number of documents.",
  $skip: "Discards leading documents — large skips are slow.",
  $facet: "Runs multiple sub-pipelines over the same input.",
  $count: "Counts the documents passing through.",
  $sortByCount: "Groups by a value then sorts by frequency.",
};

export function pipelineInfo(op: string): string {
  return PIPELINE_INFO[op] ?? "Aggregation pipeline stage.";
}

export function stageMeta(stage: string): StageMeta {
  return (
    STAGE_INFO[stage] ?? {
      label: stage,
      description: "No description available for this stage type.",
      severity: "info",
    }
  );
}
