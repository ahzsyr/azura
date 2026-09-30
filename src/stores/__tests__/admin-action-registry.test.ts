import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  deriveActiveFromStack,
  getEnabledActionKeys,
  getRegisteredActionKeys,
  removeStackEntry,
  sortStackByPriority,
  upsertStackEntry,
  type ActionStackEntry,
  type PageActionOwner,
} from "@/stores/admin-action-registry";
import { useAdminUiStore, type PageActions } from "@/stores/admin-ui-store";
import {
  getMissingRequiredActions,
  type AdminPageConfig,
} from "@/config/admin-page-config";

function owner(
  id: string,
  opts: Partial<PageActionOwner> & { ownerKey?: string; priority?: number } = {},
): PageActionOwner {
  return {
    id,
    ownerKey: opts.ownerKey ?? id.split(":")[0]!,
    scope: opts.scope ?? opts.ownerKey ?? id.split(":")[0]!,
    priority: opts.priority ?? 0,
    entityId: opts.entityId,
  };
}

function entry(
  id: string,
  actions: PageActions,
  opts: Partial<PageActionOwner> = {},
): ActionStackEntry {
  return { owner: owner(id, opts), actions };
}

function resetStore() {
  useAdminUiStore.setState({
    actionStack: [],
    pageActions: {},
    activeOwner: null,
    saveStatus: "saved",
    publishStatus: "live",
    pendingDirty: false,
  });
}

describe("admin action registry — stack helpers", () => {
  it("registers actions for owner via upsert", () => {
    const save = async () => true;
    let stack: ActionStackEntry[] = [];
    stack = upsertStackEntry(stack, entry("page-editor:a", { onSave: save }, { priority: 0 }));
    const active = deriveActiveFromStack(stack);
    assert.equal(active.activeOwner?.id, "page-editor:a");
    assert.equal(active.pageActions.onSave, save);
  });

  it("replaces actions for same owner (handler refresh)", () => {
    const save1 = async () => true;
    const save2 = async () => false;
    let stack = upsertStackEntry([], entry("page-editor:a", { onSave: save1 }));
    stack = upsertStackEntry(stack, entry("page-editor:a", { onSave: save2 }));
    assert.equal(stack.length, 1);
    assert.equal(deriveActiveFromStack(stack).pageActions.onSave, save2);
  });

  it("higher priority owner becomes active", () => {
    let stack = upsertStackEntry(
      [],
      entry("page-editor:a", { onSave: async () => true }, { priority: 0, scope: "page-editor" }),
    );
    stack = upsertStackEntry(
      stack,
      entry("seo-meta:b", { onSave: async () => true, onPublish: async () => true }, {
        priority: 10,
        scope: "seo-tab",
        ownerKey: "seo-meta",
      }),
    );
    const active = deriveActiveFromStack(stack);
    assert.equal(active.activeOwner?.id, "seo-meta:b");
    assert.equal(active.activeOwner?.scope, "seo-tab");
    assert.ok(typeof active.pageActions.onPublish === "function");
  });

  it("lower priority owner remains registered underneath", () => {
    let stack = upsertStackEntry(
      [],
      entry("page-editor:a", { onSave: async () => true }, { priority: 0 }),
    );
    stack = upsertStackEntry(
      stack,
      entry("seo-meta:b", { onCancel: async () => {} }, { priority: 10 }),
    );
    assert.equal(stack.length, 2);
    assert.ok(stack.some((e) => e.owner.id === "page-editor:a"));
    assert.ok(stack.some((e) => e.owner.id === "seo-meta:b"));
  });

  it("higher priority owner unmount restores lower owner (SEO handoff)", async () => {
    let stack = upsertStackEntry(
      [],
      entry("page-editor:a", { onSave: async () => "editor" }, { priority: 0, ownerKey: "page-editor" }),
    );
    stack = upsertStackEntry(
      stack,
      entry("seo-meta:b", { onSave: async () => "seo" }, { priority: 10, ownerKey: "seo-meta" }),
    );
    assert.equal(deriveActiveFromStack(stack).activeOwner?.id, "seo-meta:b");
    stack = removeStackEntry(stack, "seo-meta:b");
    const restored = deriveActiveFromStack(stack);
    assert.equal(restored.activeOwner?.id, "page-editor:a");
    assert.equal(await restored.pageActions.onSave!(), "editor");
  });

  it("sortStackByPriority orders descending", () => {
    const sorted = sortStackByPriority([
      entry("a", {}, { priority: 0 }),
      entry("b", {}, { priority: 10 }),
      entry("c", {}, { priority: 5 }),
    ]);
    assert.deepEqual(
      sorted.map((e) => e.owner.priority),
      [10, 5, 0],
    );
  });
});

describe("admin action registry — store integration", () => {
  beforeEach(() => {
    resetStore();
  });

  it("registerAdminPageActions / unregisterAdminPageActions maintain stack", () => {
    const store = useAdminUiStore.getState();
    const editor = owner("page-editor:a", { priority: 0, scope: "page-editor" });
    const seo = owner("seo-meta:b", { priority: 10, scope: "seo-tab", ownerKey: "seo-meta" });

    store.registerAdminPageActions({ onSave: async () => "editor" }, editor);
    assert.equal(useAdminUiStore.getState().activeOwner?.id, "page-editor:a");

    store.registerAdminPageActions({ onSave: async () => "seo" }, seo);
    assert.equal(useAdminUiStore.getState().activeOwner?.id, "seo-meta:b");
    assert.equal(useAdminUiStore.getState().actionStack.length, 2);

    store.unregisterAdminPageActions("seo-meta:b");
    assert.equal(useAdminUiStore.getState().activeOwner?.id, "page-editor:a");
    assert.equal(useAdminUiStore.getState().actionStack.length, 1);
  });

  it("stale owner cannot clear current owner (unregister wrong id is no-op)", () => {
    const store = useAdminUiStore.getState();
    store.registerAdminPageActions(
      { onSave: async () => true },
      owner("seo-meta:b", { priority: 10 }),
    );
    store.unregisterAdminPageActions("page-editor:stale");
    assert.equal(useAdminUiStore.getState().activeOwner?.id, "seo-meta:b");
    assert.equal(useAdminUiStore.getState().actionStack.length, 1);
  });

  it("same owner refreshes stale handlers", async () => {
    const store = useAdminUiStore.getState();
    const o = owner("page-editor:a");
    store.registerAdminPageActions({ onSave: async () => 1 }, o);
    store.registerAdminPageActions({ onSave: async () => 2 }, o);
    assert.equal(useAdminUiStore.getState().actionStack.length, 1);
    assert.equal(await useAdminUiStore.getState().pageActions.onSave!(), 2);
  });

  it("Strict Mode style double unregister of other owner does not clear active", () => {
    const store = useAdminUiStore.getState();
    store.registerAdminPageActions(
      { onSave: async () => "parent" },
      owner("page-editor:a", { priority: 0 }),
    );
    store.registerAdminPageActions(
      { onSave: async () => "child" },
      owner("seo-meta:b", { priority: 10 }),
    );
    // Simulate older Strict Mode cleanup trying to unregister parent while child is active
    store.unregisterAdminPageActions("page-editor:a");
    assert.equal(useAdminUiStore.getState().activeOwner?.id, "seo-meta:b");
    store.unregisterAdminPageActions("page-editor:a");
    assert.equal(useAdminUiStore.getState().activeOwner?.id, "seo-meta:b");
  });
});

describe("admin action registry — registered vs enabled", () => {
  it("disabled actions count as registered", () => {
    const actions: PageActions = {
      onSave: async () => true,
      onPublish: async () => true,
      canPublish: false,
    };
    assert.deepEqual(getRegisteredActionKeys(actions).sort(), ["publish", "save"].sort());
    assert.deepEqual(getEnabledActionKeys(actions), ["save"]);
  });

  it("conditional actions don't trigger missing-action warning when absent", () => {
    const config: AdminPageConfig = {
      mode: "editor",
      expectedActions: {
        save: "required",
        cancel: "required",
        publish: "conditional",
      },
    };
    const actions: PageActions = {
      onSave: async () => true,
      onCancel: async () => {},
    };
    assert.deepEqual(getMissingRequiredActions(config, actions), []);
  });

  it("missing required action is reported", () => {
    const config: AdminPageConfig = {
      mode: "editor",
      expectedActions: { save: "required", cancel: "required" },
    };
    const actions: PageActions = { onSave: async () => true };
    assert.deepEqual(getMissingRequiredActions(config, actions), ["cancel"]);
  });

  it("actionless dashboard produces no missing actions", () => {
    const config: AdminPageConfig = {
      mode: "dashboard",
      expectedActions: {},
    };
    assert.deepEqual(getMissingRequiredActions(config, {}), []);
  });

  it("registered-but-disabled publish does not count as missing", () => {
    const config: AdminPageConfig = {
      mode: "editor",
      expectedActions: { save: "required", publish: "required" },
    };
    const actions: PageActions = {
      onSave: async () => true,
      onPublish: async () => true,
      canPublish: false,
    };
    assert.deepEqual(getMissingRequiredActions(config, actions), []);
  });
});
