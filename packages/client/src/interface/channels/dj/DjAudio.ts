/**
 * Audio playback for a DJ channel
 *
 * The server drives playback: it tells us which track is playing and at which
 * position (`position_ms` at `server_time`, re-sent on a 15 s heartbeat). This
 * class only follows that, seeking when it drifts more than 500 ms.
 */

/**
 * Maximum drift (ms) between the local element and the server before seeking
 */
const MAX_DRIFT_MS = 500;

/**
 * Browsers only allow playback which starts inside a user gesture, so the Join
 * click has to start the element before any await. A silent WAV gives it
 * something to play without needing a bundled asset.
 */
function silentWav(): string {
  const sampleRate = 8000;
  const samples = 400;
  const buffer = new ArrayBuffer(44 + samples);
  const view = new DataView(buffer);

  const write = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  write(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true); // byte rate
  view.setUint16(32, 1, true); // block align
  view.setUint16(34, 8, true); // bits per sample
  write(36, "data");
  view.setUint32(40, samples, true);

  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return `data:audio/wav;base64,${btoa(binary)}`;
}

/**
 * Player for a single DJ channel
 */
export class DjAudio {
  readonly #audio: HTMLAudioElement;
  #url?: string;
  #unlocked = false;

  constructor() {
    this.#audio = new Audio();
    this.#audio.preload = "auto";
    // Keep the element alive but silent until a track is selected
    this.#audio.volume = 1;

    // Attached (without controls) so playback is observable from the DOM and
    // the element is not garbage collected with the component's scope
    this.#audio.dataset.djPlayer = "";
    document.body?.appendChild(this.#audio);
  }

  /**
   * Whether playback was blocked by the autoplay policy
   */
  get blocked(): boolean {
    return !this.#unlocked;
  }

  /**
   * Playback position, in milliseconds
   */
  get positionMs(): number {
    return Math.round((this.#audio.currentTime || 0) * 1000);
  }

  /**
   * Whether the element is currently playing
   */
  get playing(): boolean {
    return !this.#audio.paused && !this.#audio.ended;
  }

  /**
   * Unlock the element for playback
   *
   * MUST be called synchronously from a user gesture handler (the Join click):
   * the `play()` promise is deliberately not awaited before returning.
   */
  unlock(): void {
    if (this.#unlocked) return;

    this.#audio.src = silentWav();
    const attempt = this.#audio.play();

    attempt
      ?.then(() => {
        this.#unlocked = true;
        this.#audio.pause();
        this.#audio.currentTime = 0;
      })
      .catch(() => {
        this.#unlocked = false;
      });
  }

  /**
   * Start (or continue) a track
   *
   * @param url Signed stream URL
   * @param positionMs Position the track should be at right now
   */
  play(url: string, positionMs: number): void {
    if (this.#url !== url) {
      this.#url = url;
      this.#audio.src = url;

      // Seeking before metadata is known is ignored by every browser
      const seek = () => this.seek(positionMs);
      this.#audio.addEventListener("loadedmetadata", seek, { once: true });
    } else {
      this.seek(positionMs);
    }

    void this.#audio.play().then(
      () => {
        this.#unlocked = true;
      },
      () => {
        // Autoplay was blocked: leave `blocked` set so the UI can prompt for a
        // tap, which will call `play` again from a gesture
        this.#unlocked = false;
      },
    );
  }

  /**
   * Seek to a position, if it differs from the current one by more than the
   * allowed drift
   *
   * @param positionMs Target position
   * @param force Seek regardless of drift
   */
  seek(positionMs: number, force = false): void {
    if (!Number.isFinite(positionMs) || positionMs < 0) return;
    if (this.#audio.readyState < 1) return;

    const duration = this.#audio.duration;
    const target = Number.isFinite(duration)
      ? Math.min(positionMs / 1000, duration)
      : positionMs / 1000;

    if (
      force ||
      Math.abs(target - this.#audio.currentTime) * 1000 > MAX_DRIFT_MS
    ) {
      this.#audio.currentTime = target;
    }
  }

  /**
   * Stop playback and drop the current source
   */
  stop(): void {
    this.#audio.pause();
    this.#audio.removeAttribute("src");
    this.#audio.load();
    this.#url = undefined;
  }

  /**
   * Release the element
   */
  destroy(): void {
    this.stop();
    this.#audio.remove();
  }
}
