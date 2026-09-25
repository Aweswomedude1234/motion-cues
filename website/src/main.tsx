import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import './styles.css';
import {Theme} from '@astryxdesign/core/theme';
import {steadyTheme} from './theme';
import {App} from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme theme={steadyTheme} mode="system">
      <App />
    </Theme>
  </StrictMode>,
);
