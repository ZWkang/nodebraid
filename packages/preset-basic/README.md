# @nodebraid/preset-basic

> Documentation: [English](https://zwkang.github.io/nodebraid/en/modules/preset-basic) · [简体中文](https://zwkang.github.io/nodebraid/modules/preset-basic)

Backend-neutral Basic Canvas Composition for NodeBraid. Applications explicitly
create a Plugin Host, select a Renderer Factory, and install the returned Plugin
with Provider-specific configuration. The Composition owns Kernel, Command,
Session, Renderer, Interaction, and History through one lifecycle.

The package does not select a default Renderer, create a Host, expose a Service
Locator, or install Layout and product capabilities. Concrete Renderer Providers
and optional sibling Plugins remain explicit application dependencies.

## License

[MIT](./LICENSE)
