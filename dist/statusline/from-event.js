import { actionLabel } from "./labels.js";
// Only "pre" events change what Claude is currently doing.
export function actionFromEvent(e) {
    if (e.phase !== "pre")
        return null;
    return actionLabel(e.tool, e.input);
}
