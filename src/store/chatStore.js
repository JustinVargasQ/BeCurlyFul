import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const MAX_STORED = 20;
// Drop saved chat after 24h of inactivity — avoids resurrecting a stale
// conversation when a user comes back days later. Keep recent context for the
// same-day flow ("ya estaba comparando bases hace 2 horas").
const HISTORY_TTL_MS = 24 * 60 * 60 * 1000;
// Show "welcome back" banner only after ≥30min away (avoids being chatty on
// every quick close/open).
const RESUME_THRESHOLD_MS = 30 * 60 * 1000;

// Module-level so we don't pollute persisted state with a non-serializable
// AbortController. Holds the in-flight fetch so closePanel can cancel it.
let activeAbort = null;

const WELCOME = {
  role: 'model',
  content:
    '¡Hola! Soy Curly, tu asesora de rizos ✨ Te ayudo a encontrar el producto ideal para tu cabello rizado: definición, hidratación, limpieza o la línea Kids. ¿Qué buscás hoy?',
};

export function stripSugMarker(text) {
  let result = text;
  // Remove [[sug: ...]] suggestions block (always at the end of the reply)
  const sugIdx = result.indexOf('[[sug');
  if (sugIdx !== -1) result = result.slice(0, sugIdx).trimEnd();
  // Remove invisible meta markers used for stateful flows (restock, etc.)
  result = result.replace(/\[\[restock-ask:[^\]]+\]\]/gi, '').replace(/\n{3,}/g, '\n\n').trim();
  return result;
}

export function extractSuggestions(text) {
  const m = text.match(/\[\[sug:\s*([^\]]+)\]\]/i);
  if (!m) return [];
  return m[1]
    .split('|')
    .map((s) => s.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
    .slice(0, 4);
}

export { WELCOME };

const useChatStore = create(
  persist(
    (set, get) => ({
      messages: [WELCOME],
      loading: false,
      panelOpen: false,
      unread: false,
      lastInteractionAt: 0,
      showResume: false,

      openPanel: () => {
        // Show "welcome back" banner if user is returning after a 30min+ pause
        // and they had a real conversation going (not just the welcome message).
        const s = get();
        const gap = Date.now() - (s.lastInteractionAt || 0);
        const hadRealConvo = s.messages.length > 1 ||
          (s.messages[0] && s.messages[0] !== WELCOME);
        const showResume = hadRealConvo && gap >= RESUME_THRESHOLD_MS && gap < HISTORY_TTL_MS;
        set({ panelOpen: true, unread: false, showResume });
      },
      dismissResume: () => set({ showResume: false }),
      closePanel: () => {
        // Closing the panel mid-stream should also stop the request — keeps
        // the Gemini quota clean and avoids zombie writes after close.
        if (get().loading && activeAbort) {
          try { activeAbort.abort(); } catch {}
          activeAbort = null;
        }
        set({ panelOpen: false });
      },
      togglePanel: () =>
        set((s) => ({ panelOpen: !s.panelOpen, unread: s.panelOpen ? s.unread : false })),

      reset: () => {
        if (activeAbort) {
          try { activeAbort.abort(); } catch {}
          activeAbort = null;
        }
        set({ messages: [WELCOME], loading: false });
      },

      abortSend: () => {
        if (activeAbort) {
          try { activeAbort.abort(); } catch {}
          activeAbort = null;
        }
        set({ loading: false });
      },

      send: async (text) => {
        const trimmed = (text || '').trim();
        if (!trimmed || get().loading) return;

        const userMsg = { role: 'user', content: trimmed };
        const messagesSnapshot = get().messages;
        const next = [...messagesSnapshot, userMsg];

        set({
          messages: [...next, { role: 'model', content: '', streaming: true }],
          loading: true,
          // Any new send dismisses the "welcome back" hint
          showResume: false,
          lastInteractionAt: Date.now(),
        });

        const controller = new AbortController();
        activeAbort = controller;

        try {
          const payload = {
            messages: next
              .filter((m) => m !== WELCOME || next.length > 1)
              .map((m) => ({ role: m.role, content: m.content })),
          };

          // Retry the INITIAL connection only — once we have headers we let the
          // stream proceed. Retrying mid-stream would risk duplicate user-visible
          // responses since the request isn't idempotent (logs a query log).
          // Render free plan can take ~30s to wake; give it 2 retries with
          // exponential backoff (500ms, 1500ms).
          let res;
          let lastErr;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              res = await fetch(`${API_BASE}/chatbot/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal,
              });
              break;
            } catch (e) {
              if (e.name === 'AbortError') throw e;
              lastErr = e;
              if (attempt < 2) {
                await new Promise((r) => setTimeout(r, 500 * (attempt + 1) ** 2));
              }
            }
          }
          if (!res) throw lastErr || new Error('No se pudo conectar.');

          if (!res.ok || !res.body) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.error || 'Hubo un error. Intentá de nuevo en un momento.');
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let fullText = '';
          let streamError = null;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const events = buffer.split('\n\n');
            buffer = events.pop() || '';

            for (const evt of events) {
              const dataLine = evt.split('\n').find((l) => l.startsWith('data: '));
              if (!dataLine) continue;
              const data = dataLine.slice(6);
              if (data === '[DONE]') continue;
              try {
                const json = JSON.parse(data);
                if (json.error) {
                  streamError = json.error;
                  continue;
                }
                if (json.delta) {
                  fullText += json.delta;
                  set((state) => {
                    const copy = [...state.messages];
                    const lastIdx = copy.length - 1;
                    if (lastIdx >= 0 && copy[lastIdx].role === 'model') {
                      copy[lastIdx] = { ...copy[lastIdx], content: fullText };
                    }
                    return { messages: copy };
                  });
                }
              } catch {}
            }
          }

          const suggestions = extractSuggestions(fullText);
          let finalContent;
          if (streamError && !fullText) finalContent = streamError;
          else if (streamError) finalContent = `${fullText}\n\n⚠️ ${streamError}`;
          else finalContent = fullText || 'No pude generar una respuesta. Intentá de nuevo.';

          set((state) => {
            const copy = [...state.messages];
            const lastIdx = copy.length - 1;
            if (lastIdx >= 0 && copy[lastIdx].role === 'model') {
              copy[lastIdx] = {
                role: 'model',
                content: finalContent,
                suggestions: streamError ? [] : suggestions,
              };
            }
            return { messages: copy };
          });

          if (!get().panelOpen) set({ unread: true });
        } catch (err) {
          // Abort by user closing the panel — drop the empty placeholder model
          // message instead of writing an error there.
          if (err.name === 'AbortError' || controller.signal.aborted) {
            set((state) => {
              const copy = [...state.messages];
              const lastIdx = copy.length - 1;
              if (lastIdx >= 0 && copy[lastIdx].role === 'model' && copy[lastIdx].content === '') {
                copy.pop();
              }
              return { messages: copy };
            });
          } else {
            const msg = err.message || 'Hubo un error. Intentá de nuevo en un momento.';
            set((state) => {
              const copy = [...state.messages];
              const lastIdx = copy.length - 1;
              if (lastIdx >= 0 && copy[lastIdx].role === 'model') {
                copy[lastIdx] = { role: 'model', content: msg };
              } else {
                copy.push({ role: 'model', content: msg });
              }
              return { messages: copy };
            });
          }
        } finally {
          if (activeAbort === controller) activeAbort = null;
          set({ loading: false });
        }
      },
    }),
    {
      name: 'bcf-chatbot-history',
      partialize: (state) => ({
        messages: state.messages.slice(-MAX_STORED),
        savedAt: Date.now(),
        lastInteractionAt: state.lastInteractionAt || Date.now(),
      }),
      // Reset to a fresh welcome if the saved chat is older than HISTORY_TTL_MS.
      // Stale chats from days ago lead to confusing responses ("seguís buscando
      // labiales rojos?" when the user has no memory of asking).
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const savedAt = state.savedAt || 0;
        if (!savedAt || Date.now() - savedAt > HISTORY_TTL_MS) {
          state.messages = [WELCOME];
          state.lastInteractionAt = 0;
        } else {
          // Keep last interaction time so the "welcome back" banner can fire
          state.lastInteractionAt = savedAt;
        }
        // Always start with panel closed and not loading after a reload — even
        // if the previous tab crashed mid-stream we don't want a stuck spinner.
        state.loading = false;
        state.panelOpen = false;
        state.showResume = false; // openPanel decides whether to show it
      },
    }
  )
);

export default useChatStore;
