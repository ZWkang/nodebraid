import DefaultTheme from 'vitepress/theme';

import FlowArchitecture from './components/FlowArchitecture.vue';
import ModuleCatalog from './components/ModuleCatalog.vue';
import ProjectStats from './components/ProjectStats.vue';
import './custom.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('FlowArchitecture', FlowArchitecture);
    app.component('ModuleCatalog', ModuleCatalog);
    app.component('ProjectStats', ProjectStats);
  },
};
