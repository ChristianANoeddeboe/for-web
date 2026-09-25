import { createFormControl, createFormGroup } from "solid-forms";
import { For, Show } from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";
import { AUTO_ARCHIVE_MINUTES } from "stoat.js";

import { useNavigate } from "@revolt/routing";
import { Column, Dialog, DialogProps, Form2, MenuItem } from "@revolt/ui";

import { useModals } from "..";
import { Modals } from "../types";

/**
 * Modal to start a thread in a text channel
 */
export function CreateThreadModal(
  props: DialogProps & Modals & { type: "create_thread" },
) {
  const { t } = useLingui();
  const navigate = useNavigate();
  const { showError } = useModals();

  const defaultName = () =>
    props.message?.contentPlain?.trim().slice(0, 40) ?? "";

  const group = createFormGroup({
    name: createFormControl(defaultName(), { required: true }),
    private: createFormControl(false),
    autoArchive: createFormControl(
      String(props.channel.defaultAutoArchiveMinutes ?? 4320),
    ),
  });

  const canPrivate = () =>
    !props.message && props.channel.havePermission("CreatePrivateThreads");

  const labels: Record<(typeof AUTO_ARCHIVE_MINUTES)[number], string> = {
    60: t`1 hour`,
    1440: t`24 hours`,
    4320: t`3 days`,
    10080: t`1 week`,
  };

  async function onSubmit() {
    try {
      const data = {
        name: group.controls.name.value.trim(),
        auto_archive_minutes: parseInt(group.controls.autoArchive.value),
      };

      const thread = props.message
        ? await props.channel.createThreadFromMessage(props.message, data)
        : await props.channel.createThread({
            ...data,
            private: canPrivate() && group.controls.private.value,
          });

      navigate(thread.path);
      props.onClose();
    } catch (error) {
      showError(error);
    }
  }

  const submit = Form2.useSubmitHandler(group, onSubmit);

  return (
    <Dialog
      show={props.show}
      onClose={props.onClose}
      title={<Trans>Create thread</Trans>}
      actions={[
        { text: <Trans>Close</Trans> },
        {
          text: <Trans>Create</Trans>,
          onClick: () => {
            onSubmit();
            return false;
          },
          isDisabled: !Form2.canSubmit(group),
        },
      ]}
      isDisabled={group.isPending}
    >
      <form onSubmit={submit}>
        <Column>
          <Form2.TextField
            minlength={1}
            maxlength={100}
            counter
            name="name"
            control={group.controls.name}
            label={t`Thread Name`}
          />

          <Form2.Select
            label={t`Hide after inactivity`}
            control={group.controls.autoArchive}
          >
            <For each={AUTO_ARCHIVE_MINUTES}>
              {(value) => (
                <MenuItem value={String(value)}>{labels[value]}</MenuItem>
              )}
            </For>
          </Form2.Select>

          <Show when={canPrivate()}>
            <Form2.Checkbox control={group.controls.private}>
              <Trans>
                Private thread (only people you invite and moderators can see
                it)
              </Trans>
            </Form2.Checkbox>
          </Show>
        </Column>
      </form>
    </Dialog>
  );
}
