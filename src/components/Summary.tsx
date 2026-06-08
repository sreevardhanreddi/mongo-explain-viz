import type { ParsedPlan } from "../types";

function fmt(n: number | undefined): string {
  return typeof n === "number" ? n.toLocaleString() : "—";
}

export function Summary({ plan }: { plan: ParsedPlan }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold tracking-wide text-stone-400 uppercase">
          Summary
        </h2>
        {plan.namespace && (
          <span className="font-mono text-xs text-sky-300">
            {plan.namespace}
          </span>
        )}
        <span className="rounded bg-stone-800 px-1.5 py-0.5 text-xs text-stone-400 ring-1 ring-stone-700">
          {plan.kind === "aggregation" ? "aggregation" : "find"}
        </span>
        {!plan.hasExecutionStats && (
          <span className="rounded bg-stone-800 px-1.5 py-0.5 text-xs text-stone-400 ring-1 ring-stone-700">
            queryPlanner only — run explain("executionStats") for timing
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Returned" value={fmt(plan.nReturned)} />
        <Stat
          label="Exec time"
          value={
            plan.executionTimeMillis !== undefined
              ? `${fmt(plan.executionTimeMillis)} ms`
              : "—"
          }
        />
        <Stat label="Keys examined" value={fmt(plan.totalKeysExamined)} />
        <Stat label="Docs examined" value={fmt(plan.totalDocsExamined)} />
        <Stat label="Stages" value={String(countStages(plan))} />
      </div>
    </section>
  );
}

function countStages(plan: ParsedPlan): number {
  if (plan.kind === "aggregation") return plan.pipeline?.length ?? 0;
  if (!plan.root) return 0;
  let count = 0;
  const walk = (n: NonNullable<ParsedPlan["root"]>) => {
    count++;
    n.children.forEach(walk);
  };
  walk(plan.root);
  return count;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900/60 p-3">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="mt-1 font-mono text-lg font-semibold text-stone-100">
        {value}
      </div>
    </div>
  );
}
