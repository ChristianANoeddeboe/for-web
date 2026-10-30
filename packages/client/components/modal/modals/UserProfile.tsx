import { Show } from "solid-js";

import { useQuery } from "@tanstack/solid-query";
import { styled } from "styled-system/jsx";

import { Dialog, DialogProps, Profile } from "@revolt/ui";

import { useClient } from "@revolt/client";
import { createBotUsageResource } from "@revolt/client/resources";

import { useModals } from "..";
import { Modals } from "../types";

export function UserProfileModal(
  props: DialogProps & Modals & { type: "user_profile" },
) {
  const { openModal } = useModals();
  const client = useClient();

  const query = useQuery(() => ({
    queryKey: ["profile", props.user.id],
    queryFn: () => props.user.fetchProfile(),
  }));

  // Usage limits are published by bots for their own account and are only
  // readable by the bot's owner.
  const usage = createBotUsageResource(() =>
    props.user.bot?.owner === client().user?.id ? props.user.id : undefined,
  );

  return (
    <Dialog
      show={props.show}
      onClose={props.onClose}
      minWidth={560}
      padding={8}
    >
      <Grid>
        <Profile.Banner
          width={3}
          user={props.user}
          member={props.member}
          bannerUrl={query.data?.animatedBannerURL}
          onClick={
            query.data?.banner
              ? () =>
                  openModal({ type: "image_viewer", file: query.data!.banner! })
              : undefined
          }
          onClickAvatar={(e) => {
            e.stopPropagation();

            if (props.user.avatar) {
              openModal({ type: "image_viewer", file: props.user.avatar });
            }
          }}
        />

        <Profile.Actions
          user={props.user}
          member={props.member}
          onClose={props.onClose}
          width={3}
        />
        <Profile.Roles member={props.member} />
        <Profile.Status user={props.user} />
        <Profile.Badges user={props.user} />
        <Show when={usage.data}>
          {(data) => <Profile.Usage usage={data()} full />}
        </Show>
        <Profile.Joined user={props.user} member={props.member} />
        <Profile.Mutuals user={props.user} member={props.member} />
        <Profile.Bio content={query.data?.content} full />
      </Grid>
    </Dialog>
  );
}

const Grid = styled("div", {
  base: {
    display: "grid",
    gap: "var(--gap-md)",
    padding: "var(--gap-md)",
    gridTemplateColumns: "repeat(3, 1fr)",
  },
});
