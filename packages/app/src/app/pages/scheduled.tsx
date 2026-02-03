import { For, Show, createMemo, createSignal } from "solid-js";

import type { ScheduledJob } from "../types";
import { formatRelativeTime, isTauriRuntime } from "../utils";

import Button from "../components/button";
import {
  Calendar,
  Clock,
  FolderOpen,
  RefreshCw,
  Terminal,
  Trash2,
} from "lucide-solid";

export type ScheduledTasksViewProps = {
  jobs: ScheduledJob[];
  source: "local" | "remote";
  sourceReady: boolean;
  status: string | null;
  busy: boolean;
  lastUpdatedAt: number | null;
  refreshJobs: (options?: { force?: boolean }) => void;
  deleteJob: (name: string) => Promise<void> | void;
  isWindows: boolean;
};

const toRelative = (value?: string | null) => {
  if (!value) return "从未";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "从未";
  return formatRelativeTime(parsed);
};

const taskSummary = (job: ScheduledJob) => {
  const run = job.run;
  if (run?.command) {
    const args = run.arguments ? ` ${run.arguments}` : "";
    return { label: "命令", value: `${run.command}${args}`, mono: true };
  }
  const prompt = run?.prompt ?? job.prompt;
  if (prompt) {
    return { label: "提示", value: prompt, mono: false };
  }
  return { label: "任务", value: "未找到提示或命令", mono: false };
};

const statusLabel = (status?: string | null) => {
  if (!status) return "尚未运行";
  if (status === "running") return "运行中";
  if (status === "success") return "成功";
  if (status === "failed") return "失败";
  return status;
};

const statusTone = (status?: string | null) => {
  if (status === "success") return "border-emerald-7/50 bg-emerald-4/20 text-emerald-11";
  if (status === "failed") return "border-red-7/50 bg-red-4/20 text-red-11";
  if (status === "running") return "border-amber-7/50 bg-amber-4/20 text-amber-11";
  return "border-gray-6/60 bg-gray-2/40 text-gray-11";
};

export default function ScheduledTasksView(props: ScheduledTasksViewProps) {
  const supported = createMemo(() => {
    if (props.source === "remote") return props.sourceReady;
    return isTauriRuntime() && !props.isWindows;
  });
  const supportNote = createMemo(() => {
    if (props.source === "remote") {
      return props.sourceReady ? null : "CMBCowork 服务器不可用。连接以同步定时任务。";
    }
    if (!isTauriRuntime()) return "定时任务需要桌面应用。";
    if (props.isWindows) return "Windows 暂不支持调度器。";
    return null;
  });
  const sourceDescription = createMemo(() =>
    props.source === "remote"
      ? "从连接的 CMBCowork 服务器按计划运行的自动化任务。"
      : "从此设备按计划运行的自动化任务。"
  );
  const sourceLabel = createMemo(() =>
    props.source === "remote" ? "来自 CMBCowork 服务器" : "来自本地调度器"
  );
  const schedulerLabel = createMemo(() => (props.source === "remote" ? "CMBCowork 服务器" : "本地"));
  const schedulerHint = createMemo(() =>
    props.source === "remote" ? "远程实例" : "Launchd 或 systemd"
  );
  const schedulerUnavailableHint = createMemo(() =>
    props.source === "remote" ? "CMBCowork 服务器不可用" : "仅桌面应用"
  );
  const deleteDescription = createMemo(() =>
    props.source === "remote"
      ? "这将移除计划并从连接的 CMBCowork 服务器删除任务定义。"
      : "这将移除计划并从你的机器删除任务定义。"
  );

  const lastUpdatedLabel = createMemo(() => {
    if (!props.lastUpdatedAt) return "尚未同步";
    return formatRelativeTime(props.lastUpdatedAt);
  });

  const [deleteTarget, setDeleteTarget] = createSignal<ScheduledJob | null>(null);
  const [deleteBusy, setDeleteBusy] = createSignal(false);
  const [deleteError, setDeleteError] = createSignal<string | null>(null);

  const confirmDelete = async () => {
    const target = deleteTarget();
    if (!target) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await props.deleteJob(target.slug);
      setDeleteTarget(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setDeleteError(message || "删除任务失败");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <section class="space-y-8">
      <div class="bg-gradient-to-r from-gray-2 to-gray-4 rounded-3xl p-1">
        <div class="bg-gray-1 rounded-[22px] p-6 md:p-8 space-y-6">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-semibold text-gray-12">定时任务</h3>
              <p class="text-sm text-gray-10 mt-1">
                {sourceDescription()}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => props.refreshJobs({ force: true })}
              disabled={!supported() || props.busy}
            >
              <RefreshCw size={16} />
              {props.busy ? "刷新中" : "刷新"}
            </Button>
          </div>

          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-2xl border border-gray-6/60 bg-gray-2/40 p-4">
              <div class="text-[11px] uppercase tracking-wider text-gray-10">
                定时任务
              </div>
              <div class="mt-2 text-2xl font-semibold text-gray-12">
                {props.jobs.length}
              </div>
              <div class="text-xs text-gray-9 mt-1">活跃计划</div>
            </div>
            <div class="rounded-2xl border border-gray-6/60 bg-gray-2/40 p-4">
              <div class="text-[11px] uppercase tracking-wider text-gray-10">
                上次同步
              </div>
              <div class="mt-2 text-lg font-semibold text-gray-12">
                {supported() ? lastUpdatedLabel() : "不可用"}
              </div>
              <div class="text-xs text-gray-9 mt-1">{sourceLabel()}</div>
            </div>
            <div class="rounded-2xl border border-gray-6/60 bg-gray-2/40 p-4">
              <div class="text-[11px] uppercase tracking-wider text-gray-10">调度器</div>
              <div class="mt-2 text-lg font-semibold text-gray-12">
                {supported() ? schedulerLabel() : "不可用"}
              </div>
              <div class="text-xs text-gray-9 mt-1">
                {supported() ? schedulerHint() : schedulerUnavailableHint()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Show when={supportNote()}>
        <div class="rounded-2xl border border-gray-6/60 bg-gray-2/40 px-5 py-4 text-sm text-gray-10">
          {supportNote()}
        </div>
      </Show>

      <Show when={props.status}>
        <div class="rounded-2xl border border-red-7/40 bg-red-4/10 px-5 py-4 text-sm text-red-11">
          {props.status}
        </div>
      </Show>

      <Show when={deleteError()}>
        <div class="rounded-2xl border border-red-7/40 bg-red-4/10 px-5 py-4 text-sm text-red-11">
          {deleteError()}
        </div>
      </Show>

      <div class="rounded-2xl border border-gray-6/60 bg-gray-1/40 overflow-hidden">
        <Show
          when={props.jobs.length}
          fallback={
            <div class="px-6 py-10 text-sm text-gray-10">
              暂无定时任务。添加 opencode-scheduler 插件并创建任务后，将显示在此处。
            </div>
          }
        >
          <div class="divide-y divide-gray-6/60">
            <For each={props.jobs}>
              {(job) => {
                const summary = () => taskSummary(job);
                return (
                  <div class="p-6 space-y-4">
                    <div class="flex flex-wrap items-start justify-between gap-4">
                      <div class="space-y-2">
                        <div class="flex items-center gap-2">
                          <Calendar size={16} class="text-gray-11" />
                          <div class="text-sm font-semibold text-gray-12">{job.name}</div>
                        </div>
                        <div class="text-xs text-gray-10">
                          Cron <span class="font-mono text-gray-12">{job.schedule}</span>
                        </div>
                        <div class="text-[11px] text-gray-7 font-mono">{job.slug}</div>
                      </div>
                      <div class="flex items-center gap-2">
                        <span
                          class={`px-2 py-1 rounded-full border text-[11px] font-medium ${statusTone(
                            job.lastRunStatus
                          )}`}
                        >
                          {statusLabel(job.lastRunStatus)}
                        </span>
                        <Button
                          variant="danger"
                          class="!px-3 !py-2 text-xs"
                          onClick={() => setDeleteTarget(job)}
                          disabled={!supported() || props.busy || deleteBusy()}
                        >
                          <Trash2 size={14} />
                          删除
                        </Button>
                      </div>
                    </div>

                    <div class="grid gap-3 md:grid-cols-2">
                      <div class="rounded-xl border border-gray-6/60 bg-gray-2/30 p-4 space-y-2">
                        <div class="text-[10px] uppercase tracking-wide text-gray-10">
                          {summary().label}
                        </div>
                        <div
                          class={`text-sm text-gray-12 break-words ${
                            summary().mono ? "font-mono" : ""
                          }`}
                        >
                          {summary().value}
                        </div>
                      </div>
                      <div class="rounded-xl border border-gray-6/60 bg-gray-2/30 p-4 space-y-2">
                        <div class="text-[10px] uppercase tracking-wide text-gray-10">运行上下文</div>
                        <div class="space-y-2 text-xs text-gray-10">
                          <div class="flex items-center gap-2">
                            <FolderOpen size={14} class="text-gray-9" />
                            <span class="font-mono text-gray-12 break-all">
                              {job.workdir ?? "默认"}
                            </span>
                          </div>
                          <Show when={job.run?.attachUrl ?? job.attachUrl}>
                            <div class="flex items-center gap-2">
                              <Terminal size={14} class="text-gray-9" />
                              <span class="font-mono text-gray-12 break-all">
                                {job.run?.attachUrl ?? job.attachUrl}
                              </span>
                            </div>
                          </Show>
                          <Show when={job.source}>
                            <div class="text-[11px] text-gray-9">来源: {job.source}</div>
                          </Show>
                        </div>
                      </div>
                    </div>

                    <div class="flex flex-wrap gap-4 text-xs text-gray-10">
                      <div class="flex items-center gap-1">
                        <Clock size={12} />
                        上次运行 {toRelative(job.lastRunAt)}
                      </div>
                      <div>创建于 {toRelative(job.createdAt)}</div>
                      <Show when={job.run?.agent}>
                        <div>代理 {job.run?.agent}</div>
                      </Show>
                      <Show when={job.run?.model}>
                        <div>模型 {job.run?.model}</div>
                      </Show>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
      </div>

      <Show when={deleteTarget()}>
        <div class="fixed inset-0 z-50 bg-gray-1/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-gray-2 border border-gray-6/70 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div class="p-6 space-y-4">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h3 class="text-lg font-semibold text-gray-12">删除定时任务？</h3>
                  <p class="text-sm text-gray-11 mt-1">
                    {deleteDescription()}
                  </p>
                </div>
              </div>
              <div class="rounded-xl bg-gray-1/20 border border-gray-6 p-3 text-xs text-gray-11 font-mono break-all">
                {deleteTarget()?.name}
              </div>
              <div class="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteBusy()}>
                  取消
                </Button>
                <Button variant="danger" onClick={confirmDelete} disabled={deleteBusy()}>
                  {deleteBusy() ? "删除中" : "删除"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </section>
  );
}
