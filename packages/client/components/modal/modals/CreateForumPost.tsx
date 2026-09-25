import { createFormControl, createFormGroup } from "solid-forms";
import { For, Show, createSignal } from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";
import { styled } from "styled-system/jsx";

import { useNavigate } from "@revolt/routing";
import { Column, Dialog, DialogProps, Form2, Text } from "@revolt/ui";

import { useModals } from "..";
import { ForumTagChip } from "../../../src/interface/channels/forum/ForumTagChip";
import { Modals } from "../types";

/**
 * Modal to create a new post in a forum channel
 */
export function CreateForumPostModal(
  props: DialogProps & Modals & { type: "create_forum_post" },
) {
  const { t } = useLingui();
  const navigate = useNavigate();
  const { showError } = useModals();

  const group = createFormGroup({
    name: createFormControl("", { required: true }),
    content: createFormControl("", { required: true }),
  });

  const [tags, setTags] = createSignal<string[]>([]);

  const canModerate = () => props.channel.havePermission("ManageThreads");

  /**
   * Tags the user may apply
   */
  const availableTags = () =>
    props.channel.availableTags.filter(
      (tag) => !tag.moderated || canModerate(),
    );

  const tagsValid = () => !props.channel.requireTag || tags().length > 0;

  function toggleTag(id: string) {
    setTags((prev) =>
      prev.includes(id)
        ? prev.filter((tag) => tag !== id)
        : prev.length < 5
          ? [...prev, id]
          : prev,
    );
  }

  async function onSubmit() {
    if (!tagsValid()) return;

    try {
      const post = await props.channel.createThread({
        name: group.controls.name.value.trim(),
        applied_tags: tags().length ? tags() : undefined,
        message: { content: group.controls.content.value },
      });

      navigate(post.path);
      props.onClose();
    } catch (error) {
      showError(error);
    }
  }

  const submit = Form2.useSubmitHandler(group, onSubmit);

  return (
    <Dialog
      minWidth={480}
      show={props.show}
      onClose={props.onClose}
      title={<Trans>New post</Trans>}
      actions={[
        { text: <Trans>Close</Trans> },
        {
          text: <Trans>Post</Trans>,
          onClick: () => {
            onSubmit();
            return false;
          },
          isDisabled: !Form2.canSubmit(group) || !tagsValid(),
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
            label={t`Post Title`}
          />

          <Show when={availableTags().length}>
            <Text class="label">
              <Show
                when={props.channel.requireTag}
                fallback={<Trans>Tags</Trans>}
              >
                <Trans>Tags (at least one required)</Trans>
              </Show>
            </Text>
            <Tags>
              <For each={availableTags()}>
                {(tag) => (
                  <ForumTagChip
                    tag={tag}
                    selected={tags().includes(tag.id)}
                    onClick={() => toggleTag(tag.id)}
                  />
                )}
              </For>
            </Tags>
          </Show>

          <Form2.TextEditor
            control={group.controls.content}
            placeholder={t`Write your post...`}
          />
        </Column>
      </form>
    </Dialog>
  );
}

const Tags = styled("div", {
  base: {
    display: "flex",
    flexWrap: "wrap",
    gap: "var(--gap-sm)",
  },
});
