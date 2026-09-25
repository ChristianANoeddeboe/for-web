import { createFormControl, createFormGroup } from "solid-forms";
import { For, Show } from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";
import type { DataEditChannel } from "stoat.js";
import { styled } from "styled-system/jsx";

import { canEditThread } from "@revolt/app/menus/ThreadContextMenu";
import { useClient } from "@revolt/client";
import { CircularProgress, Column, Form2, Row, Text } from "@revolt/ui";

import { ForumTagChip } from "../../../../../src/interface/channels/forum/ForumTagChip";
import { ChannelSettingsProps } from "../ChannelSettings";

import { AutoArchiveOptions, SlowmodeOptions } from "./ThreadOptions";

/**
 * Settings of a thread or forum post
 */
export default function ThreadOverview(props: ChannelSettingsProps) {
  const { t } = useLingui();
  const client = useClient();

  const manage = () => props.channel.havePermission("ManageChannel");
  const canEdit = () => canEditThread(props.channel, client().user?.id);
  const canModerateTags = () => props.channel.havePermission("ManageThreads");

  /* eslint-disable solid/reactivity */
  // we want to take the initial value only
  const editGroup = createFormGroup({
    name: createFormControl(props.channel.name),
    slowmode: createFormControl(String(props.channel.slowmode)),
    autoArchive: createFormControl(
      String(props.channel.autoArchiveMinutes ?? 4320),
    ),
    invitable: createFormControl(props.channel.invitable),
    tags: createFormControl(props.channel.appliedTagIds),
  });
  /* eslint-enable solid/reactivity */

  const tags = () => editGroup.controls.tags.value;

  function onReset() {
    editGroup.controls.name.setValue(props.channel.name);
    editGroup.controls.slowmode.setValue(String(props.channel.slowmode));
    editGroup.controls.autoArchive.setValue(
      String(props.channel.autoArchiveMinutes ?? 4320),
    );
    editGroup.controls.invitable.setValue(props.channel.invitable);
    editGroup.controls.tags.setValue(props.channel.appliedTagIds);
  }

  async function onSubmit() {
    const changes: DataEditChannel = {};

    if (editGroup.controls.name.isDirty) {
      changes.name = editGroup.controls.name.value.trim();
    }

    if (editGroup.controls.slowmode.isDirty) {
      changes.slowmode = Number(editGroup.controls.slowmode.value);
    }

    if (editGroup.controls.autoArchive.isDirty) {
      changes.auto_archive_minutes = Number(
        editGroup.controls.autoArchive.value,
      );
    }

    if (editGroup.controls.invitable.isDirty) {
      changes.invitable = editGroup.controls.invitable.value;
    }

    if (editGroup.controls.tags.isDirty) {
      changes.applied_tags = tags();
    }

    await props.channel.edit(changes);
  }

  const submit = Form2.useSubmitHandler(editGroup, onSubmit, onReset);

  /**
   * Whether a tag can be toggled by us
   * @param moderated Whether the tag is moderated
   */
  const canToggle = (moderated?: boolean) => !moderated || canModerateTags();

  function toggleTag(id: string) {
    const prev = tags();
    editGroup.controls.tags.setValue(
      prev.includes(id)
        ? prev.filter((tag) => tag !== id)
        : prev.length < 5
          ? [...prev, id]
          : prev,
    );
    editGroup.controls.tags.markDirty(true);
  }

  return (
    <form onSubmit={submit}>
      <Column>
        <Text class="label">
          <Show
            when={props.channel.isForumPost}
            fallback={<Trans>Thread Info</Trans>}
          >
            <Trans>Post Info</Trans>
          </Show>
        </Text>
        <Form2.TextField
          minlength={1}
          maxlength={100}
          counter
          name="name"
          control={editGroup.controls.name}
          label={props.channel.isForumPost ? t`Post Title` : t`Thread Name`}
          disabled={!canEdit()}
        />

        <Show when={manage()}>
          <Form2.Select
            label={t`Slowmode`}
            control={editGroup.controls.slowmode}
          >
            <SlowmodeOptions />
          </Form2.Select>
        </Show>

        <Show when={canEdit()}>
          <Form2.Select
            label={t`Hide after inactivity`}
            control={editGroup.controls.autoArchive}
          >
            <AutoArchiveOptions />
          </Form2.Select>
        </Show>

        <Show when={props.channel.private && canEdit()}>
          <Form2.Checkbox control={editGroup.controls.invitable}>
            <Trans>Allow anyone to invite others to this thread</Trans>
          </Form2.Checkbox>
        </Show>

        <Show when={props.channel.isForumPost && canEdit()}>
          <Text class="label">
            <Trans>Tags</Trans>
          </Text>
          <Tags>
            <For each={props.channel.parent?.availableTags}>
              {(tag) => (
                <ForumTagChip
                  tag={tag}
                  selected={tags().includes(tag.id)}
                  onClick={
                    canToggle(tag.moderated)
                      ? () => toggleTag(tag.id)
                      : undefined
                  }
                />
              )}
            </For>
          </Tags>
        </Show>

        <Show when={canEdit()}>
          <Row>
            <Form2.Reset group={editGroup} onReset={onReset} />
            <Form2.Submit group={editGroup} requireDirty>
              <Trans>Save</Trans>
            </Form2.Submit>
            <Show when={editGroup.isPending}>
              <CircularProgress />
            </Show>
          </Row>
        </Show>
      </Column>
    </form>
  );
}

const Tags = styled("div", {
  base: {
    display: "flex",
    flexWrap: "wrap",
    gap: "var(--gap-sm)",
  },
});
