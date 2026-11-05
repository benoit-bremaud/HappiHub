// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// jsdom 16 lacks the modal dialog API; the stub only toggles `open` (ConfirmDialog, #346).
HTMLDialogElement.prototype.showModal ??= function showModal() { this.setAttribute('open', ''); };
HTMLDialogElement.prototype.close ??= function close() { this.removeAttribute('open'); };
