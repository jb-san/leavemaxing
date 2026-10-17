import { plan } from "../lib/planner/plan";
import type { PlanInput } from "../lib/planner/types";

self.onmessage = (e: MessageEvent<{ id: number; input: PlanInput }>) => {
  self.postMessage({ id: e.data.id, plan: plan(e.data.input) });
};
