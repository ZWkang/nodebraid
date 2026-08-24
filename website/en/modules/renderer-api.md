---
title: '@nodebraid/renderer-api'
description: A NodeBraid-owned, backend-neutral contract for Renderer Providers.
---

# `@nodebraid/renderer-api`

::: warning Package is not publicly released
This name describes the current source-module boundary; it does not mean the package can be installed from npm. Follow the source-based [Quick Start](/en/guide/quick-start) to verify it.
:::

## Problems it solves

Different rendering backends have different Targets, scene objects, and native events. `@nodebraid/renderer-api` defines a minimal NodeBraid seam: a Provider receives Canvas-semantic projections of the Document and Session, then emits standardized Renderer Input and Hit Results without spreading DOM, Canvas Context, Konva/Pixi objects, or a second state-write path to callers.

This package is a contract, not a rendering implementation.

## When to use it

- You want to implement an SVG, Canvas2D, WebGL, Headless, or other Renderer Provider;
- You need to declare Provider-specific, strongly typed Factory config and Target values;
- You need continuous revision updates, Session projection, standardized input, and Hit Testing;
- You want to compose with `@nodebraid/plugin-renderer` without making the Provider depend on the Plugin Host.

Ordinary applications interact with this seam directly only when selecting or implementing a Provider. Using this package alone will not create a visible canvas.

## What it provides

- `CanvasRenderer`: Document/Session/Interaction projection, Input subscription, Hit Testing, Pointer Capture, Focus, and terminal disposal;
- `RendererFactory<Config>`: creates one Renderer Instance from immutable Provider-specific config;
- `RendererDocumentUpdate`: `reset` establishes a complete Baseline, while `commit` delivers one complete Canvas Commit;
- `RendererInput`: a discriminated union of Pointer, Wheel, Keyboard, and Focus input;
- `ScreenPoint`, `InputModifiers`, `PointerButton`, and `PointerType`;
- `HitResult`: a semantic Canvas, Node, Edge, Port, or Node-level Connection Anchor target plus a World Point;
- `RendererError`: stable error identity for Provider contract failures.

When a Document update call returns, the Renderer's logical state must have accepted the update so a subsequent Hit Test can observe the new state. The Provider may still batch the actual pixel drawing.

## Dependencies and composition

This package depends on Canvas View/Commit and entity identity from `@nodebraid/kernel`, the shared Session Snapshot from `@nodebraid/session-api`, Projection values from `@nodebraid/interaction-api`, and structured errors from `@nodebraid/diagnostics`. It does not depend on Runtime, the Plugin Host, a concrete backend, a framework, or `@nodebraid/core`.

A Provider package should depend only on this contract and export a named Factory plus its concrete Config. The current [`@nodebraid/renderer-svg`](/en/modules/renderer-svg) package is the official implementation of this boundary. An application can then connect the Factory to the Runtime through [`@nodebraid/plugin-renderer`](/en/modules/plugin-renderer).

## Public entry points

```ts
import {
  RendererError,
  type CanvasRenderer,
  type FocusInput,
  type HitResult,
  type InputModifiers,
  type KeyboardInput,
  type PointerButton,
  type PointerInput,
  type PointerType,
  type RendererDocumentUpdate,
  type RendererErrorCode,
  type RendererFactory,
  type RendererInput,
  type RendererInputListener,
  type ScreenPoint,
  type WheelInput,
} from '@nodebraid/renderer-api';
```

These contracts are also re-exported by `@nodebraid/core`; core does not bring in a concrete Provider implicitly.

## Lifecycle and error semantics

A Renderer Instance is bound to one fixed Target when its Factory creates it. The Target belongs in Provider Config; the public interface has no universal mount operation. Switching Target or Provider requires disposing the old instance and creating a new one.

The Provider must treat `reset` as a complete Baseline. For every later `commit`, `commit.before` must be continuous with the accepted Baseline, and the Commit must be accepted atomically after complete validation. Duplicate, stale, skipped, or internally inconsistent Commits cannot be ignored or partially applied.

Renderer Input subscriptions publish standardized input synchronously in actual order. The listener set is fixed when each Input begins, reentrant Input uses FIFO breadth-first ordering, and cancellation is idempotent. `dispose()` is terminal, asynchronous, and idempotent. Once disposal starts, updates, Hit Tests, and new subscriptions must fail explicitly with `RENDERER_DISPOSED`.

| Code                             | Applicable failure                                                       |
| -------------------------------- | ------------------------------------------------------------------------ |
| `INVALID_DOCUMENT_UPDATE`        | Invalid reset/commit structure or revision evidence                      |
| `DOCUMENT_OUT_OF_SYNC`           | A Commit is not continuous with the current Renderer Baseline            |
| `INVALID_SESSION_SNAPSHOT`       | Session values are invalid or cannot be resolved by the current Document |
| `INVALID_SCREEN_POINT`           | Invalid Hit Test input coordinates                                       |
| `INVALID_INPUT_SUBSCRIBER`       | Invalid Input listener                                                   |
| `INVALID_POINTER`                | Invalid Pointer capture/release request                                  |
| `INVALID_INTERACTION_PROJECTION` | Invalid Interaction Projection structure                                 |
| `INTERACTION_OUT_OF_SYNC`        | Stale Document or Viewport evidence for a Projection                     |
| `RENDERER_DISPOSED`              | Terminal disposal of the Renderer Instance has begun                     |

Concrete Providers implement these constraints. Structural validation must happen before the Baseline or logical state is changed. Original Provider Factory, backend projection, and disposal failures preserve their identity.

## Limitations and non-goals

- The current release ships one reference SVG Provider, with no other backend or default-selection policy;
- No default Provider, Factory Registry, universal Config schema, or config merging;
- No DOM, SVG, Canvas, WebGL, or framework types;
- Does not expose Document/Session write authority, Command execution, or native events; Interaction updates accept only transient semantic Projections;
- No text input, IME, clipboard, pressure, tilt, coalesced events, or timestamps;
- Does not define renderer scenes, z-order, Handles, animation, or business-specific Node appearance.

## Verification evidence

Package type tests lock down Factory config, Document/Session update types, the absence of a universal mount operation, and the absence of backend-type leakage. Runtime tests lock down standardized Input values and the domain/code/details of `RendererError`. The accepted Renderer ADR further defines continuous Commits, Target ownership, input ordering, and the disposal contract. Real-Chromium tests for the SVG Provider prove that a browser backend consumes this complete contract.
