import { createEffect, createSignal, Show } from "solid-js";
import { X } from "lucide-solid";
import Button from "./button";
import TextInput from "./text-input";

export type AddProviderModalProps = {
  open: boolean;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (config: {
    providerId: string;
    providerName: string;
    baseURL: string;
    modelId: string;
    modelName: string;
    apiKey: string;
    contextLimit: number;
    outputLimit: number;
  }) => Promise<void>;
};

export default function AddProviderModal(props: AddProviderModalProps) {
  const [providerId, setProviderId] = createSignal("");
  const [providerName, setProviderName] = createSignal("");
  const [baseURL, setBaseURL] = createSignal("");
  const [modelId, setModelId] = createSignal("");
  const [modelName, setModelName] = createSignal("");
  const [apiKey, setApiKey] = createSignal("");
  const [contextLimit, setContextLimit] = createSignal("32768");
  const [outputLimit, setOutputLimit] = createSignal("4000");
  const [localError, setLocalError] = createSignal<string | null>(null);
  const [submitting, setSubmitting] = createSignal(false);

  const resetForm = () => {
    setProviderId("");
    setProviderName("");
    setBaseURL("");
    setModelId("");
    setModelName("");
    setApiKey("");
    setContextLimit("32768");
    setOutputLimit("4000");
    setLocalError(null);
  };

  createEffect(() => {
    if (!props.open) {
      resetForm();
    }
  });

  const validateForm = () => {
    if (!providerId().trim()) {
      setLocalError("提供商 ID 不能为空");
      return false;
    }
    if (!providerName().trim()) {
      setLocalError("提供商名称不能为空");
      return false;
    }
    if (!baseURL().trim()) {
      setLocalError("API 基础地址不能为空");
      return false;
    }
    if (!modelId().trim()) {
      setLocalError("模型 ID 不能为空");
      return false;
    }
    if (!modelName().trim()) {
      setLocalError("模型名称不能为空");
      return false;
    }
    if (!apiKey().trim()) {
      setLocalError("API Key 不能为空");
      return false;
    }
    const ctx = parseInt(contextLimit().trim(), 10);
    if (isNaN(ctx) || ctx <= 0) {
      setLocalError("上下文长度必须是正整数");
      return false;
    }
    const out = parseInt(outputLimit().trim(), 10);
    if (isNaN(out) || out <= 0) {
      setLocalError("最大输出长度必须是正整数");
      return false;
    }
    if (out >= ctx) {
      setLocalError("最大输出长度必须小于上下文长度");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setLocalError(null);
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      await props.onSubmit({
        providerId: providerId().trim(),
        providerName: providerName().trim(),
        baseURL: baseURL().trim(),
        modelId: modelId().trim(),
        modelName: modelName().trim(),
        apiKey: apiKey().trim(),
        contextLimit: parseInt(contextLimit().trim(), 10),
        outputLimit: parseInt(outputLimit().trim(), 10),
      });
      resetForm();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setLocalError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const errorMessage = () => localError() ?? props.error;
  const isDisabled = () => props.loading || submitting();

  return (
    <Show when={props.open}>
      <div class="fixed inset-0 z-50 bg-gray-1/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
        <div class="bg-gray-2 border border-gray-6/70 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[calc(100vh-2rem)] flex flex-col my-8">
          {/* Header */}
          <div class="px-6 pt-6 pb-4 border-b border-gray-6/50 flex items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-semibold text-gray-12">添加自定义模型提供商</h3>
              <p class="text-sm text-gray-11 mt-1">配置 OpenAI 兼容的自定义模型端点</p>
            </div>
            <Button
              variant="ghost"
              class="!p-2 rounded-full"
              onClick={() => props.onClose()}
              disabled={isDisabled()}
              aria-label="Close"
            >
              <X size={16} />
            </Button>
          </div>

          {/* Content */}
          <div class="px-6 py-4 flex flex-col gap-4 overflow-y-auto">
            {/* Error Message */}
            <Show when={errorMessage()}>
              <div class="rounded-xl border border-red-7/30 bg-red-1/40 px-3 py-2 text-xs text-red-11">
                {errorMessage()}
              </div>
            </Show>

            {/* Provider ID */}
            <TextInput
              label="提供商 ID"
              value={providerId()}
              onInput={(e) => setProviderId(e.currentTarget.value)}
              placeholder="例: my-custom-llm"
              disabled={isDisabled()}
              hint="用于标识提供商的唯一标识符，使用小写字母和连字符"
            />

            {/* Provider Name */}
            <TextInput
              label="提供商名称"
              value={providerName()}
              onInput={(e) => setProviderName(e.currentTarget.value)}
              placeholder="例: My Custom LLM"
              disabled={isDisabled()}
              hint="用户界面中显示的提供商名称"
            />

            {/* Base URL */}
            <TextInput
              label="API 基础地址"
              value={baseURL()}
              onInput={(e) => setBaseURL(e.currentTarget.value)}
              placeholder="例: http://your-server.com/v1"
              disabled={isDisabled()}
              hint="OpenAI 兼容的 API 基础地址，需要包含完整路径到 /v1"
            />

            {/* Model ID */}
            <TextInput
              label="模型 ID"
              value={modelId()}
              onInput={(e) => setModelId(e.currentTarget.value)}
              placeholder="例: qwen3-coder-30b-a3b-instruct"
              disabled={isDisabled()}
              hint="模型的唯一标识符，应与 API 端点中的模型名称匹配"
            />

            {/* Model Name */}
            <TextInput
              label="模型名称"
              value={modelName()}
              onInput={(e) => setModelName(e.currentTarget.value)}
              placeholder="例: Qwen3 Coder 30B"
              disabled={isDisabled()}
              hint="用户界面中显示的模型名称"
            />

            {/* API Key */}
            <TextInput
              label="API Key"
              type="password"
              value={apiKey()}
              onInput={(e) => setApiKey(e.currentTarget.value)}
              placeholder="例: sk-..."
              disabled={isDisabled()}
              hint="该密钥将被存储在配置文件中"
            />

            {/* Token Limits */}
            <div class="border-t border-gray-6/30 pt-4 mt-1">
              <p class="text-xs text-gray-10 mb-3">模型 Token 限制（影响请求的上下文窗口和最大输出）</p>
              <div class="grid grid-cols-2 gap-3">
                <TextInput
                  label="上下文长度"
                  type="number"
                  value={contextLimit()}
                  onInput={(e) => setContextLimit(e.currentTarget.value)}
                  placeholder="32768"
                  disabled={isDisabled()}
                  hint="模型最大上下文 token 数"
                />
                <TextInput
                  label="最大输出长度"
                  type="number"
                  value={outputLimit()}
                  onInput={(e) => setOutputLimit(e.currentTarget.value)}
                  placeholder="4000"
                  disabled={isDisabled()}
                  hint="单次回复最大 token 数"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div class="px-6 pt-4 pb-6 border-t border-gray-6/50 flex flex-col gap-3">
            <div class="text-[11px] text-gray-8">
              配置将保存到工作区和全局的 <span class="font-mono">opencode.jsonc</span>，重启 OpenCode 后生效。
            </div>
            <div class="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => props.onClose()}
                disabled={isDisabled()}
              >
                取消
              </Button>
              <Button
                variant="secondary"
                onClick={handleSubmit}
                disabled={isDisabled()}
              >
                {submitting() ? "保存中..." : "保存配置"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
}
