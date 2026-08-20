import { simulationService } from "../services/simulation.service";
import type { SeoExecutionContext, SeoSimulation, SimulationInput } from "../types";

export function runSimulation(
  ctx: SeoExecutionContext,
  input: SimulationInput
): SeoSimulation {
  return simulationService.project(ctx, input);
}
