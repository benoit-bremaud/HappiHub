# State — modal confirmation dialog lifecycle (#346)

Spec: [modal-confirmation-dialog](../../specs/modal-confirmation-dialog.md), rules R1–R4, R7.

```mermaid
stateDiagram-v2
  [*] --> Closed
  Closed --> Open: trigger activated / record focus, showModal()
  Open --> Closed: Esc [not busy] / onClose()
  Open --> Closed: close button / onClose()
  Open --> Busy: confirm button / onConfirm()
  Open --> Open: backdrop click / ignored (R7)
  Busy --> Busy: Esc or close button / ignored, buttons disabled (R3)
  Busy --> Busy: native close / showModal() again (R3)
  Open --> Closed: native close / onClose() (R3)
  Busy --> Closed: request done / unmount, restore focus
  Closed --> [*]
```

On every transition to `Closed` the dialog is unmounted and focus returns to the recorded
trigger (R4).
