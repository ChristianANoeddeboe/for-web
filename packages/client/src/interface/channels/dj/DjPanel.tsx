import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";

import { useLingui } from "@lingui-solid/solid/macro";
import type { Channel, DjTrack } from "stoat.js";
import { djVotesNeeded } from "stoat.js";
import { styled } from "styled-system/jsx";

import { useClient } from "@revolt/client";
import { Button, IconButton, Text } from "@revolt/ui";
import { Symbol } from "@revolt/ui/components/utils/Symbol";

import { DjAudio } from "./DjAudio";
import { DjSettingsPanel } from "./DjSettingsPanel";

/**
 * How often the local progress indicator is refreshed, in milliseconds
 */
const PROGRESS_INTERVAL = 250;

/**
 * Format a duration in milliseconds as `m:ss`, or `h:mm:ss`
 */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

interface Props {
  /**
   * DJ channel to display
   */
  channel: Channel;

  /**
   * Audio player owned by the channel view
   */
  audio: DjAudio;
}

/**
 * DJ channel panel: now playing, queue, membership and settings
 */
export function DjPanel(props: Props) {
  const { t } = useLingui();
  const client = useClient();

  const state = () => props.channel.djState;
  const settings = () => state()?.settings ?? props.channel.dj;
  const joined = () => props.channel.djJoined;
  const current = () => state()?.current;
  const queue = () => state()?.queue ?? [];
  const members = () => state()?.members ?? [];

  const [error, setError] = createSignal<string>();
  const [busy, setBusy] = createSignal(false);
  const [showSettings, setShowSettings] = createSignal(false);
  const [position, setPosition] = createSignal(0);

  const canManage = () => !!props.channel.havePermission("ManageChannel");
  const canConnect = () => !!props.channel.havePermission("Connect");
  const active = () => !!settings()?.enabled;

  const votesNeeded = createMemo(() =>
    djVotesNeeded(members().length, settings()?.skipThreshold ?? 0.5),
  );

  /**
   * Follow the server's playback position for the progress indicator
   */
  onMount(() => {
    const timer = setInterval(
      () => setPosition(props.audio.positionMs),
      PROGRESS_INTERVAL,
    );
    onCleanup(() => clearInterval(timer));
  });

  /**
   * Drive the audio element from the state the SDK keeps
   *
   * A heartbeat re-sends the same track at a new position with a fresh signed
   * URL: that must resync, not restart.
   */
  let playingTrack: string | undefined;

  createEffect(() => {
    const snapshot = state();
    const playing = snapshot?.current;

    if (!snapshot?.signedUrl || !playing) {
      if (playingTrack) {
        playingTrack = undefined;
        props.audio.stop();
        setPosition(0);
      }
      return;
    }

    // Time the position was measured at, advanced by the time since we got it
    const elapsed = Date.now() - (snapshot.signedUrlReceivedAt ?? Date.now());
    const target = snapshot.positionMs + Math.max(0, elapsed);

    if (playing.track.id !== playingTrack) {
      playingTrack = playing.track.id;
      props.audio.play(snapshot.signedUrl, target);
    } else {
      props.audio.seek(target);
    }
  });

  onCleanup(() => props.audio.stop());

  /**
   * Surface upload failures reported by the server
   */
  createEffect(() => {
    const channel = client();
    const onUploadFailed = (_channel: Channel, reason: string) =>
      setError(reason || t`Upload failed`);

    channel.on("djUploadFailed", onUploadFailed);
    onCleanup(() => channel.off("djUploadFailed", onUploadFailed));
  });

  /**
   * Run an action, showing the server's error if it fails
   */
  async function run(action: () => Promise<unknown>) {
    if (busy()) return;
    setBusy(true);
    setError(undefined);

    try {
      await action();
    } catch (err) {
      setError(parseError(err));
    } finally {
      setBusy(false);
    }
  }

  /**
   * Join the channel, unlocking audio inside the click handler
   */
  function join() {
    // Must happen synchronously: the browser only grants playback to an
    // element started from a user gesture
    props.audio.unlock();
    void run(() => props.channel.djJoin());
  }

  function leave() {
    void run(async () => {
      props.audio.stop();
      await props.channel.djLeave();
    });
  }

  return (
    <Panel>
      <HeaderRow>
        <Symbol size={20}>headphones</Symbol>
        <Text class="label" size="large">
          {t`DJ`}
        </Text>
        <Show when={members().length > 0}>
          <Text class="label" size="small">
            {t`${members().length} listening`}
          </Text>
        </Show>

        <Spacer />

        <Show when={canManage()}>
          <IconButton
            size="sm"
            variant="standard"
            onPress={() => setShowSettings((open) => !open)}
            aria-label={t`DJ settings`}
          >
            <Symbol size={18}>settings</Symbol>
          </IconButton>
        </Show>

        <Show
          when={joined() && active()}
          fallback={
            <Show when={active() && canConnect()}>
              <Button
                size="sm"
                variant="filled"
                isDisabled={busy()}
                onPress={join}
              >
                {t`Join`}
              </Button>
            </Show>
          }
        >
          <Button size="sm" variant="tonal" isDisabled={busy()} onPress={leave}>
            {t`Leave`}
          </Button>
        </Show>
      </HeaderRow>

      <Show when={error()}>
        <ErrorText>{error()}</ErrorText>
      </Show>

      <Show when={showSettings() && canManage()}>
        <DjSettingsPanel channel={props.channel} />
      </Show>

      <NowPlaying>
        <Show
          when={current()}
          fallback={
            <Text class="label" size="small">
              {!active()
                ? t`The DJ is disabled on this channel`
                : joined()
                  ? t`Nothing playing`
                  : t`Join to listen along`}
            </Text>
          }
        >
          {(playing) => (
            <>
              <Row>
                <Symbol size={18}>music_note</Symbol>
                <div style={{ "min-width": 0 }}>
                  <NowTitle>
                    {playing().track.title || t`Untitled track`}
                  </NowTitle>
                  <Text class="label" size="small">
                    {uploaderName(playing().track)}
                  </Text>
                </div>
                <Spacer />
                <Show when={joined()}>
                  <Button
                    size="sm"
                    variant="text"
                    isDisabled={busy()}
                    onPress={() => void run(() => props.channel.djSkip())}
                  >
                    {t`Skip`}
                  </Button>
                </Show>
              </Row>

              <ProgressTrack>
                <ProgressFill
                  style={{
                    width: `${Math.min(
                      100,
                      (position() / Math.max(1, playing().track.durationMs)) *
                        100,
                    )}%`,
                  }}
                />
              </ProgressTrack>

              <Row>
                <Text class="label" size="small">
                  {formatDuration(position())} /{" "}
                  {formatDuration(playing().track.durationMs)}
                </Text>
                <Spacer />
                <Show when={joined() && (state()?.votes ?? 0) > 0}>
                  <Text class="label" size="small">
                    {t`Skip ${state()!.votes}/${votesNeeded()}`}
                  </Text>
                </Show>
              </Row>
            </>
          )}
        </Show>
      </NowPlaying>

      <Show when={queue().length > 0}>
        <Queue>
          <Text class="label" size="small">
            {t`Up next`}
          </Text>
          <For each={queue()}>
            {(track, index) => (
              <QueueRow>
                <Text class="label" size="small">
                  {index() + 1}.
                </Text>
                <QueueTitle>{track.title || t`Untitled track`}</QueueTitle>
                <Text class="label" size="small">
                  {formatDuration(track.durationMs)}
                </Text>
              </QueueRow>
            )}
          </For>
        </Queue>
      </Show>
    </Panel>
  );

  /**
   * Resolve the display name of the user who uploaded a track
   */
  function uploaderName(track: DjTrack): string {
    const user = client().users.get(track.uploader);

    return user ? (user.displayName ?? user.username) : t`Unknown uploader`;
  }
}

/**
 * Parse an API error body into a message
 */
const DJ_ERROR_MESSAGES: Record<string, string> = {
  FileTooLarge: "That file is larger than this channel allows.",
  FileTooSmall: "That file is empty.",
  DjTranscodeFailed: "The server could not convert that file to audio.",
  DjUnavailable: "Audio processing is unavailable on this server.",
  NotInDjChannel: "Join the channel before adding music.",
  NotADjChannel: "This channel is not a DJ channel.",
  DjDisabled: "DJ is disabled on this channel.",
  CannotJoinDjChannel: "This DJ channel is full.",
  InvalidDjToken: "The stream link expired. Rejoin the channel.",
  CannotSendMessageToDjChannel: "This is a DJ channel. Add a track instead.",
  DjYoutubeUnsupported:
    "That link is not a single YouTube video. Paste a video link, not a playlist.",
  DjYoutubeFailed: "That video could not be downloaded. Try again or upload a file.",
  DjYoutubeUnavailable: "YouTube links are unavailable on this server.",
  DjTrackTooLong: "That track is longer than this channel allows.",
  DjUploadLimit: "You already have the maximum number of tracks queued.",
  DjQueueFull: "The queue is full. Try again once it has played.",
  DjStorageFull: "This channel has no storage left.",
};

export function parseError(err: unknown): string {
  const raw =
    typeof err === "string"
      ? err
      : err instanceof Error
        ? err.message
        : String(err);

  try {
    const parsed = JSON.parse(raw) as { type?: string; message?: string };
    if (parsed.type) {
      return DJ_ERROR_MESSAGES[parsed.type] ?? parsed.type;
    }
    if (parsed.message) return parsed.message;
  } catch {
    // not JSON
  }

  // Never render a proxy/server HTML error page (e.g. a 413) as chat text.
  if (/<[a-z][\s\S]*>/i.test(raw)) {
    return "The upload failed. The file may be too large.";
  }

  // A fetch or gateway failure (502/503) has no JSON body at all
  if (!raw.trim()) {
    return "The server could not process that request. Try again.";
  }

  return raw;
}

const Panel = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    margin: "0 16px 8px",
    padding: "10px 12px",
    borderRadius: "var(--borderRadius-lg)",
    background: "var(--md-sys-color-surface-container)",
  },
});

const HeaderRow = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
});

const Row = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minWidth: 0,
  },
});

const Spacer = styled("div", {
  base: {
    flexGrow: 1,
  },
});

const NowPlaying = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    padding: "8px",
    borderRadius: "var(--borderRadius-md)",
    background: "var(--md-sys-color-surface-container-high)",
  },
});

const NowTitle = styled("div", {
  base: {
    fontWeight: "600",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
});

const ProgressTrack = styled("div", {
  base: {
    height: "4px",
    width: "100%",
    borderRadius: "2px",
    overflow: "hidden",
    background: "var(--md-sys-color-surface-variant)",
  },
});

const ProgressFill = styled("div", {
  base: {
    height: "100%",
    background: "var(--md-sys-color-primary)",
    transition: "width 0.25s linear",
  },
});

const Queue = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    maxHeight: "160px",
    overflowY: "auto",
  },
});

const QueueRow = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minWidth: 0,
  },
});

const QueueTitle = styled("div", {
  base: {
    flexGrow: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "0.875rem",
  },
});

const ErrorText = styled("div", {
  base: {
    color: "var(--md-sys-color-error)",
    fontSize: "0.8125rem",
  },
});
