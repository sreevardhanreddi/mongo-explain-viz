import { useEffect, useMemo, useState } from "react";
import { Insights } from "./components/Insights";
import { PipelineView } from "./components/PipelineView";
import { StageNode } from "./components/StageNode";
import { Summary } from "./components/Summary";
import { ExplainParseError, parseExplain } from "./lib/parseExplain";
import type { ParsedPlan } from "./types";

export default function App() {
  const [input, setInput] = useState("");
  const [clock, setClock] = useState("");

  useEffect(() => {
    const formatClock = () =>
      new Date().toLocaleString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

    setClock(formatClock());
    const timer = window.setInterval(() => setClock(formatClock()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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
    <div className="flex min-h-screen flex-col bg-stone-950 text-stone-200">
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

      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-6 lg:grid-cols-[minmax(0,420px)_1fr]">
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

      <footer className="py-6 text-center text-sm text-gray-700 dark:text-stone-300">
        <div className="flex justify-center items-center gap-4">
          <a
            href="https://sreevardhanreddi.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit portfolio website"
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.6 9h16.8M3.6 15h16.8"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9 15.3 15.3 0 0 1-4-9 15.3 15.3 0 0 1 4-9z"
              />
            </svg>
          </a>

          <span className="text-gray-500 dark:text-stone-400">•</span>

          <a
            href="https://github.com/sreevardhanreddi/mongo-explain-viz"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View source code on GitHub"
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
          </a>
        </div>

        <div className="my-3 font-mono text-gray-600 dark:text-stone-400" id="live-clock">
          {clock}
        </div>
      </footer>
    </div>
  );
}
