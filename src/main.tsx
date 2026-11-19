import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import './index.css';
import { App } from './App';
import { StoreProvider } from './state/StoreProvider';
import { createStore } from './state/store';
import { LocalStorageRepository } from './data/repository';
import { ToastProvider } from './components/ui/Toast';

const store = createStore(new LocalStorageRepository());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider store={store}>
      <BrowserRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrowserRouter>
    </StoreProvider>
  </StrictMode>,
);
