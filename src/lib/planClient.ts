import { plan } from "./planner/plan";
import type { Plan, PlanInput } from "./planner/types";

let worker: Worker | null | undefined;
let nextId = 0;
const pending = new Map<number, { resolve: (p: Plan) => void; input: PlanInput }>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL("../workers/planner.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ id: number; plan: Plan }>) => {
      const job = pending.get(e.data.id);
      pending.delete(e.data.id);
      job?.resolve(e.data.plan);
    };
    worker.onerror = () => {
      // Fall back to the main thread for this and every later job.
      worker?.terminate();
      worker = null;
      for (const [id, job] of pending) {
        pending.delete(id);
        job.resolve(plan(job.input));
      }
    };
  } catch {
    worker = null;
  }
  return worker;
}

/** Plan off the main thread when possible. */
export function runPlan(input: PlanInput): Promise<Plan> {
  const w = typeof Worker !== "undefined" ? getWorker() : null;
  if (!w) return Promise.resolve(plan(input));
  return new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, { resolve, input });
    w.postMessage({ id, input });
  });
}
