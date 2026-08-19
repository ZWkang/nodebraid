<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';

import { modules } from '../../module-catalog.mts';

const { lang } = useData();
const english = computed(() => lang.value.startsWith('en'));
</script>

<template>
  <section class="home-proof" :aria-label="english ? 'Current project status' : '当前项目状态'">
    <article>
      <strong>{{ modules.length }} packages</strong>
      <span>{{
        english
          ? 'Committed public contracts, Runtime Plugins, and Layout Providers.'
          : '当前已提交的公共契约、Runtime Plugin 与 Layout Provider。'
      }}</span>
    </article>
    <article>
      <strong>Headless by design</strong>
      <span>{{
        english
          ? 'Focused on canvas state, lifecycle, and composition—not a pretend full editor.'
          : '专注画布状态、生命周期和可组合能力，不伪装成完整产品编辑器。'
      }}</span>
    </article>
    <article>
      <strong>Explicit providers</strong>
      <span>{{
        english
          ? 'No default Renderer or dynamic Provider Registry; applications choose backend dependencies explicitly.'
          : '没有默认 Renderer 或动态 Provider Registry，每项后端依赖都由应用明确选择。'
      }}</span>
    </article>
  </section>
</template>
