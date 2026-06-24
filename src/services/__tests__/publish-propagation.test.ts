import test from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";
import type { HeaderWorkspace, MenuItem } from "@/features/navigation/types";

const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (...args: unknown[]) => unknown })._load = function load(
  request: string,
  ...args: unknown[]
) {
  if (request === "server-only") return {};
  if (request === "next/cache") {
    return {
      revalidatePath: () => undefined,
      revalidateTag: () => undefined,
      unstable_cache: (fn: unknown) => fn,
    };
  }
  return originalLoad.call(this, request, ...args);
};

async function loadPublishPropagation() {
  return import("@/services/publish-propagation");
}

function menuItem(partial: Partial<MenuItem> & Pick<MenuItem, "id" | "type" | "label">): MenuItem {
  return {
    placement: "both",
    children: [],
    ...partial,
  };
}

function workspaceWithItems(items: MenuItem[], activeMenuKey = "main"): HeaderWorkspace {
  return {
    menusDatabase: {
      main: { key: "main", label: "Main", items },
    },
    activeMenuKey,
    branding: {} as HeaderWorkspace["branding"],
    headerActions: [],
    settings: {} as HeaderWorkspace["settings"],
  };
}

test("localePrefixesToLayoutPaths normalizes and dedupes prefixes", async () => {
  const { localePrefixesToLayoutPaths } = await loadPublishPropagation();
  assert.deepEqual(localePrefixesToLayoutPaths(["en", " ar ", "en"]), ["/en", "/ar"]);
});

test("localePrefixesToLayoutPaths skips empty prefixes", async () => {
  const { localePrefixesToLayoutPaths } = await loadPublishPropagation();
  assert.deepEqual(localePrefixesToLayoutPaths(["", "  ", "en"]), ["/en"]);
});

test("headerWorkspaceFingerprint is stable for the same workspace", async () => {
  const { headerWorkspaceFingerprint } = await loadPublishPropagation();
  const ws = workspaceWithItems([
    menuItem({ id: "a", type: "link", label: "Home" }),
    menuItem({ id: "b", type: "link", label: "About" }),
  ]);
  const first = headerWorkspaceFingerprint(ws);
  const second = headerWorkspaceFingerprint(ws);
  assert.deepEqual(first, second);
  assert.equal(first.activeMenuKey, "main");
  assert.equal(first.menuItemCount, 2);
  assert.equal(first.hash.length, 24);
});

test("headerWorkspaceFingerprint changes when menu content changes", async () => {
  const { headerWorkspaceFingerprint } = await loadPublishPropagation();
  const before = workspaceWithItems([menuItem({ id: "a", type: "link", label: "Home" })]);
  const after = workspaceWithItems([
    menuItem({ id: "a", type: "link", label: "Home" }),
    menuItem({ id: "b", type: "link", label: "Products" }),
  ]);
  const beforeFp = headerWorkspaceFingerprint(before);
  const afterFp = headerWorkspaceFingerprint(after);
  assert.notEqual(beforeFp.hash, afterFp.hash);
  assert.equal(beforeFp.menuItemCount, 1);
  assert.equal(afterFp.menuItemCount, 2);
});

test("collectHeaderPublishInvalidatedTags includes shell and flyout tags", async () => {
  const { collectHeaderPublishInvalidatedTags } = await loadPublishPropagation();
  const { CACHE_TAGS } = await import("@/services/cache");
  const tags = collectHeaderPublishInvalidatedTags(["en", "ar"]);
  assert.ok(tags.includes("header-workspace"));
  assert.ok(tags.includes(CACHE_TAGS.json("header-workspace")));
  assert.ok(tags.includes(CACHE_TAGS.marketing));
  assert.ok(tags.includes("header-flyout-en"));
  assert.ok(tags.includes("header-flyout-ar"));
});

test("isPublishPropagationLogEnabled is false unless env is set", async () => {
  const { isPublishPropagationLogEnabled } = await loadPublishPropagation();
  const previous = process.env.PUBLISH_PROPAGATION_LOG;
  try {
    delete process.env.PUBLISH_PROPAGATION_LOG;
    assert.equal(isPublishPropagationLogEnabled(), false);
    process.env.PUBLISH_PROPAGATION_LOG = "1";
    assert.equal(isPublishPropagationLogEnabled(), true);
  } finally {
    if (previous === undefined) {
      delete process.env.PUBLISH_PROPAGATION_LOG;
    } else {
      process.env.PUBLISH_PROPAGATION_LOG = previous;
    }
  }
});
