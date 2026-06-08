import { SEVERITY_STYLES } from "../lib/severity";
import type { Insight } from "../types";

export function Insights({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold tracking-wide text-stone-400 uppercase">
        Insights
      </h2>
      {insights.map((insight, i) => {
        const styles = SEVERITY_STYLES[insight.severity];
        return (
          <div
            key={i}
            className={`rounded-lg border ${styles.border} bg-stone-900/60 p-3`}
          >
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
              <h3 className={`text-sm font-semibold ${styles.text}`}>
                {insight.title}
              </h3>
            </div>
            <p className="mt-1.5 pl-4 text-xs leading-relaxed text-stone-400">
              {insight.detail}
            </p>
          </div>
        );
      })}
    </section>
  );
}
