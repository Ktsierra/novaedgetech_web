import { renderToString } from 'react-dom/server';
import App from './App.tsx';

/** build-time render of the page markup, so crawlers get the real headings and copy without running JS */
export const render = () => renderToString(<App />);
