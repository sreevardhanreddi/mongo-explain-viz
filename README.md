# Mongo Explain Visualizer

A small React app to **visualize, debug, and explain MongoDB explain plans**.
Paste the JSON output of `explain()` and the app renders a stats summary,
plain-language insights flagging common performance problems (collection scans,
blocking sorts, low index selectivity, etc.), and either an execution-plan tree
(for `find` queries) or a stage-by-stage pipeline view (for aggregations).

![Screenshot](./image.png)

## Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4 (stone dark theme throughout)

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build
npm run preview  # preview the production build
```

## How to use

1. In `mongosh`, run an explain with execution stats:

   ```js
   db.orders.find({ status: "shipped" }).sort({ createdAt: -1 }).explain("executionStats")
   ```

2. Copy the JSON result and paste it into the left panel.
3. Read the **Summary**, **Insights**, and the **Execution Plan Tree**
   (`find`) or **Pipeline** view (aggregation) on the right.

`queryPlanner`-only output (without `executionStats`) is supported too — you
just won't get timing/examined metrics. Aggregation explains are read via their
`$cursor` stage.

## Project layout

```
src/
  lib/
    parseExplain.ts   normalize raw explain JSON -> plan tree + insights
    stageInfo.ts      plain-language descriptions per stage type
    severity.ts       Tailwind class sets per severity
  components/
    Summary.tsx       top-line stats
    Insights.tsx      flagged performance findings
    StageNode.tsx     recursive plan-tree node (find queries)
    PipelineView.tsx  per-stage pipeline view (aggregations)
  types.ts            shared types
  App.tsx             layout + input handling
  main.tsx            React entry point
```

## Deployment

Pushing to `main` builds the app and publishes `dist/` to GitHub Pages via the
workflow in `.github/workflows/`.
