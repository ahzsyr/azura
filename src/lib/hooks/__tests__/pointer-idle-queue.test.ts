import assert from "node:assert/strict";
import { describe, it, mock, afterEach } from "node:test";
import {
  POINTER_IDLE_FALLBACK_MS,
  createPointerIdleQueue,
} from "@/lib/hooks/pointer-idle-queue";

describe("pointer idle queue", () => {
  afterEach(() => {
    mock.timers.reset();
  });

  it("runs a held pointer callback at 250ms and a second pointerdown does not restart the timer", () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    const queue = createPointerIdleQueue();
    const ran: string[] = [];

    queue.pointerDown();
    queue.runWhenIdle(() => ran.push("first"));
    mock.timers.tick(100);
    queue.pointerDown();
    mock.timers.tick(POINTER_IDLE_FALLBACK_MS - 100);

    assert.deepEqual(ran, ["first"]);
    queue.dispose();
    mock.timers.reset();
  });

  it("runs immediately when no pointer is down", () => {
    const queue = createPointerIdleQueue();
    let ran = false;
    queue.runWhenIdle(() => {
      ran = true;
    });
    assert.equal(ran, true);
    queue.dispose();
  });
});
