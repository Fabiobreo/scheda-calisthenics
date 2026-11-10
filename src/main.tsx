import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './styles.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { RestTimerProvider } from './app/restTimer';
import { SessionProvider } from './app/session';
import { ToastProvider } from './app/toast';

const queryClient = new QueryClient({
  defaultOptions: {
    // gcTime lungo: i dati di una pagina non aperta da un po' restano in cache, e quindi nella copia sul telefono (ticket 27)
    queries: { staleTime: 30_000, retry: 2, gcTime: 24 * 60 * 60 * 1000 },
  },
});

// Cache salvata sul telefono (ticket 27): si scarica a parte per non pesare sul primo disegno; arriva comunque prima
// della sessione, che si legge in modo asincrono, quindi le viste partono già con gli ultimi dati.
void import('./data/sync').then((m) => m.persistCache(queryClient, `${__APP_VERSION__}-${__APP_COMMIT__}`));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <RestTimerProvider>
            <SessionProvider>
              <App />
            </SessionProvider>
          </RestTimerProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
