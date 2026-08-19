<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';

const { lang } = useData();
const english = computed(() => lang.value.startsWith('en'));
</script>

<template>
  <section class="flow-architecture" aria-labelledby="flow-architecture-title">
    <div class="flow-architecture__copy">
      <p class="flow-eyebrow">EXPLICIT COMPOSITION</p>
      <h2 id="flow-architecture-title">
        {{ english ? 'One authoritative Document, replaceable capabilities' : '一份权威 Document，多组可替换能力' }}
      </h2>
      <p>
        {{
          english
            ? 'CFlow does not weld a complete editor into one object. Applications explicitly compose Kernel, Session, Command, History, Layout, and Renderer contracts through the Plugin Host, with clear dependencies and lifecycles.'
            : 'CFlow 不把完整编辑器焊死在一个对象里。应用通过 Plugin Host 显式组合 Kernel、Session、Command、History、Layout 与 Renderer contract，每项能力都拥有清晰的依赖和生命周期。'
        }}
      </p>
    </div>

    <div class="flow-architecture__map" :aria-label="english ? 'CFlow capability composition' : 'CFlow 能力组合示意'">
      <div class="flow-node flow-node--app">
        <span>Application</span>
        <strong>{{ english ? 'Your product and framework adapter' : '你的产品与框架适配层' }}</strong>
      </div>

      <div class="flow-connector" aria-hidden="true"><span>install</span></div>

      <div class="flow-runtime">
        <div class="flow-runtime__header">
          <span>Canvas Runtime</span>
          <strong>Plugin Host</strong>
        </div>
        <div class="flow-runtime__services">
          <div class="flow-node">
            <span>Kernel Service</span>
            <strong>Document · Transaction</strong>
          </div>
          <div class="flow-node">
            <span>Session Service</span>
            <strong>Selection · Viewport</strong>
          </div>
          <div class="flow-node">
            <span>Command Service</span>
            <strong>Typed execution</strong>
          </div>
          <div class="flow-node">
            <span>Renderer Service</span>
            <strong>Backend-neutral seam</strong>
          </div>
        </div>
      </div>

      <div class="flow-capabilities" :aria-label="english ? 'Optional capabilities' : '可选能力'">
        <span>History</span>
        <span>Layout</span>
        <span>Diagnostics</span>
        <span>Providers</span>
      </div>
    </div>
  </section>
</template>
