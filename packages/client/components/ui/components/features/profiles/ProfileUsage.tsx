import { For, Show, createSignal, onCleanup } from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";

import { styled } from "styled-system/jsx";

import { Text } from "../../design";

import { ProfileCard } from "./ProfileCard";

/**
 * One usage window, either a provider quota (percent + reset) or one of the
 * bot's own consumption windows (tokens/calls/spend).
 */
export interface UsageWindow {
  label: string;
  period?: string;
  used_percent?: number;
  resets_at?: string;
  detail?: string;
  tokens?: number;
  calls?: number;
  cost_cents?: number;
}

/**
 * Usage limits a bot publishes for the inference account it runs on.
 */
export interface BotUsage {
  provider: string;
  model?: string;
  plan?: string;
  updated_at: string;
  windows?: UsageWindow[];
  local?: UsageWindow[];
  notes?: string[];
}

interface Props {
  usage: BotUsage;
  full?: boolean;
}

function formatTokens(value?: number) {
  if (value === undefined || value === null) return undefined;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return `${value}`;
}

/** "2d 7h" / "3h 12m" / "now" until an instant. */
function timeUntil(iso?: string, now = Date.now()) {
  if (!iso) return undefined;
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return undefined;
  const diff = ts - now;
  if (diff <= 0) return "now";
  const mins = Math.max(1, Math.round(diff / 60_000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

/** Localised absolute stamp for the reset instant. */
function stamp(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function barColor(used?: number) {
  if (used === undefined) return "var(--md-sys-color-outline)";
  if (used >= 90) return "var(--md-sys-color-error)";
  if (used >= 70) return "var(--md-sys-color-tertiary)";
  return "var(--md-sys-color-primary)";
}

/**
 * Provider usage limits (daily / weekly / monthly windows and when each
 * resets) for a bot's own account, as published by the bot itself.
 */
export function ProfileUsage(props: Props) {
  // Reset countdowns go stale while the profile stays open.
  const [now, setNow] = createSignal(Date.now());
  const timer = setInterval(() => setNow(Date.now()), 30_000);
  onCleanup(() => clearInterval(timer));

  const windows = () => props.usage.windows ?? [];
  const local = () => props.usage.local ?? [];
  const notes = () => props.usage.notes ?? [];

  return (
    <ProfileCard width={props.full ? 3 : 2} constraint={props.full ? undefined : "half"}>
      <Text class="title" size="large">
        <Trans>Limits</Trans>
      </Text>

      <Text class="label">
        {props.usage.provider}
        <Show when={props.usage.plan}> · {props.usage.plan}</Show>
        <Show when={props.usage.model}> · {props.usage.model}</Show>
      </Text>

      <Show when={windows().length > 0} fallback={null}>
        <Rows>
          <For each={windows()}>
            {(window) => (
              <Row>
                <RowHead>
                  <Text>{window.label}</Text>
                  <Text class="label">
                    <Show
                      when={window.used_percent !== undefined}
                      fallback={<Trans>unavailable</Trans>}
                    >
                      {100 - (window.used_percent ?? 0)}% left · {window.used_percent}% used
                    </Show>
                  </Text>
                </RowHead>
                <Show when={window.used_percent !== undefined}>
                  <Bar>
                    <Fill
                      style={{
                        width: `${Math.min(100, Math.max(0, window.used_percent ?? 0))}%`,
                        background: barColor(window.used_percent),
                      }}
                    />
                  </Bar>
                </Show>
                <Show when={window.resets_at || window.detail}>
                  <Text class="label">
                    <Show when={window.resets_at}>
                      <Trans>resets in</Trans> {timeUntil(window.resets_at, now())} ·{" "}
                      {stamp(window.resets_at)}
                    </Show>
                    <Show when={!window.resets_at && window.detail}>
                      {window.detail}
                    </Show>
                  </Text>
                </Show>
              </Row>
            )}
          </For>
        </Rows>
      </Show>

      <Show when={local().length > 0}>
        <Text class="label">
          <Trans>This bot</Trans>
        </Text>
        <Rows>
          <For each={local()}>
            {(window) => (
              <Text class="label">
                {window.label}: {window.calls ?? 0} calls · {formatTokens(window.tokens) ?? "0"} tok
                <Show when={window.cost_cents}>
                  {" "}
                  · ${((window.cost_cents ?? 0) / 100).toFixed(2)}
                </Show>
              </Text>
            )}
          </For>
        </Rows>
      </Show>

      <For each={notes()}>{(note) => <Text class="label">{note}</Text>}</For>

      <Text class="label">
        <Trans>updated</Trans> {timeUntil(props.usage.updated_at, now()) ?? "unknown"}{" "}
        <Trans>ago</Trans>
      </Text>
    </ProfileCard>
  );
}

const Rows = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--gap-sm)",
    userSelect: "text",
  },
});

const Row = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
});

const RowHead = styled("div", {
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "var(--gap-sm)",
    minWidth: 0,
  },
});

const Bar = styled("div", {
  base: {
    height: "6px",
    width: "100%",
    borderRadius: "999px",
    overflow: "hidden",
    background: "var(--md-sys-color-surface-container-highest)",
  },
});

const Fill = styled("div", {
  base: {
    height: "100%",
    borderRadius: "999px",
    transition: "width .3s ease",
  },
});
