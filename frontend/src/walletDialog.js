export function handleWalletDialogKeydown(event, dialog) {
  if (event.key === "Escape") {
    event.preventDefault();
    dialog.close();
    return;
  }
  if (event.key !== "Tab") return;
  const controls = [...dialog.querySelectorAll("button:not([disabled]), [href], input, select, textarea")]
    .filter((control) => !control.hasAttribute("hidden") && control.getAttribute("aria-hidden") !== "true");
  if (!controls.length) return;
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (event.shiftKey && dialog.ownerDocument.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && dialog.ownerDocument.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function restoreDialogFocus(initiator) {
  initiator?.focus();
}
