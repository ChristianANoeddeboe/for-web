import { For, Show, createSignal } from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";
import type { ForumTag } from "stoat.js";
import { styled } from "styled-system/jsx";

import { useModals } from "@revolt/modal";
import {
  Button,
  Checkbox,
  CircularProgress,
  Column,
  IconButton,
  Row,
  Text,
  TextField,
} from "@revolt/ui";
import { Symbol } from "@revolt/ui/components/utils/Symbol";

import { ForumTagChip } from "../../../../../src/interface/channels/forum/ForumTagChip";
import { ChannelSettingsProps } from "../ChannelSettings";

/**
 * Most tags a forum can have
 */
const MAX_TAGS = 20;

/**
 * Edit the tags of a forum channel
 */
export default function ForumTags(props: ChannelSettingsProps) {
  const { t } = useLingui();
  const { showError } = useModals();

  const copy = () =>
    props.channel.availableTags.map((tag) => ({
      ...tag,
      emoji: tag.emoji ?? "",
      moderated: !!tag.moderated,
    }));

  const [tags, setTags] = createSignal<ForumTag[]>(copy());
  const [saving, setSaving] = createSignal(false);

  const dirty = () => JSON.stringify(tags()) !== JSON.stringify(copy());

  const valid = () => tags().every((tag) => tag.name.trim().length > 0);

  function update(index: number, changes: Partial<ForumTag>) {
    setTags((prev) =>
      prev.map((tag, i) => (i === index ? { ...tag, ...changes } : tag)),
    );
  }

  async function save() {
    setSaving(true);
    try {
      await props.channel.edit({
        available_tags: tags().map((tag) => ({
          id: tag.id,
          name: tag.name.trim(),
          emoji: tag.emoji?.trim() || null,
          moderated: tag.moderated,
        })),
      });

      setTags(copy());
    } catch (error) {
      showError(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Column>
      <Text class="label">
        <Trans>Tags</Trans>
      </Text>
      <Text>
        <Trans>
          Tags help people find and filter posts. Moderated tags can only be
          applied by members who can manage threads.
        </Trans>
      </Text>

      <For each={tags()}>
        {(tag, index) => (
          <TagRow>
            <ForumTagChip tag={tag} />
            <TextField
              variant="filled"
              value={tag.emoji ?? ""}
              placeholder={t`Emoji`}
              onInput={(e) => update(index(), { emoji: e.currentTarget.value })}
              style={{ width: "96px" }}
            />
            <TextField
              variant="filled"
              value={tag.name}
              maxlength={20}
              placeholder={t`Tag name`}
              onInput={(e) => update(index(), { name: e.currentTarget.value })}
            />
            <Checkbox
              checked={tag.moderated}
              onChange={(e) =>
                update(index(), { moderated: e.currentTarget.checked })
              }
            >
              <Trans>Moderated</Trans>
            </Checkbox>
            <IconButton
              onPress={() =>
                setTags((prev) => prev.filter((_, i) => i !== index()))
              }
            >
              <Symbol>delete</Symbol>
            </IconButton>
          </TagRow>
        )}
      </For>

      <Row>
        <Button
          variant="text"
          isDisabled={tags().length >= MAX_TAGS}
          onPress={() =>
            setTags((prev) => [
              ...prev,
              { id: "", name: "", emoji: "", moderated: false },
            ])
          }
        >
          <Symbol>add</Symbol>
          <Trans>Add tag</Trans>
        </Button>
      </Row>

      <Row>
        <Button
          variant="text"
          isDisabled={!dirty()}
          onPress={() => setTags(copy())}
        >
          <Trans>Reset</Trans>
        </Button>
        <Button isDisabled={!dirty() || !valid() || saving()} onPress={save}>
          <Trans>Save</Trans>
        </Button>
        <Show when={saving()}>
          <CircularProgress />
        </Show>
      </Row>
    </Column>
  );
}

const TagRow = styled("div", {
  base: {
    display: "grid",
    gridTemplateColumns: "minmax(80px, auto) 96px 1fr auto auto",
    alignItems: "center",
    gap: "var(--gap-md)",
  },
});
