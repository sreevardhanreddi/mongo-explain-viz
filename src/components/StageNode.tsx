import { useState } from "react";
import { SEVERITY_STYLES } from "../lib/severity";
import { stageMeta } from "../lib/stageInfo";
import type { PlanNode } from "../types";

function fmt(n: number | undefined): string {
  return typeof n === "number" ? n.toLocaleString() : "—";
}

/** A single stage in the plan tree, with its children rendered recursively. */
export function StageNode({
  node,
  depth = 0,
}: {
  node: PlanNode;
  depth?: number;
}) {
  const [open, setOpen] = useState(true);
  const meta = stageMeta(node.stage);
  const styles = SEVERITY_STYLES[meta.severity];
  const hasChildren = node.children.length > 0;

  return (
    <div className="relative">
      <div
        className={`rounded-lg border ${styles.border} bg-stone-900/60 p-3 transition-colors hover:bg-stone-900`}
      >
        <div className="flex items-start gap-3">
          <button
            onClick={() => hasChildren && setOpen((o) => !o)}
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs text-stone-400 ${
              hasChildren ? "hover:bg-stone-700" : "invisible"
            }`}
            aria-label={open ? "Collapse" : "Expand"}
          >
            {open ? "▾" : "▸"}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
              <span className="font-mono text-sm font-semibold text-stone-100">
                {node.stage}
              </span>
              <span className="text-xs text-stone-400">{meta.label}</span>
              {node.indexName && (
                <span className="rounded bg-stone-800 px-1.5 py-0.5 font-mono text-xs text-sky-300 ring-1 ring-stone-700">
                  {node.indexName}
                </span>
              )}
              {node.usedDisk && (
                <span className="rounded bg-amber-950 px-1.5 py-0.5 text-xs text-amber-300 ring-1 ring-amber-900">
                  spilled to disk
                </span>
              )}
            </div>

            <p className="mt-1.5 text-xs leading-relaxed text-stone-400">
              {meta.description}
            </p>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-400">
              {node.nReturned !== undefined && (
                <Metric label="returned" value={fmt(node.nReturned)} />
              )}
              {node.keysExamined !== undefined && (
                <Metric label="keys examined" value={fmt(node.keysExamined)} />
              )}
              {node.docsExamined !== undefined && (
                <Metric label="docs examined" value={fmt(node.docsExamined)} />
              )}
              {node.executionTimeMillisEstimate !== undefined && (
                <Metric
                  label="time"
                  value={`${fmt(node.executionTimeMillisEstimate)} ms`}
                />
              )}
              {node.works !== undefined && (
                <Metric label="works" value={fmt(node.works)} />
              )}
            </div>

            {node.keyPattern && (
              <div className="mt-2 font-mono text-xs text-stone-500">
                key:{" "}
                <span className="text-stone-300">
                  {JSON.stringify(node.keyPattern)}
                </span>
              </div>
            )}
            {node.sortPattern && (
              <div className="mt-1 font-mono text-xs text-stone-500">
                sort:{" "}
                <span className="text-stone-300">
                  {JSON.stringify(node.sortPattern)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {hasChildren && open && (
        <div className="ml-6 mt-2 space-y-2 border-l border-stone-800 pl-4">
          {node.children.map((child) => (
            <StageNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="text-stone-500">{label}:</span>{" "}
      <span className="font-mono text-stone-200">{value}</span>
    </span>
  );
}
