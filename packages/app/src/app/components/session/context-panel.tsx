import { For, Show, createMemo } from "solid-js";
import { BarChart3, Check, ChevronDown, Circle, File, Folder, Layers, Package } from "lucide-solid";

import { SUGGESTED_PLUGINS } from "../../constants";
import type { McpServerEntry, McpStatus, McpStatusMap, SkillCard, TodoItem } from "../../types";
import { stripPluginVersion } from "../../utils/plugins";

export type ContextPanelProps = {
  activePlugins: string[];
  activePluginStatus: string | null;
  mcpServers: McpServerEntry[];
  mcpStatuses: McpStatusMap;
  mcpStatus: string | null;
  skills: SkillCard[];
  skillsStatus: string | null;
  authorizedDirs: string[];
  workingFiles: string[];
  todos?: TodoItem[];
  showDetails?: boolean;
  workspaceRoot?: string;
  expandedSections: {
    context: boolean;
    plugins: boolean;
    mcp: boolean;
    skills: boolean;
    authorizedFolders: boolean;
  };
  onToggleSection: (section: "context" | "plugins" | "mcp" | "skills" | "authorizedFolders") => void;
  onFileClick?: (path: string) => void;
};

const humanizePlugin = (name: string) => {
  const cleaned = name
    .replace(/^@[^/]+\//, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b(opencode|plugin)\b/gi, "")
    .trim();
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .trim();
};

const matchSuggestedPlugin = (name: string) => {
  const normalized = stripPluginVersion(name).toLowerCase();
  if (!normalized) return null;
  return (
    SUGGESTED_PLUGINS.find((plugin) => {
      const candidates = [plugin.packageName, plugin.name, ...(plugin.aliases ?? [])]
        .map((candidate) => stripPluginVersion(candidate).toLowerCase())
        .filter(Boolean);
      return candidates.includes(normalized);
    }) ?? null
  );
};

const humanizeSkill = (name: string) => {
  const cleaned = name.replace(/^@[^/]+\//, "").replace(/[-_]+/g, " ").trim();
  if (!cleaned) return name;
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .trim();
};

const splitPathSegments = (value: string) => value.split(/[/\\]/).filter(Boolean);

const toWorkspaceRelative = (file: string, root?: string) => {
  const normalizedRoot = (root ?? "").trim().replace(/[\\/]+/g, "/").replace(/\/+$/, "");
  if (!normalizedRoot) return file;
  const normalizedFile = file.replace(/[\\/]+/g, "/");
  const rootKey = normalizedRoot.toLowerCase();
  const fileKey = normalizedFile.toLowerCase();
  if (fileKey === rootKey) return normalizedFile.split("/").pop() ?? normalizedFile;
  if (fileKey.startsWith(`${rootKey}/`)) {
    return normalizedFile.slice(normalizedRoot.length + 1);
  }
  return normalizedFile;
};

const getSmartFileName = (files: string[], file: string): string => {
  if (!file) return "";
  const segments = splitPathSegments(file);
  const basename = segments[segments.length - 1] ?? file;

  const duplicates = files.filter((candidate) => {
    const candidateSegments = splitPathSegments(candidate);
    return (candidateSegments[candidateSegments.length - 1] ?? candidate) === basename;
  });

  if (duplicates.length <= 1) {
    return basename;
  }

  for (let i = 2; i <= segments.length; i += 1) {
    const shortPath = segments.slice(-i).join("/");
    const isUnique = duplicates.every((candidate) => {
      if (candidate === file) return true;
      const candidateSegments = splitPathSegments(candidate);
      return candidateSegments.slice(-i).join("/") !== shortPath;
    });
    if (isUnique) return shortPath;
  }

  return file;
};

const mcpStatusLabel = (status?: McpStatus, disabled?: boolean) => {
  if (disabled) return "已禁用";
  if (!status) return "未连接";
  switch (status.status) {
    case "connected":
      return "已连接";
    case "needs_auth":
      return "需要授权";
    case "needs_client_registration":
      return "注册客户端";
    case "failed":
      return "连接失败";
    default:
      return "未连接";
  }
};

const mcpStatusDot = (status?: McpStatus, disabled?: boolean) => {
  if (disabled) return "bg-gray-7";
  if (!status) return "bg-gray-7";
  switch (status.status) {
    case "connected":
      return "bg-green-9";
    case "needs_auth":
    case "needs_client_registration":
      return "bg-amber-9";
    case "failed":
      return "bg-red-9";
    default:
      return "bg-gray-7";
  }
};

export default function ContextPanel(props: ContextPanelProps) {
  const displayFiles = () =>
    props.workingFiles.map((entry) => toWorkspaceRelative(entry, props.workspaceRoot));
  const firstWorkingFile = () => displayFiles()[0] ?? "";
  const showDetails = () => props.showDetails ?? true;

  const progressDots = createMemo(() => {
    const activeTodos = (props.todos ?? []).filter((todo) => todo.content.trim());
    const total = activeTodos.length;
    const completed = activeTodos.filter((todo) => todo.status === "completed").length;
    const dotCount = Math.max(total, 3);
    return Array.from({ length: dotCount }, (_, idx) => idx < completed);
  });

  return (
    <div class="flex flex-col h-full overflow-hidden">
      <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div class="space-y-3">
          <div class="rounded-2xl border border-gray-6 bg-gray-2/30 p-4">
            <div class="flex items-start gap-3">
              <div class="h-9 w-9 rounded-xl border border-gray-6 bg-gray-1 flex items-center justify-center text-gray-10">
                <BarChart3 size={18} />
              </div>
              <div class="min-w-0">
                <div class="text-sm font-medium text-gray-12">进度</div>
                <div class="mt-3 flex items-center gap-2 flex-wrap">
                  <For each={progressDots()}>
                    {(done) => (
                      <div
                        class={`h-6 w-6 rounded-full border flex items-center justify-center transition-colors ${
                          done ? "border-green-6 bg-green-2 text-green-11" : "border-gray-6 bg-gray-1 text-gray-8"
                        }`}
                      >
                        <Show when={done}>
                          <Check size={14} />
                        </Show>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-gray-6 bg-gray-2/30 p-4">
            <div class="flex items-start gap-3">
              <div class="h-9 w-9 rounded-xl border border-gray-6 bg-gray-1 flex items-center justify-center text-gray-10">
                <Folder size={18} />
              </div>
              <div class="min-w-0">
                <div class="text-sm font-medium text-gray-12">工作文件夹</div>
                <div class="text-xs text-gray-9">查看并打开本次任务创建的文件。</div>
                <Show when={firstWorkingFile()}>
                  <div class="mt-2 text-xs text-gray-11 truncate">
                    {props.workingFiles.length} 个文件 · {getSmartFileName(displayFiles(), firstWorkingFile())}
                  </div>
                </Show>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-gray-6 bg-gray-2/30 p-4">
            <div class="flex items-start gap-3">
              <div class="h-9 w-9 rounded-xl border border-gray-6 bg-gray-1 flex items-center justify-center text-gray-10">
                <Layers size={18} />
              </div>
              <div class="min-w-0">
                <div class="text-sm font-medium text-gray-12">上下文</div>
                <div class="text-xs text-gray-9">跟踪本次任务使用的工具与引用文件。</div>
              </div>
            </div>
          </div>
        </div>

        <Show when={showDetails()}>
          <div class="rounded-2xl border border-gray-6 bg-gray-2/30" id="sidebar-context">
            <button
              class="w-full px-4 py-3 flex items-center justify-between text-sm text-gray-12 font-medium"
              onClick={() => props.onToggleSection("context")}
            >
              <span>上下文</span>
              <ChevronDown
                size={16}
                class={`transition-transform text-gray-10 ${props.expandedSections.context ? "rotate-180" : ""}`.trim()}
              />
            </button>
            <Show when={props.expandedSections.context}>
              <div class="px-4 pb-4 pt-1 space-y-5">
                <div>
                  <div class="flex items-center justify-between text-[11px] uppercase tracking-wider text-gray-9 font-semibold mb-2">
                    <span>工作文件</span>
                  </div>
                  <div class="space-y-2">
                    <Show
                      when={props.workingFiles.length}
                      fallback={<div class="text-xs text-gray-9">暂无。</div>}
                    >
                      <For each={props.workingFiles}>
                        {(file) => {
                          const displayPath = () => toWorkspaceRelative(file, props.workspaceRoot);
                          const label = () => getSmartFileName(displayFiles(), displayPath());
                          const canOpen = () => typeof props.onFileClick === "function";
                          return (
                            <button
                              type="button"
                              class={`flex items-center gap-2 text-xs text-gray-11 rounded px-1 -mx-1 transition-colors w-full text-left ${
                                canOpen()
                                  ? "hover:text-gray-12 hover:bg-gray-3"
                                  : "cursor-default opacity-70"
                              }`.trim()}
                              onClick={() => props.onFileClick?.(file)}
                            title={canOpen() ? `打开 ${displayPath()}` : displayPath()}
                              disabled={!canOpen()}
                            >
                              <File size={12} class="text-gray-9" />
                              <span class="truncate">{label()}</span>
                            </button>
                          );
                        }}
                      </For>
                    </Show>
                  </div>
                </div>
              </div>
            </Show>
          </div>

          <div class="rounded-2xl border border-gray-6 bg-gray-2/30">
            <button
              class="w-full px-4 py-3 flex items-center justify-between text-sm text-gray-12 font-medium"
              onClick={() => props.onToggleSection("plugins")}
            >
              <span>插件</span>
              <ChevronDown
                size={16}
                class={`transition-transform text-gray-10 ${props.expandedSections.plugins ? "rotate-180" : ""}`.trim()}
              />
            </button>
            <Show when={props.expandedSections.plugins}>
              <div class="px-4 pb-4 pt-1">
                <div class="space-y-2">
                  <Show
                    when={props.activePlugins.length}
                    fallback={
                      <div class="text-xs text-gray-9">
                        {props.activePluginStatus ?? "暂无插件。"}
                      </div>
                    }
                  >
                    <For each={props.activePlugins}>
                      {(plugin) => {
                        const suggested = matchSuggestedPlugin(plugin);
                        const normalized = stripPluginVersion(plugin) || plugin;
                        const label = humanizePlugin(suggested?.name ?? normalized) || normalized;
                        const description = suggested?.description?.trim();
                        const detail = description || (normalized !== label ? normalized : "");
                        return (
                          <div class="flex items-start gap-2 text-xs text-gray-11">
                            <Circle size={6} class="text-green-9 fill-green-9 mt-1" />
                            <div class="min-w-0">
                              <div class="truncate">{label}</div>
                              <Show when={detail}>
                                <div class="text-[11px] text-gray-9 truncate" title={detail}>
                                  {detail}
                                </div>
                              </Show>
                            </div>
                          </div>
                        );
                      }}
                    </For>
                  </Show>
                </div>
              </div>
            </Show>
          </div>

          <div class="rounded-2xl border border-gray-6 bg-gray-2/30">
            <button
              class="w-full px-4 py-3 flex items-center justify-between text-sm text-gray-12 font-medium"
              onClick={() => props.onToggleSection("mcp")}
            >
              <span>MCP</span>
              <ChevronDown
                size={16}
                class={`transition-transform text-gray-10 ${props.expandedSections.mcp ? "rotate-180" : ""}`.trim()}
              />
            </button>
            <Show when={props.expandedSections.mcp}>
              <div class="px-4 pb-4 pt-1">
                <div class="space-y-2">
                  <Show
                    when={props.mcpServers.length}
                    fallback={
                      <div class="text-xs text-gray-9">
                        {props.mcpStatus ?? "暂无 MCP 服务。"}
                      </div>
                    }
                  >
                    <For each={props.mcpServers}>
                      {(entry) => {
                        const status = () => props.mcpStatuses[entry.name];
                        const disabled = () => entry.config.enabled === false;
                        const detail =
                          entry.config.type === "remote"
                            ? entry.config.url
                            : entry.config.command?.join(" ");
                        return (
                          <div class="flex items-start gap-2 text-xs text-gray-11">
                            <span class={`mt-1 h-2 w-2 rounded-full ${mcpStatusDot(status(), disabled())}`} />
                            <div class="min-w-0">
                              <div class="truncate">{entry.name}</div>
                              <div class="text-[11px] text-gray-9 truncate">
                                {mcpStatusLabel(status(), disabled())}
                                {detail ? ` - ${detail}` : ""}
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    </For>
                  </Show>
                </div>
              </div>
            </Show>
          </div>

          <div class="rounded-2xl border border-gray-6 bg-gray-2/30">
            <button
              class="w-full px-4 py-3 flex items-center justify-between text-sm text-gray-12 font-medium"
              onClick={() => props.onToggleSection("skills")}
            >
              <span>技能</span>
              <ChevronDown
                size={16}
                class={`transition-transform text-gray-10 ${props.expandedSections.skills ? "rotate-180" : ""}`.trim()}
              />
            </button>
            <Show when={props.expandedSections.skills}>
              <div class="px-4 pb-4 pt-1">
                <div class="space-y-2">
                  <Show
                    when={props.skills.length}
                    fallback={
                      <div class="text-xs text-gray-9">
                        {props.skillsStatus ?? "暂无技能。"}
                      </div>
                    }
                  >
                    <For each={props.skills}>
                      {(skill) => {
                        const label = humanizeSkill(skill.name) || skill.name;
                        const description = skill.description?.trim();
                        const trigger = skill.trigger?.trim();
                        const subtitle = trigger || description;
                        return (
                          <div class="flex items-start gap-2 text-xs text-gray-11">
                            <Package size={12} class="text-gray-9 mt-0.5" />
                            <div class="min-w-0">
                              <div class="truncate">{label}</div>
                              <Show when={subtitle}>
                                <div class="text-[11px] text-gray-9 truncate" title={subtitle}>
                                  {subtitle}
                                </div>
                              </Show>
                            </div>
                          </div>
                        );
                      }}
                    </For>
                  </Show>
                </div>
              </div>
            </Show>
          </div>

          <div class="rounded-2xl border border-gray-6 bg-gray-2/30">
            <button
              class="w-full px-4 py-3 flex items-center justify-between text-sm text-gray-12 font-medium"
              onClick={() => props.onToggleSection("authorizedFolders")}
            >
              <span>已授权文件夹</span>
              <ChevronDown
                size={16}
                class={`transition-transform text-gray-10 ${
                  props.expandedSections.authorizedFolders ? "rotate-180" : ""
                }`.trim()}
              />
            </button>
            <Show when={props.expandedSections.authorizedFolders}>
              <div class="px-4 pb-4 pt-1">
                <div class="space-y-2">
                  <Show
                    when={props.authorizedDirs.length}
                  fallback={<div class="text-xs text-gray-9">暂无。</div>}
                  >
                    <For each={props.authorizedDirs.slice(0, 3)}>
                      {(folder) => (
                        <div class="flex items-center gap-2 text-xs text-gray-11">
                          <Folder size={12} class="text-gray-9" />
                          <span class="truncate" title={folder}>
                            {folder.split(/[/\\]/).pop()}
                          </span>
                        </div>
                      )}
                    </For>
                  </Show>
                </div>
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
}
