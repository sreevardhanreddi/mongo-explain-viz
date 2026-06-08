import { pipelineInfo } from "../lib/stageInfo";
import type { PipelineStage } from "../types";
import { StageNode } from "./StageNode";

function fmt(n: number | undefined): string {
  return typeof n === "number" ? n.toLocaleString() : "—";
}

/** Renders an aggregation pipeline as an ordered list of stages. */
export function PipelineView({ pipeline }: { pipeline: PipelineStage[] }) {
  const maxSelf = Math.max(
    1,
    ...pipeline.map((s) => s.selfTimeMillis ?? 0),
  );

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold tracking-wide text-stone-400 uppercase">
        Aggregation Pipeline
      </h2>
      <p className="text-xs text-stone-500">
        Stages run top-to-bottom. Bars show each stage's share of execution
        time.
      </p>

      <ol className="mt-2 space-y-2">
        {pipeline.map((stage, i) => {
          const slow = (stage.selfTimeMillis ?? 0) === maxSelf && maxSelf > 50;
          const examined = Math.max(
            stage.totalDocsExamined ?? 0,
            stage.totalKeysExamined ?? 0,
          );
          const heavy = examined >= 10000;
          return (
            <li
              key={stage.id}
              className={`rounded-lg border bg-stone-900/60 p-3 ${
                slow || heavy ? "border-amber-900/60" : "border-stone-800"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-stone-800 font-mono text-xs text-stone-400 ring-1 ring-stone-700">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-sky-300">
                      {stage.name}
                    </span>
                    {stage.detail && (
                      <span className="truncate font-mono text-xs text-stone-400">
                        {stage.detail}
                      </span>
                    )}
                    {heavy && (
                      <span className="rounded bg-red-950 px-1.5 py-0.5 text-xs text-red-300 ring-1 ring-red-900">
                        {fmt(examined)} examined
                      </span>
                    )}
                  </div>

                  <p className="mt-1.5 text-xs leading-relaxed text-stone-500">
                    {pipelineInfo(stage.name)}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {stage.nReturned !== undefined && (
                      <Metric label="returned" value={fmt(stage.nReturned)} />
                    )}
                    {stage.selfTimeMillis !== undefined && (
                      <Metric
                        label="time"
                        value={`${fmt(stage.selfTimeMillis)} ms`}
                      />
                    )}
                    {stage.totalKeysExamined !== undefined && (
                      <Metric
                        label="keys examined"
                        value={fmt(stage.totalKeysExamined)}
                      />
                    )}
                    {stage.totalDocsExamined !== undefined && (
                      <Metric
                        label="docs examined"
                        value={fmt(stage.totalDocsExamined)}
                      />
                    )}
                    {stage.indexesUsed && stage.indexesUsed.length > 0 && (
                      <Metric
                        label="indexes"
                        value={[...new Set(stage.indexesUsed)].join(", ")}
                      />
                    )}
                  </div>

                  {stage.selfTimeMillis !== undefined && (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-800">
                      <div
                        className={`h-full rounded-full ${
                          slow ? "bg-amber-500" : "bg-stone-600"
                        }`}
                        style={{
                          width: `${Math.max(
                            2,
                            ((stage.selfTimeMillis ?? 0) / maxSelf) * 100,
                          )}%`,
                        }}
                      />
                    </div>
                  )}

                  {stage.queryPlan && (
                    <div className="mt-3 rounded-lg border border-stone-800 bg-stone-950/60 p-2">
                      <div className="mb-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">
                        Underlying query plan
                      </div>
                      <StageNode node={stage.queryPlan} />
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
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
