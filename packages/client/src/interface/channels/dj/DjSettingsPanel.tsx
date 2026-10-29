import { For, Show, createSignal } from "solid-js";

import { useLingui } from "@lingui-solid/solid/macro";
import type { Channel } from "stoat.js";
import { styled } from "styled-system/jsx";

import { Button, Text, TextField } from "@revolt/ui";

import { parseError } from "./DjPanel";

interface Props {
  /**
   * DJ channel being edited
   */
  channel: Channel;
}

/**
 * DJ channel settings, only rendered for members with `ManageChannel`
 */
export function DjSettingsPanel(props: Props) {
  const { t } = useLingui();

  const settings = () => props.channel.djState?.settings ?? props.channel.dj;

  const [error, setError] = createSignal<string>();
  const [saved, setSaved] = createSignal(false);
  const [busy, setBusy] = createSignal(false);

  const [skipThreshold, setSkipThreshold] = createSignal(
    String(settings()?.skipThreshold ?? 0.5),
  );
  const [maxFileMb, setMaxFileMb] = createSignal(
    String(settings()?.maxFileMb ?? 50),
  );
  const [maxTrackSeconds, setMaxTrackSeconds] = createSignal(
    String(settings()?.maxTrackSeconds ?? 900),
  );
  const [maxTracks, setMaxTracks] = createSignal(
    String(settings()?.maxTracks ?? 100),
  );
  const [maxUsers, setMaxUsers] = createSignal(
    String(settings()?.maxUsers ?? 0),
  );

  async function run(action: () => Promise<unknown>) {
    if (busy()) return;
    setBusy(true);
    setError(undefined);
    setSaved(false);

    try {
      await action();
      setSaved(true);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setBusy(false);
    }
  }

  /**
   * Persist the fields
   *
   * Empty fields are left untouched rather than being sent as zero, and the
   * server validates every bound (`0.0..=1.0`, `1..=128` MB, ...).
   */
  function save() {
    void run(() =>
      props.channel.djEditSettings({
        skipThreshold: parseNumber(skipThreshold()),
        maxFileMb: parseNumber(maxFileMb()),
        maxTrackSeconds: parseNumber(maxTrackSeconds()),
        maxTracks: parseNumber(maxTracks()),
        maxUsers: parseNumber(maxUsers()),
      }),
    );
  }

  return (
    <Container>
      <Text class="label" size="small">
        {t`Only members with Manage Channel can change these`}
      </Text>

      <Show when={!props.channel.djEnabled}>
        <Text class="label" size="small">
          {t`Enable DJ to edit these settings`}
        </Text>
      </Show>

      <Grid>
        <For
          each={[
            {
              label: t`Skip threshold (0 - 1)`,
              value: skipThreshold,
              setValue: setSkipThreshold,
              step: "0.05",
            },
            {
              label: t`Max file size (MB)`,
              value: maxFileMb,
              setValue: setMaxFileMb,
              step: "1",
            },
            {
              label: t`Max track length (seconds)`,
              value: maxTrackSeconds,
              setValue: setMaxTrackSeconds,
              step: "5",
            },
            {
              label: t`Max queued tracks`,
              value: maxTracks,
              setValue: setMaxTracks,
              step: "1",
            },
            {
              label: t`Max listeners (0 = no limit)`,
              value: maxUsers,
              setValue: setMaxUsers,
              step: "1",
            },
          ]}
        >
          {(field) => (
            <TextField
              variant="outlined"
              type="number"
              label={field.label}
              value={field.value()}
              min={0}
              step={Number(field.step)}
              onInput={(e) => field.setValue(e.currentTarget.value)}
            />
          )}
        </For>
      </Grid>

      <Show when={error()}>
        <ErrorText>{error()}</ErrorText>
      </Show>
      <Show when={saved()}>
        <Text class="label" size="small">
          {t`Saved`}
        </Text>
      </Show>

      <Row>
        <Button
          size="sm"
          variant="filled"
          isDisabled={busy() || !props.channel.djEnabled}
          onPress={save}
        >
          {t`Save`}
        </Button>
        <Button
          size="sm"
          variant="tonal"
          isDisabled={busy()}
          onPress={() =>
            void run(() =>
              props.channel.djEnabled
                ? props.channel.djDisable()
                : props.channel.djEnable(),
            )
          }
        >
          {props.channel.djEnabled ? t`Disable DJ` : t`Enable DJ`}
        </Button>
      </Row>
    </Container>
  );
}

/**
 * Parse a numeric field, leaving it out when empty or invalid
 */
function parseNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const Container = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "8px",
    borderRadius: "var(--borderRadius-md)",
    border: "1px solid var(--md-sys-color-outline-variant)",
  },
});

const Grid = styled("div", {
  base: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "8px",
  },
});

const Row = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
});

const ErrorText = styled("div", {
  base: {
    color: "var(--md-sys-color-error)",
    fontSize: "0.8125rem",
  },
});
