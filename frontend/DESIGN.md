# Frontend design boundary

## Direction

Evidence-workbench editorial: warm paper background, deep green ink, restrained orange focus state, compact labels, and two clear journeys: create a boundary, then run/read back the check.

## Negative constraints

- No generic dashboard card grid, gradients used as decoration, fake metrics, or hidden transaction state.
- No automatic wallet connection, provider selection, or success label before finalized execution and authoritative readback.
- No visual treatment may imply that the optional paper is a mandatory evidence source.

## Required states

- Disconnected after every reload.
- Wallet chooser with only detected MetaMask, OKX Wallet, and Rabby options (or bounded legacy fallback), zero account requests on open, keyboard focus restoration, and inline errors.
- Contract not configured, empty readback, pending transaction hash, finalized execution failure, unresolved retry, and successful conclusive readback.

## Responsive and accessibility

- Two-column workbench becomes one column below 760px.
- Semantic labels, visible focus rings, dialog semantics, live status/error regions, keyboard-safe controls, and reduced-motion support are required.
