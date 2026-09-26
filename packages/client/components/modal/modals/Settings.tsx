import {
  createEffect,
  createSignal,
  on,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { Portal } from "solid-js/web";
import { Motion, Presence } from "solid-motionone";
import { css } from "styled-system/css";

import { Settings, SettingsConfigurations } from "@revolt/app";
import { useDevice } from "@revolt/common";
import { useState } from "@revolt/state";
import { DialogProps } from "@revolt/ui";
import {
  SlideDrawer,
  SlideState,
} from "@revolt/ui/components/navigation/SlideDrawer";

import { Modals } from "../types";

/**
 * Modal to display server information
 */
export function SettingsModal(
  props: DialogProps & Modals & { type: "settings" },
) {
  const { setDiagDrawer } = useState();
  // eslint-disable-next-line solid/reactivity
  const config = SettingsConfigurations[props.config];

  //Drawer slider for mobile
  let rootRef, sDrawer: SlideDrawer | undefined;
  const [contRef, setContRef] = createSignal<HTMLDivElement>();
  createEffect(
    on(contRef, (cont) => {
      if (!cont || sDrawer) return;
      // On phones, open on the section list unless a page was requested
      sDrawer = new SlideDrawer(
        cont,
        rootRef!,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        !!(props.context as any)?.page,
      );
      setDiagDrawer(sDrawer);
    }),
  );

  // Hardware / browser back: page -> section list -> close
  const { layout } = useDevice();
  let historyEntry: string | undefined;
  const pushHistoryEntry = () => {
    history.pushState({ ...(history.state ?? {}), settings: true }, "");
    historyEntry = location.href;
  };
  const onPopState = () => {
    historyEntry = undefined;
    if (sDrawer?.enabled && sDrawer.state === SlideState.SHOWN) {
      sDrawer.setShown(false);
      pushHistoryEntry();
    } else {
      props.onClose();
    }
  };
  const dropHistoryEntry = () => {
    window.removeEventListener("popstate", onPopState);
    // Only unwind our own entry, not a navigation that happened meanwhile
    if (historyEntry && historyEntry === location.href) history.back();
    historyEntry = undefined;
  };
  onMount(() => {
    if (layout() === "desktop") return;
    pushHistoryEntry();
    window.addEventListener("popstate", onPopState);
  });
  createEffect(
    on(
      () => props.show,
      (show) => !show && dropHistoryEntry(),
      { defer: true },
    ),
  );

  onCleanup(() => {
    dropHistoryEntry();
    sDrawer?.delete();
    setDiagDrawer((sDrawer = undefined));
  });

  return (
    <Portal mount={document.getElementById("floating")!}>
      <div
        style={{
          "z-index": 100,
          position: "fixed",
          width: "100%",
          height: "100vh",
          left: 0,
          top: 0,
          "pointer-events": "none",
        }}
      >
        <Presence>
          <Show when={props?.show}>
            <Motion.div
              ref={rootRef}
              class={settingsOverlay}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{
                duration: 0.3,
                easing: [0.17, 0.67, 0.58, 0.98],
              }}
            >
              <Settings
                onClose={props.onClose}
                render={config.render}
                title={config.title}
                list={config.list}
                context={props.context as never}
                contentRef={setContRef}
              />
            </Motion.div>
          </Show>
        </Presence>
      </div>
    </Portal>
  );
}

const settingsOverlay =
  "settings_overlay " +
  css({
    display: "flex",
    height: "100%",
    pointerEvents: "all",
    color: "var(--md-sys-color-on-surface)",
    background: "var(--md-sys-color-surface-container-highest)",
  });
