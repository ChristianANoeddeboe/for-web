import { createFormControl, createFormGroup } from "solid-forms";
import { Show } from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";
import type { DataEditChannel, ForumLayout, ForumSortOrder } from "stoat.js";

import {
  CircularProgress,
  Column,
  Form2,
  MenuItem,
  Row,
  Text,
} from "@revolt/ui";

import { ChannelSettingsProps } from "../ChannelSettings";

import { AutoArchiveOptions, SlowmodeOptions } from "./ThreadOptions";

/**
 * Defaults for new threads / forum posts
 */
export default function ThreadDefaults(props: ChannelSettingsProps) {
  const { t } = useLingui();

  const isForum = () => props.channel.type === "ForumChannel";

  /**
   * Current values
   */
  const initial = () => ({
    autoArchive: String(props.channel.defaultAutoArchiveMinutes ?? 4320),
    threadSlowmode: String(props.channel.defaultThreadSlowmode ?? 0),
    requireTag: props.channel.requireTag,
    reaction: props.channel.defaultReactionEmoji ?? "",
    sort: props.channel.defaultSortOrder as string,
    layout: props.channel.defaultLayout as string,
  });

  /* eslint-disable solid/reactivity */
  // we want to take the initial value only
  const values = initial();
  const editGroup = createFormGroup({
    autoArchive: createFormControl(values.autoArchive),
    threadSlowmode: createFormControl(values.threadSlowmode),
    requireTag: createFormControl(values.requireTag),
    reaction: createFormControl(values.reaction),
    sort: createFormControl(values.sort),
    layout: createFormControl(values.layout),
  });
  /* eslint-enable solid/reactivity */

  function onReset() {
    const values = initial();
    for (const key of Object.keys(values) as (keyof typeof values)[]) {
      (editGroup.controls[key].setValue as (value: unknown) => void)(
        values[key],
      );
    }
  }

  async function onSubmit() {
    const changes: DataEditChannel = { remove: [] };
    const c = editGroup.controls;

    if (c.autoArchive.isDirty) {
      changes.default_auto_archive_minutes = Number(c.autoArchive.value);
    }

    // thread slowmode default only exists on forum channels
    if (isForum() && c.threadSlowmode.isDirty) {
      const value = Number(c.threadSlowmode.value);
      if (value) {
        changes.default_thread_slowmode = value;
      } else {
        changes.remove!.push("DefaultThreadSlowmode");
      }
    }

    if (isForum()) {
      if (c.requireTag.isDirty) changes.require_tag = c.requireTag.value;
      if (c.sort.isDirty)
        changes.default_sort_order = c.sort.value as ForumSortOrder;
      if (c.layout.isDirty)
        changes.default_layout = c.layout.value as ForumLayout;
      if (c.reaction.isDirty) {
        const value = c.reaction.value.trim();
        if (value) {
          changes.default_reaction_emoji = value;
        } else {
          changes.remove!.push("DefaultReactionEmoji");
        }
      }
    }

    await props.channel.edit(changes);
  }

  const submit = Form2.useSubmitHandler(editGroup, onSubmit, onReset);

  return (
    <form onSubmit={submit}>
      <Column>
        <Text class="label">
          <Show when={isForum()} fallback={<Trans>New threads</Trans>}>
            <Trans>New posts</Trans>
          </Show>
        </Text>

        <Form2.Select
          label={t`Hide after inactivity`}
          control={editGroup.controls.autoArchive}
        >
          <AutoArchiveOptions />
        </Form2.Select>

        <Show when={isForum()}>
          <Form2.Select
            label={t`Slowmode`}
            control={editGroup.controls.threadSlowmode}
          >
            <SlowmodeOptions />
          </Form2.Select>
        </Show>

        <Show when={isForum()}>
          <Form2.Checkbox control={editGroup.controls.requireTag}>
            <Trans>Require people to select at least one tag</Trans>
          </Form2.Checkbox>

          <Form2.TextField
            name="reaction"
            control={editGroup.controls.reaction}
            label={t`Default reaction (emoji or custom emoji ID)`}
          />

          <Text class="label">
            <Trans>Forum view</Trans>
          </Text>

          <Form2.Select
            label={t`Default sort order`}
            control={editGroup.controls.sort}
          >
            <MenuItem value="LatestActivity">
              <Trans>Recent activity</Trans>
            </MenuItem>
            <MenuItem value="CreationDate">
              <Trans>Creation date</Trans>
            </MenuItem>
          </Form2.Select>

          <Form2.Select
            label={t`Default layout`}
            control={editGroup.controls.layout}
          >
            <MenuItem value="List">
              <Trans>List</Trans>
            </MenuItem>
            <MenuItem value="Gallery">
              <Trans>Gallery</Trans>
            </MenuItem>
          </Form2.Select>
        </Show>

        <Row>
          <Form2.Reset group={editGroup} onReset={onReset} />
          <Form2.Submit group={editGroup} requireDirty>
            <Trans>Save</Trans>
          </Form2.Submit>
          <Show when={editGroup.isPending}>
            <CircularProgress />
          </Show>
        </Row>
      </Column>
    </form>
  );
}
