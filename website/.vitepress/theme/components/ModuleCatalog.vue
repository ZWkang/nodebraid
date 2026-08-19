<script setup lang="ts">
import { computed } from 'vue';
import { useData, withBase } from 'vitepress';

import { capabilityGroups } from '../../module-catalog.mts';

const { lang } = useData();
const locale = computed<'zh' | 'en'>(() => (lang.value.startsWith('en') ? 'en' : 'zh'));

function localizedPath(path: string): string {
  return withBase(locale.value === 'en' ? `/en${path}` : path);
}
</script>

<template>
  <div class="module-catalog">
    <section v-for="group in capabilityGroups" :key="group.slug" class="module-catalog__group">
      <div class="module-catalog__heading">
        <div>
          <p>CAPABILITY FAMILY</p>
          <h2>{{ group.title }}</h2>
        </div>
        <a :href="localizedPath(`/capabilities/${group.slug}`)">
          {{ locale === 'en' ? 'View capability →' : '查看能力总览 →' }}
        </a>
      </div>
      <p class="module-catalog__summary">{{ group.summary[locale] }}</p>
      <div class="module-catalog__grid">
        <a
          v-for="module in group.modules"
          :key="module.slug"
          class="module-card"
          :href="localizedPath(`/modules/${module.slug}`)"
        >
          <code>{{ module.name }}</code>
          <span>{{ module.summary[locale] }}</span>
        </a>
      </div>
    </section>
  </div>
</template>
