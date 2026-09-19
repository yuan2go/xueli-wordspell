import { SENTENCE_AUDIO } from "../content/sentences.ts";
import { AUDIO } from "../content/manifest.ts";
import { matchesFormat } from "../content/resource-contract.ts";
import type { AudioObservation, AudioStatus } from "../game/audio-evidence.ts";
import { localId } from "./id.ts";
/** One cancellable channel for tasks, result words and recap. Never a judge. */
export class StoryAudio {
  volume = 0.8;
  muted = false;
  private unlocked = false;
  private cancel?: () => void;
  unlock() {
    this.unlocked = true;
  }
  stop() {
    this.cancel?.();
    this.cancel = undefined;
  }
  play(
    text: string,
    report: (message: string) => void,
    binding?: {
      stepId: string;
      purpose: "task" | "success";
      eventId: string;
      observe: (o: AudioObservation) => void;
    },
    timeoutMs = 8000,
    settled?: (status: AudioStatus) => void,
  ) {
    this.stop();
    const asset =
      AUDIO.find((a) => a.text === text) ??
      SENTENCE_AUDIO.find((a) => a.text === text);
    const source = asset?.path
      ? "recording"
      : "speechSynthesis" in window
        ? "development-speech"
        : "unavailable";
    const requestId = localId();
    let finished = false;
    let element: HTMLAudioElement | undefined;
    let url: string | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const emit = (status: AudioStatus, message: string) => {
      if (finished) return;
      report(message);
      if (asset && binding)
        binding.observe({
          requestId,
          assetId: asset.id,
          version: asset.version,
          stepId: binding.stepId,
          purpose: binding.purpose,
          eventId: binding.eventId,
          status,
          source,
        });
    };
    const end = (status: AudioStatus, message: string) => {
      if (finished) return;
      emit(status, message);
      finished = true;
      clearTimeout(timer);
      controller.abort();
      if (element) {
        element.onended = null;
        element.onerror = null;
        element.pause();
      }
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      if (url) URL.revokeObjectURL(url);
      settled?.(status);
    };
    this.cancel = () => end("cancelled", "播放已停止；可重听任务。");
    if (this.muted || this.volume === 0) {
      end("muted", "当前已静音，可调高音量或使用文字辅助。");
      return;
    }
    if (!asset || !this.unlocked || source === "unavailable") {
      end("failed", "语音无法播放，请重试或使用文字辅助。");
      return;
    }
    emit(
      "loading",
      asset.path ? "正在加载录音…" : "正在准备开发语音（未审核）…",
    );
    timer = setTimeout(
      () => end("failed", "语音响应超时，请重试或使用文字辅助。"),
      timeoutMs,
    );
    const failed = () => end("failed", "语音播放失败，请重试或使用文字辅助。");
    const playing = () =>
      emit(
        "playing",
        asset.path
          ? asset.review === "APPROVED"
            ? "正在播放已审核录音"
            : "正在播放待审核录音"
          : "正在播放开发语音（未审核）",
      );
    const complete = () =>
      end(
        "completed",
        asset.path
          ? "录音播放完成，可以重听。"
          : "可以重听；开发语音未经教学审核。",
      );
    if (asset.path) {
      void (async () => {
        try {
          const response = await fetch(
            `${import.meta.env?.BASE_URL ?? "/"}${asset.path}`,
            { signal: controller.signal },
          );
          if (!response.ok) throw new Error("HTTP");
          const data = await response.arrayBuffer();
          if (
            data.byteLength !== asset.bytes ||
            !matchesFormat(new Uint8Array(data), asset.type)
          )
            throw new Error("format");
          if (crypto.subtle) {
            const hash = [
              ...new Uint8Array(await crypto.subtle.digest("SHA-256", data)),
            ]
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("");
            if (hash !== asset.sha256) throw new Error("hash");
          }
          if (finished) return;
          url = URL.createObjectURL(new Blob([data], { type: asset.type }));
          element = new Audio(url);
          element.volume = this.volume;
          element.onerror = failed;
          element.onended = complete;
          await element.play();
          if (!finished) playing();
        } catch {
          if (!finished) failed();
        }
      })();
    } else {
      const speech = new SpeechSynthesisUtterance(text);
      speech.lang = asset.locale;
      speech.rate = 0.8;
      speech.volume = this.volume;
      speech.onstart = playing;
      speech.onend = complete;
      speech.onerror = failed;
      try {
        window.speechSynthesis.speak(speech);
      } catch {
        failed();
      }
    }
  }
}
