import { For, Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { Plus } from "lucide-solid";

import type { TodoItem } from "../../types";

export type SidebarSectionState = {
  progress: boolean;
  artifacts: boolean;
  context: boolean;
  plugins: boolean;
  mcp: boolean;
  skills: boolean;
  authorizedFolders: boolean;
};

export type SidebarProps = {
  todos: TodoItem[];
  expandedSections: SidebarSectionState;
  onToggleSection: (section: keyof SidebarSectionState) => void;
  workspaceName: string;
  sessions: Array<{ id: string; title: string; slug?: string | null }>;
  selectedSessionId: string | null;
  onSelectSession: (id: string) => void;
  sessionStatusById: Record<string, string>;
  onCreateSession: () => void;
  onDeleteSession: (id: string) => void;
  newTaskDisabled: boolean;
};

export default function SessionSidebar(props: SidebarProps) {
  const [contextMenu, setContextMenu] = createSignal<null | {
    sessionId: string;
    x: number;
    y: number;
  }>(null);

  const closeContextMenu = () => setContextMenu(null);

  const openContextMenu = (event: MouseEvent, sessionId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ sessionId, x: event.clientX, y: event.clientY });
  };

  const contextMenuStyle = createMemo(() => {
    const menu = contextMenu();
    if (!menu) return undefined;
    const width = 188;
    const height = 96;
    if (typeof window === "undefined") {
      return { left: `${menu.x}px`, top: `${menu.y}px` };
    }
    const maxX = Math.max(12, window.innerWidth - width - 12);
    const maxY = Math.max(12, window.innerHeight - height - 12);
    return {
      left: `${Math.min(menu.x, maxX)}px`,
      top: `${Math.min(menu.y, maxY)}px`,
    };
  });

  createEffect(() => {
    if (!contextMenu()) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeContextMenu();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown));
  });

  return (
    <div class="flex flex-col h-full overflow-hidden">
      <div class="px-4 pt-4 shrink-0">
        <button
          class="flex items-center gap-2 text-sm text-gray-12 hover:text-gray-12/90 transition-colors"
          onClick={props.onCreateSession}
          disabled={props.newTaskDisabled}
        >
          <span class="h-6 w-6 rounded-full border border-gray-6 bg-gray-1 flex items-center justify-center text-gray-10">
            <Plus size={14} />
          </span>
          <span class="font-medium">New task</span>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-4 py-4">
        <div class="space-y-6">
          <div>
            <div class="flex items-center justify-between text-xs text-gray-9 font-semibold mb-2 px-2">
              <span>Recents</span>
            </div>
            <div class="space-y-1">
              <Show
                when={props.sessions.length > 0}
                fallback={
                  <div class="px-3 py-2 rounded-lg border border-dashed border-gray-6 text-xs text-gray-9">
                    No tasks yet. Start a task to see your work here.
                  </div>
                }
              >
                <For each={props.sessions.slice(0, 8)}>
                  {(session) => (
                    <button
                      class={`w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors ${
                        session.id === props.selectedSessionId
                          ? "text-gray-12 font-medium"
                          : "text-gray-10 hover:text-gray-12 hover:bg-gray-2/60"
                      }`}
                      onClick={() => props.onSelectSession(session.id)}
                      onContextMenu={(event) => openContextMenu(event, session.id)}
                    >
                        <div class="flex items-center justify-between gap-2 w-full overflow-hidden">
                          <div class="truncate">{session.title}</div>
                          <Show
                            when={
                              props.sessionStatusById[session.id] &&
                              props.sessionStatusById[session.id] !== "idle"
                            }
                          >
                          <span
                            class={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${
                              props.sessionStatusById[session.id] === "running"
                                ? "border-amber-7/40 text-amber-10 bg-amber-2/40"
                                : "border-gray-7/40 text-gray-9 bg-gray-2/40"
                            }`}
                          >
                            <div
                              class={`w-1 h-1 rounded-full ${
                                props.sessionStatusById[session.id] === "running"
                                  ? "bg-amber-9 animate-pulse"
                                  : "bg-gray-9"
                              }`}
                            />
                          </span>
                        </Show>
                      </div>
                    </button>
                  )}
                </For>
              </Show>
            </div>
          </div>
        </div>
      </div>

      <div class="px-4 pb-4 text-[11px] text-gray-9 leading-relaxed">
        These tasks run locally and aren't synced across devices.
      </div>

      <Show when={contextMenu()}>
        {(menu) => (
          <div
            class="fixed inset-0 z-50"
            onClick={closeContextMenu}
            onContextMenu={(event) => {
              event.preventDefault();
              closeContextMenu();
            }}
          >
            <div
              class="fixed w-44 rounded-xl border border-gray-6 bg-gray-1 shadow-2xl shadow-gray-12/10 p-1"
              style={contextMenuStyle()}
              role="menu"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                class="w-full text-left px-3 py-2 text-sm rounded-lg text-gray-12 hover:bg-gray-2 transition-colors"
                role="menuitem"
                onClick={() => {
                  props.onCreateSession();
                  closeContextMenu();
                }}
              >
                New task
              </button>
              <button
                class="w-full text-left px-3 py-2 text-sm rounded-lg text-red-11 hover:bg-red-1/40 transition-colors"
                role="menuitem"
                onClick={() => {
                  props.onDeleteSession(menu().sessionId);
                  closeContextMenu();
                }}
              >
                Delete session
              </button>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}
