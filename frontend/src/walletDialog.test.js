import { describe, expect, it, vi } from "vitest";
import { handleWalletDialogKeydown, restoreDialogFocus } from "./walletDialog.js";

describe("wallet dialog interaction", () => {
  it("closes on Escape and restores focus to the initiating control", () => {
    const dialog = { close: vi.fn() };
    const event = { key: "Escape", preventDefault: vi.fn() };
    handleWalletDialogKeydown(event, dialog);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(dialog.close).toHaveBeenCalledOnce();
    const initiator = { focus: vi.fn() };
    restoreDialogFocus(initiator);
    expect(initiator.focus).toHaveBeenCalledOnce();
  });

  it("traps Tab and Shift+Tab inside the chooser", () => {
    const ownerDocument = { activeElement: null };
    const first = { focus: vi.fn(() => { ownerDocument.activeElement = first; }), hasAttribute: () => false, getAttribute: () => null };
    const last = { focus: vi.fn(() => { ownerDocument.activeElement = last; }), hasAttribute: () => false, getAttribute: () => null };
    const dialog = { ownerDocument, querySelectorAll: () => [first, last] };
    ownerDocument.activeElement = last;
    const forward = { key: "Tab", shiftKey: false, preventDefault: vi.fn() };
    handleWalletDialogKeydown(forward, dialog);
    expect(first.focus).toHaveBeenCalledOnce();
    ownerDocument.activeElement = first;
    const backward = { key: "Tab", shiftKey: true, preventDefault: vi.fn() };
    handleWalletDialogKeydown(backward, dialog);
    expect(last.focus).toHaveBeenCalledOnce();
  });
});
