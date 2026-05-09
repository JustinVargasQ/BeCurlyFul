import api from './api';

/* Module-level cache + in-flight map. Dedups product fetches across components
 * so a chatbot reply with N product cards + a combo button doesn't fire 2N
 * round-trips. Multiple slugs requested in the same tick are coalesced into a
 * single /products/batch call. */

const cache = new Map();      // slug → product (resolved data)
const failed = new Set();     // slug → marked unavailable (skip refetch)
const inflight = new Map();   // slug → Promise<product|null>

let pendingSlugs = new Set();
let pendingPromise = null;

function flushBatch() {
  const slugs = [...pendingSlugs];
  pendingSlugs = new Set();
  pendingPromise = null;
  if (slugs.length === 0) return;
  api
    .get(`/products/batch?slugs=${encodeURIComponent(slugs.join(','))}`)
    .then((r) => {
      const products = Array.isArray(r.data?.products) ? r.data.products : [];
      const missing  = Array.isArray(r.data?.missing)  ? r.data.missing  : [];
      const found = new Set();
      for (const p of products) {
        if (!p || !p.slug) continue;
        cache.set(p.slug, p);
        found.add(p.slug);
        const fly = inflight.get(p.slug);
        if (fly && fly._resolve) fly._resolve(p);
        inflight.delete(p.slug);
      }
      for (const s of missing) {
        failed.add(s);
        const fly = inflight.get(s);
        if (fly && fly._resolve) fly._resolve(null);
        inflight.delete(s);
      }
      // Anything still pending wasn't returned — treat as missing
      for (const s of slugs) {
        if (!found.has(s) && !failed.has(s)) {
          failed.add(s);
          const fly = inflight.get(s);
          if (fly && fly._resolve) fly._resolve(null);
          inflight.delete(s);
        }
      }
    })
    .catch(() => {
      // On error, mark all pending slugs failed so consumers don't hang
      for (const s of slugs) {
        const fly = inflight.get(s);
        if (fly && fly._resolve) fly._resolve(null);
        inflight.delete(s);
        failed.add(s);
      }
    });
}

export function getProduct(slug) {
  if (!slug) return Promise.resolve(null);
  if (cache.has(slug)) return Promise.resolve(cache.get(slug));
  if (failed.has(slug)) return Promise.resolve(null);
  if (inflight.has(slug)) return inflight.get(slug);

  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  promise._resolve = resolve;
  inflight.set(slug, promise);
  pendingSlugs.add(slug);

  if (!pendingPromise) {
    // Coalesce all slug requests in the current tick into one batch call
    pendingPromise = Promise.resolve().then(flushBatch);
  }
  return promise;
}

/* Prefetch a list of slugs in one batch — useful when a chatbot message arrives
 * with multiple [[slug]] tokens and we want them all warm before render. */
export function prefetchProducts(slugs) {
  return Promise.all((slugs || []).map(getProduct));
}

/* For tests / debug */
export function _resetCache() {
  cache.clear();
  failed.clear();
  inflight.clear();
  pendingSlugs = new Set();
  pendingPromise = null;
}
