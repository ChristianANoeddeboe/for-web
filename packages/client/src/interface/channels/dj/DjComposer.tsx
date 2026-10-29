import { Show, createSignal } from "solid-js";

import { useLingui } from "@lingui-solid/solid/macro";
import type { Channel } from "stoat.js";
import { styled } from "styled-system/jsx";

import { Button, IconButton, Text } from "@revolt/ui";
import { Symbol } from "@revolt/ui/components/utils/Symbol";

import { parseError } from "./DjPanel";

interface Props {
  /**
   * DJ channel to upload to
   */
  channel: Channel;
}

/**
 * Upload control which replaces the message composer on a DJ channel
 *
 * Posting messages is disabled server-side on a DJ channel, so the composer is
 * replaced rather than hidden.
 */
export function DjComposer(props: Props) {
  const { t } = useLingui();

  const [uploading, setUploading] = createSignal(false);
  const [error, setError] = createSignal<string>();

  let input: HTMLInputElement | undefined;

  const joined = () => props.channel.djJoined;

  const canUpload = () =>
    joined() && !!props.channel.havePermission("UploadFiles");

  /**
   * Queue every selected file, one request each
   */
  async function queue(files: FileList | null) {
    if (!files || files.length === 0 || uploading()) return;

    setUploading(true);
    setError(undefined);

    try {
      for (const file of Array.from(files)) {
        await props.channel.djQueue(file, file.name.replace(/\.[^.]+$/, ""));
      }
    } catch (err) {
      setError(parseError(err));
    } finally {
      setUploading(false);
      if (input) input.value = "";
    }
  }

  /**
   * Accept files dropped anywhere over the composer
   */
  function onDrop(event: DragEvent) {
    event.preventDefault();
    if (!canUpload()) return;
    void queue(event.dataTransfer?.files ?? null);
  }

  return (
    <Container onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
      <input
        ref={input}
        type="file"
        accept="audio/*"
        multiple
        style={{ display: "none" }}
        onChange={(event) => void queue(event.currentTarget.files)}
      />

      <Row>
        <IconButton
          size="sm"
          variant={canUpload() ? "filled" : "standard"}
          isDisabled={!canUpload() || uploading()}
          onPress={() => input?.click()}
          aria-label={t`Add track to queue`}
        >
          <Symbol>{uploading() ? "hourglass_top" : "upload"}</Symbol>
        </IconButton>

        <div style={{ "min-width": 0, flex: 1 }}>
          <Show
            when={canUpload()}
            fallback={
              <Text class="label" size="small">
                {joined()
                  ? t`You need permission to upload files in this channel`
                  : t`Join the DJ channel to add music`}
              </Text>
            }
          >
            <Text class="label" size="small">
              {uploading()
                ? t`Uploading and transcoding...`
                : t`Add a track to the queue`}
            </Text>
          </Show>
        </div>

        <Show when={canUpload()}>
          <Button
            size="sm"
            variant="tonal"
            isDisabled={uploading()}
            onPress={() => input?.click()}
          >
            {uploading() ? t`Uploading` : t`Add track`}
          </Button>
        </Show>
      </Row>

      <Show when={error()}>
        <ErrorText>{error()}</ErrorText>
      </Show>
    </Container>
  );
}

const Container = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    margin: "0 16px 16px",
    padding: "10px 12px",
    borderRadius: "var(--borderRadius-lg)",
    background: "var(--md-sys-color-surface-container)",
  },
});

const Row = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: 0,
  },
});

const ErrorText = styled("div", {
  base: {
    color: "var(--md-sys-color-error)",
    fontSize: "0.8125rem",
  },
});
