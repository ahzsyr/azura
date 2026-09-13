export type DeviceMode = "desktop" | "tablet" | "mobile";

export interface EditorBlock {
  type?: string;
  [key: string]: unknown;
}

export interface EditorPageState {
  slug: string;
  title: string;
  blocks: EditorBlock[];
  settings: Record<string, unknown>;
}

export interface EditorUiState {
  selectedBlock: number | null;
  activePanel: "structure" | "preview" | "properties";
  deviceMode: DeviceMode;
}

export interface EditorState {
  pageState: EditorPageState;
  uiState: EditorUiState;
  history: {
    past: EditorPageState[];
    future: EditorPageState[];
  };
}

type Listener = (state: EditorState) => void;

export function createEditorStore(initial: EditorPageState) {
  let state: EditorState = {
    pageState: {
      slug: initial.slug,
      title: initial.title,
      blocks: [...(initial.blocks ?? [])],
      settings: { ...(initial.settings ?? {}) },
    },
    uiState: {
      selectedBlock: null,
      activePanel: "structure",
      deviceMode: "desktop",
    },
    history: { past: [], future: [] },
  };

  const listeners = new Set<Listener>();

  function emit() {
    listeners.forEach((listener) => listener(state));
  }

  function snapshotPage() {
    state.history.past.push({
      slug: state.pageState.slug,
      title: state.pageState.title,
      blocks: [...state.pageState.blocks],
      settings: { ...state.pageState.settings },
    });
    state.history.future = [];
  }

  function setPage(next: EditorPageState) {
    state = {
      ...state,
      pageState: {
        slug: next.slug,
        title: next.title,
        blocks: [...(next.blocks ?? [])],
        settings: { ...(next.settings ?? {}) },
      },
      uiState: {
        ...state.uiState,
        selectedBlock: null,
      },
    };
    emit();
  }

  function addBlock(block: EditorBlock) {
    snapshotPage();
    state.pageState.blocks = [...state.pageState.blocks, block];
    state.uiState.selectedBlock = state.pageState.blocks.length - 1;
    emit();
  }

  function updateBlock(index: number, patch: EditorBlock) {
    if (index < 0 || index >= state.pageState.blocks.length) return;
    snapshotPage();
    state.pageState.blocks = state.pageState.blocks.map((block, idx) =>
      idx === index ? { ...block, ...patch } : block,
    );
    emit();
  }

  function deleteBlock(index: number) {
    if (index < 0 || index >= state.pageState.blocks.length) return;
    snapshotPage();
    state.pageState.blocks = state.pageState.blocks.filter((_, idx) => idx !== index);
    if (state.uiState.selectedBlock === index) state.uiState.selectedBlock = null;
    emit();
  }

  function reorderBlocks(from: number, to: number) {
    if (
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= state.pageState.blocks.length ||
      to >= state.pageState.blocks.length
    ) {
      return;
    }
    snapshotPage();
    const next = [...state.pageState.blocks];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    state.pageState.blocks = next;
    state.uiState.selectedBlock = to;
    emit();
  }

  function updateSettings(patch: Record<string, unknown>) {
    snapshotPage();
    state.pageState.settings = { ...state.pageState.settings, ...patch };
    emit();
  }

  function selectBlock(index: number | null) {
    state.uiState.selectedBlock = index;
    emit();
  }

  function setActivePanel(panel: EditorUiState["activePanel"]) {
    state.uiState.activePanel = panel;
    emit();
  }

  function setDeviceMode(device: DeviceMode) {
    state.uiState.deviceMode = device;
    emit();
  }

  function subscribe(listener: Listener) {
    listeners.add(listener);
    listener(state);
    return () => listeners.delete(listener);
  }

  function undo() {
    if (state.history.past.length === 0) return;
    const prev = state.history.past[state.history.past.length - 1];
    state.history.past = state.history.past.slice(0, -1);
    state.history.future = [
      {
        slug: state.pageState.slug,
        title: state.pageState.title,
        blocks: [...state.pageState.blocks],
        settings: { ...state.pageState.settings },
      },
      ...state.history.future,
    ];
    state.pageState = {
      slug: prev.slug,
      title: prev.title,
      blocks: [...(prev.blocks ?? [])],
      settings: { ...(prev.settings ?? {}) },
    };
    emit();
  }

  function redo() {
    if (state.history.future.length === 0) return;
    const next = state.history.future[0];
    state.history.future = state.history.future.slice(1);
    state.history.past = [
      ...state.history.past,
      {
        slug: state.pageState.slug,
        title: state.pageState.title,
        blocks: [...state.pageState.blocks],
        settings: { ...state.pageState.settings },
      },
    ];
    state.pageState = {
      slug: next.slug,
      title: next.title,
      blocks: [...(next.blocks ?? [])],
      settings: { ...(next.settings ?? {}) },
    };
    emit();
  }

  return {
    getState: () => state,
    subscribe,
    setPage,
    actions: {
      addBlock,
      updateBlock,
      deleteBlock,
      reorderBlocks,
      updateSettings,
      selectBlock,
      setActivePanel,
      setDeviceMode,
      undo,
      redo,
    },
  };
}

export type EditorStore = ReturnType<typeof createEditorStore>;
