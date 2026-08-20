# @cflow/plugin-renderer

> Documentation: [English](https://zwkang.github.io/cflow/en/modules/plugin-renderer) · [简体中文](https://zwkang.github.io/cflow/modules/plugin-renderer)

Runtime integration for CFlow Renderer Providers.

The package owns one Renderer Instance per Activation, synchronizes Kernel and
Session updates, exposes a narrow Renderer Service to Interaction Plugins, and
binds input Fault reporting and cleanup to Plugin Host lifecycle.

One exclusive Interaction Projection Binding connects transient Interaction
state without exposing Document or Session update authority. Internal sync
failures receive one full reset-plus-Session recovery attempt. If that recovery
also fails, the Activation enters terminal `SYNC_FAILED`, stops Input forwarding,
and rejects further interaction controls until dependencies create a fresh
Activation.
