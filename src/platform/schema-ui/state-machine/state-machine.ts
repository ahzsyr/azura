import type { StateMachineDefinition } from "../manifests/types";

class StateMachineRegistry {
  private readonly machines = new Map<string, StateMachineDefinition>();

  register(def: StateMachineDefinition): void {
    this.machines.set(def.id, def);
  }

  get(id: string): StateMachineDefinition | undefined {
    return this.machines.get(id);
  }
}

export const stateMachineRegistry = new StateMachineRegistry();

export class StateMachine {
  private current: string;

  constructor(private readonly definition: StateMachineDefinition) {
    this.current = definition.initial;
  }

  getState(): string {
    return this.current;
  }

  canTransition(trigger: string): boolean {
    return this.definition.transitions.some((t) => t.from === this.current && t.trigger === trigger);
  }

  transition(trigger: string): string | null {
    const match = this.definition.transitions.find((t) => t.from === this.current && t.trigger === trigger);
    if (!match) return null;
    this.current = match.to;
    return this.current;
  }
}

export const FORM_LIFECYCLE_MACHINE: StateMachineDefinition = {
  id: "formLifecycle",
  initial: "draft",
  states: [
    { id: "draft", label: "Draft" },
    { id: "started", label: "Started" },
    { id: "inProgress", label: "In Progress" },
    { id: "submitted", label: "Submitted" },
    { id: "approved", label: "Approved" },
    { id: "rejected", label: "Rejected" },
  ],
  transitions: [
    { from: "draft", to: "started", trigger: "firstInteraction" },
    { from: "started", to: "inProgress", trigger: "stepAdvance" },
    { from: "inProgress", to: "submitted", trigger: "submit" },
    { from: "submitted", to: "approved", trigger: "approve" },
    { from: "submitted", to: "rejected", trigger: "reject" },
  ],
};

export function registerBuiltinStateMachines(): void {
  stateMachineRegistry.register(FORM_LIFECYCLE_MACHINE);
}
