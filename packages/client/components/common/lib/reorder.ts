import { createSignal } from "solid-js";

/**
 * Server whose channel list is in touch reorder mode.
 *
 * Drag and drop is off on mobile by default because it fights with
 * scrolling; this mode turns it on behind explicit drag handles.
 */
export const [reorderingServer, setReorderingServer] = createSignal<string>();
