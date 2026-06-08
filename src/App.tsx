import { useMemo, useState } from "react";
import { Insights } from "./components/Insights";
import { PipelineView } from "./components/PipelineView";
import { StageNode } from "./components/StageNode";
import { Summary } from "./components/Summary";
import { ExplainParseError, parseExplain } from "./lib/parseExplain";
import type { ParsedPlan } from "./types";

export default function App() {
  const [input, setInput] = useState("");

  const result = useMemo<
    { plan: ParsedPlan; error: null } | { plan: null; error: string | null }
  >(() => {
    const trimmed = input.trim();
    if (!trimmed) return { plan: null, error: null };
    try {
      return { plan: parseExplain(trimmed), error: null };
    } catch (e) {
      const msg =
        e instanceof ExplainParseError
          ? e.message
          : `Unexpected error: ${(e as Error).message}`;
      return { plan: null, error: msg };
    }
  }, [input]);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200">
      <header className="border-b border-stone-800 bg-stone-900/40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-900/40 ring-1 ring-emerald-800">
              <span className="text-lg">🍃</span>
            </div>
            <div>
              <h1 className="text-base font-semibold text-stone-100">
                Mongo Explain Visualizer
              </h1>
              <p className="text-xs text-stone-500">
                Paste an explain plan to visualize, debug, and understand it
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        {/* Input panel */}
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold tracking-wide text-stone-400 uppercase">
              Explain JSON
            </span>
            <div className="flex-1" />

            {input && (
              <button
                onClick={() => setInput("")}
                className="rounded-md border border-stone-700 bg-stone-800 px-2 py-1 text-xs text-stone-400 transition-colors hover:bg-stone-700"
              >
                Clear
              </button>
            )}
          </div>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder={
              'Paste the output of db.collection.find(...).explain("executionStats") here'
            }
            className="h-[60vh] w-full resize-none rounded-lg border border-stone-800 bg-stone-900/60 p-3 font-mono text-xs leading-relaxed text-stone-200 outline-none placeholder:text-stone-600 focus:border-stone-600 focus:ring-1 focus:ring-stone-700 lg:h-[70vh]"
          />

          {result.error && (
            <div className="rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-xs text-red-300">
              {result.error}
            </div>
          )}
        </section>

        {/* Output panel */}
        <section className="flex flex-col gap-6">
          {!result.plan && !result.error && (
            <div className="flex h-full min-h-[40vh] flex-col items-center justify-center rounded-lg border border-dashed border-stone-800 p-8 text-center">
              <p className="text-sm text-stone-400">
                Paste an explain plan to get started.
              </p>
              <p className="mt-2 max-w-sm text-xs text-stone-600">
                Run{" "}
                <code className="font-mono text-stone-400">
                  db.coll.find(query).explain("executionStats")
                </code>{" "}
                in mongosh and paste the JSON result.
              </p>
            </div>
          )}

          {result.plan && (
            <>
              <Summary plan={result.plan} />
              <Insights insights={result.plan.insights} />
              {result.plan.kind === "aggregation" && result.plan.pipeline && (
                <PipelineView pipeline={result.plan.pipeline} />
              )}
              {result.plan.kind === "find" && result.plan.root && (
                <section className="space-y-2">
                  <h2 className="text-sm font-semibold tracking-wide text-stone-400 uppercase">
                    Execution Plan Tree
                  </h2>
                  <p className="text-xs text-stone-500">
                    Stages run bottom-up: leaves execute first and feed their
                    parents.
                  </p>
                  <div className="mt-2">
                    <StageNode node={result.plan.root} />
                  </div>
                </section>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
