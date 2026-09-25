import { For } from "solid-js";

import { useLingui } from "@lingui-solid/solid/macro";
import { AUTO_ARCHIVE_MINUTES } from "stoat.js";

import { MenuItem } from "@revolt/ui";

/**
 * Slowmode options in seconds
 */
const SLOWMODE_SECONDS = [
  0, 5, 10, 30, 60, 300, 600, 1800, 3600, 7200, 21600,
] as const;

/**
 * Menu items for picking a slowmode
 */
export function SlowmodeOptions() {
  const { t } = useLingui();

  const labels: Record<(typeof SLOWMODE_SECONDS)[number], string> = {
    0: t`Slowmode off`,
    5: t`5 seconds`,
    10: t`10 seconds`,
    30: t`30 seconds`,
    60: t`1 minute`,
    300: t`5 minutes`,
    600: t`10 minutes`,
    1800: t`30 minutes`,
    3600: t`1 hour`,
    7200: t`2 hours`,
    21600: t`6 hours`,
  };

  return (
    <For each={SLOWMODE_SECONDS}>
      {(value) => <MenuItem value={String(value)}>{labels[value]}</MenuItem>}
    </For>
  );
}

/**
 * Menu items for picking an auto archive duration
 */
export function AutoArchiveOptions() {
  const { t } = useLingui();

  const labels: Record<(typeof AUTO_ARCHIVE_MINUTES)[number], string> = {
    60: t`1 hour`,
    1440: t`24 hours`,
    4320: t`3 days`,
    10080: t`1 week`,
  };

  return (
    <For each={AUTO_ARCHIVE_MINUTES}>
      {(value) => <MenuItem value={String(value)}>{labels[value]}</MenuItem>}
    </For>
  );
}
