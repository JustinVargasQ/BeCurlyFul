const { GoogleGenerativeAI } = require('@google/generative-ai');
const Product = require('../models/Product');
const ChatbotQuery = require('../models/ChatbotQuery');
const RestockRequest = require('../models/RestockRequest');

/* Kinds that indicate the bot couldn't actually resolve the user's question.
 * Used both for analytics (so admin sees the catalog gaps) and to gate the
 * frontend WhatsApp escalation banner. */
const FAILED_KINDS = new Set([
  'no_match', 'no_more', 'change_no_alt', 'vague_recommendation',
  // 'fallback' is set when AI fails and we serve local search — also a "miss"
]);

/* Fire-and-forget log of a query outcome. Never blocks the response. */
function logQuery(text, kind, resolved) {
  if (!text || typeof text !== 'string') return;
  const trimmed = text.trim().slice(0, 500);
  if (!trimmed) return;
  ChatbotQuery.create({ text: trimmed, kind, resolved })
    .catch((err) => console.warn('⚠️  No se pudo loguear query:', err.message));
}

/* Whether a final reply text actually surfaced products or actionable links. */
function replyResolves(text) {
  if (!text || typeof text !== 'string') return false;
  // Strip [[sug:...]] before checking — suggestions don't count as a resolution
  const stripped = text.replace(/\[\[sug:[^\]]+\]\]/gi, '');
  return /\[\[(combo:|link:|[a-z0-9-]+\]\])/i.test(stripped);
}

const GEMINI_KEY = process.env.GEMINI_API_KEY;
// gemini-2.0-flash: rápido, sin "thinking mode" (que consume tokens del output budget)
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

let genAI = null;
if (GEMINI_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_KEY);
  console.log(`🤖 Chatbot inicializado — modelo: ${MODEL_NAME}`);
} else {
  console.warn('⚠️  GEMINI_API_KEY no configurada — el chatbot no funcionará');
}

/* ─── Catalog cache (refresh every 5 min) ─── */
let catalogCache = { data: null, ts: 0 };
const CATALOG_TTL = 5 * 60 * 1000;

async function getCatalogContext() {
  const now = Date.now();
  if (catalogCache.data && now - catalogCache.ts < CATALOG_TTL) {
    return catalogCache.data;
  }
  const products = await Product.find({ isActive: true })
    .select('name slug brand category price oldPrice description features tags stock badge rating reviewCount')
    .sort({ createdAt: -1 })
    .lean();

  const compact = products.map((p) => ({
    nombre: p.name,
    slug: p.slug,
    marca: p.brand,
    categoria: p.category,
    precio: p.price,
    precioAnterior: p.oldPrice || undefined,
    descripcion: (p.description || '').slice(0, 250),
    caracteristicas: (p.features || []).slice(0, 5),
    tags: (p.tags || []).map((t) => String(t).toLowerCase().trim()).filter(Boolean),
    stock: p.stock === null ? 'disponible' : (p.stock > 0 ? `${p.stock} disponibles` : 'agotado'),
    badge: p.badge || undefined,
    rating: p.rating || undefined,
    reviewCount: p.reviewCount || 0,
  }));

  catalogCache = { data: compact, ts: now };
  console.log(`📦 Catálogo cargado: ${compact.length} productos activos`);
  return compact;
}

/* Force a fresh catalog load (called when products change) */
exports.invalidateCatalog = () => {
  catalogCache = { data: null, ts: 0 };
};

/* ─── Admin insights — surface what users ask, what fails, where catalog gaps exist ─── */
exports.adminInsights = async (req, res, next) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totals, topFailed, topResolved, byKind] = await Promise.all([
      // Totals + resolution rate
      ChatbotQuery.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: {
            _id: null,
            total:    { $sum: 1 },
            resolved: { $sum: { $cond: ['$resolved', 1, 0] } },
        } },
      ]),
      // Top failed queries (the gold mine — what users ask that we can't answer)
      ChatbotQuery.aggregate([
        { $match: { createdAt: { $gte: since }, resolved: false } },
        { $group: {
            _id: { $toLower: { $trim: { input: '$text' } } },
            count: { $sum: 1 },
            kinds: { $addToSet: '$kind' },
            lastSeen: { $max: '$createdAt' },
        } },
        { $sort: { count: -1, lastSeen: -1 } },
        { $limit: 25 },
      ]),
      // Top resolved queries (what's working — useful to know what features land)
      ChatbotQuery.aggregate([
        { $match: { createdAt: { $gte: since }, resolved: true } },
        { $group: {
            _id: { $toLower: { $trim: { input: '$text' } } },
            count: { $sum: 1 },
        } },
        { $sort: { count: -1 } },
        { $limit: 15 },
      ]),
      // Distribution by kind
      ChatbotQuery.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$kind', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const total    = totals[0]?.total || 0;
    const resolved = totals[0]?.resolved || 0;
    const rate     = total > 0 ? Math.round((resolved / total) * 100) : null;

    res.json({
      days,
      total,
      resolved,
      resolutionRate: rate,
      topFailed:   topFailed.map((x)   => ({ text: x._id, count: x.count, kinds: x.kinds, lastSeen: x.lastSeen })),
      topResolved: topResolved.map((x) => ({ text: x._id, count: x.count })),
      byKind:      byKind.map((x)      => ({ kind: x._id, count: x.count })),
    });
  } catch (err) { next(err); }
};

/* ─── Catalog filtering — reduce tokens sent to Gemini ─── */
const MAX_PRODUCTS_IN_CONTEXT = 35;

function normalizeText(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // strip accents
}

const CATEGORY_KEYWORDS = {
  labios:   ['labial','labiales','labio','labios','gloss','glosses','lipstick','lipsticks','tinta','tintas','tint','lip','brillo','brillos','barra','barras','pintalabios','rouge'],
  ojos:     ['sombra','sombras','mascara','mascaras','pestana','pestanas','pestanina','pestaninas','eyeliner','eyeliners','delineador','delineadores','ceja','cejas','eyeshadow','rimmel','kohl'],
  rostro:   ['base','bases','rubor','ruborizador','iluminador','iluminadores','corrector','correctores','polvo','polvos','contorno','contornos','bronzer','bronzers','primer','primers','foundation','blush','blushes','highlighter','cubre','ojeras','colorete','coloretes','bb','cc'],
  skincare: ['skincare','crema','cremas','serum','serums','hidratante','hidratantes','limpiador','limpiadores','limpieza','tonico','tonicos','mascarilla','mascarillas','protector','solar','spf','retinol','niacinamida','vitamina','exfoliante','exfoliantes','acne','antiage','antiarrugas','manchas','piel','contorno-ojos','aceite','aceites'],
  cabello:  ['shampoo','shampoos','champu','champus','acondicionador','acondicionadores','tinte','tintes','cabello','pelo','capilar','tratamiento','tratamientos','keratina','queratina','aceite','serum-capilar','peinado','peine','cepillo','cepillos'],
};

const STOPWORDS = new Set([
  'que','cual','cuales','me','te','se','lo','la','los','las','el','un','una','unos','unas',
  'de','del','al','en','con','sin','por','para','es','son','soy','tengo','tenes','hay','busco',
  'quiero','quieres','queres','recomendas','recomienda','recomiendas','mi','tu','su','y','o',
  'pero','si','no','mas','menos','algo','todo','todos','todas','mucho','poco','muy','puedo',
  'puedes','podes','dame','dale','muestra','mostrame','ver','vi','hola','gracias','ayuda',
  'ayudame','quisiera','necesito','este','esta','esto','ese','esa','eso','aqui','alli','colones',
]);

/* Extract a price ceiling from natural language: "10 mil", "10000", "menos de 5000",
 * "tengo 20" (interpreted as 20 mil in CR context). */
function detectPriceCeiling(text) {
  const norm = normalizeText(text);
  const milMatch = norm.match(/(\d+(?:[.,]\d+)?)\s*mil/);
  if (milMatch) return Math.round(parseFloat(milMatch[1].replace(',', '.')) * 1000);
  const num = norm.match(/\b(\d{4,7})\b/);
  if (num) return parseInt(num[1], 10);
  // "tengo 20" / "5 colones" / "presupuesto 30" — short numbers (1-99) in a
  // budget context are treated as X mil. Beauty products ≤ ₡99 don't exist.
  if (/\b(tengo|tenia|tendria|presupuesto|gastar|gasto|invertir|llevo|llevarme|alcanzo|alcanza|tope|maximo|máximo)\b/.test(norm)) {
    const short = norm.match(/\b(\d{1,3})\b/);
    if (short) {
      const v = parseInt(short[1], 10);
      if (v >= 1 && v <= 99) return v * 1000;
    }
  }
  return null;
}

function detectCategories(tokens) {
  const cats = new Set();
  for (const tok of tokens) {
    for (const [cat, keys] of Object.entries(CATEGORY_KEYWORDS)) {
      // Exact match OR token starts with keyword (handles diminutives like "cremitas", "labialitos")
      if (keys.some((k) => tok === k || (k.length >= 4 && tok.startsWith(k)))) {
        cats.add(cat);
      }
    }
  }
  return cats;
}

/* Score every product against the user's query — used by both filterCatalog and ruleBasedBrowse */
function scoreCatalog(allProducts, userText) {
  const norm = normalizeText(userText);
  const tokens = norm.split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  const categories = detectCategories(tokens);
  const priceCap = detectPriceCeiling(userText);
  const wantsOffer = /\b(oferta|ofertas|descuento|promo|barato|baratos)\b/.test(norm);

  return allProducts.map((p) => {
    const tagsList = Array.isArray(p.tags) ? p.tags.map(normalizeText) : [];
    const haystack = normalizeText(
      `${p.nombre} ${p.marca} ${p.categoria} ${p.descripcion} ${(p.caracteristicas || []).join(' ')} ${p.badge || ''}`
    );

    let score = 0;
    if (categories.size > 0 && categories.has(p.categoria)) score += 10;
    for (const tok of tokens) {
      if (haystack.includes(tok)) score += 2;
      // Tags weigh more than name/desc — they're owner-curated, high signal
      if (tagsList.includes(tok)) score += 8;
    }
    if (priceCap) {
      if (p.precio <= priceCap) score += 3;
      else score -= 5;
    }
    // Boost discounted products if user mentioned "ofertas/descuento"
    if (wantsOffer && p.precioAnterior && p.precioAnterior > p.precio) score += 5;
    if (p.stock === 'agotado') score -= 2;
    // Social proof: only count rating when there's an actual review base —
    // otherwise default rating=5 makes every product look equally great.
    if (p.reviewCount > 0 && p.rating > 0) {
      score += (p.rating - 3) * 0.4 + Math.min(p.reviewCount, 30) * 0.05;
    }

    return { p, score };
  });
}

/* Score & filter the catalog based on the user's recent messages — for AI context */
function filterCatalog(allProducts, userText) {
  const norm = normalizeText(userText);
  const tokens = norm.split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  const categories = detectCategories(tokens);
  const priceCap = detectPriceCeiling(userText);

  // Generic / vague query (greeting, no keywords) — return curated top
  if (tokens.length === 0 && categories.size === 0 && !priceCap) {
    return [...allProducts]
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, MAX_PRODUCTS_IN_CONTEXT);
  }

  const scored = scoreCatalog(allProducts, userText);
  let filtered = scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score);

  // Pad with top-rated if we matched too few
  if (filtered.length < 10) {
    const seen = new Set(filtered.map((x) => x.p.slug));
    const padding = allProducts
      .filter((p) => !seen.has(p.slug))
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, MAX_PRODUCTS_IN_CONTEXT - filtered.length)
      .map((p) => ({ p, score: 0 }));
    filtered = [...filtered, ...padding];
  }

  return filtered.slice(0, MAX_PRODUCTS_IN_CONTEXT).map((x) => x.p);
}

/* ─── Browse intent — simple product search without AI ─── */

// Common product nouns/keywords beyond the strict category list (perfumes, accesorios, etc.)
const BROWSE_KEYWORDS = [
  'perfume', 'perfumes', 'fragancia', 'fragancias', 'colonia', 'colonias',
  'maquillaje', 'cosmetico', 'cosmeticos', 'accesorio', 'accesorios',
  'oferta', 'ofertas', 'descuento', 'promocion', 'promo',
];

/* Detect queries that genuinely benefit from AI (comparisons, tutorials, multi-condition).
 * Default is rule-based; AI is the fallback for hard cases. */
function needsAI(text) {
  if (!text) return false;
  const norm = normalizeText(text);

  // Explicit comparisons
  if (/\b(comparar|comparame|comparalo|comparen|diferencia entre|diferencias entre|cual.{0,5}elegir|cual.{0,5}mejor|vs\b|versus|en lugar de|o el otro)\b/.test(norm)) return true;

  // Tutorial / educational / how-to
  if (/\b(como se (aplica|usa|usan|hace|hacen|aplican)|como (aplicar|usar|hacer|funciona|combinar|mezclar)|que orden|en que orden|paso a paso|tutorial|rutina|cuanto (tiempo|dura|tarda)|cada cuanto|cuantas veces|cuanta cantidad|hablame de|cuentame de|que es (el|la|esto)|para que sirve|me explicas|explicame|combinar con)\b/.test(norm)) return true;

  // Multiple skin/hair/age conditions in one query
  const conditions = ['piel grasa','piel seca','piel mixta','piel madura','piel sensible','piel deshidratada','acne','rosacea','manchas','arrugas','poros','ojeras','melasma','barros','granos','espinillas','flacidez','cabello seco','cabello graso','cabello tenido','cabello rizado','cabello dañado','cabello quebradizo','caida del cabello','caspa'];
  const matched = conditions.filter((c) => norm.includes(c)).length;
  if (matched >= 2) return true;

  // Very long queries
  if (text.length > 150) return true;

  return false;
}

/* "Qué me recomendás" sin contexto, o clicks de sugerencias genéricas
 * (botones tipo "Otra categoría", "Algo diferente") — invitan a especificar */
function isVagueRecommendation(text) {
  const norm = normalizeText(text).trim().replace(/[!.?¿¡,]+/g, '').trim();

  // "Recomendame algo" / "Qué me recomendás" alone
  if (/^(que me (recomenda|recomendas|recomienda|sugeris)|recomendame algo|recomienda algo|sugerime algo|que sugeris|alguna sugerencia|alguna recomendacion|recomendacion|que comprar|que me llevo|que llevo|me ayudas)( por favor| porfa)?$/i.test(norm)) return true;

  // Generic click-throughs from suggestion buttons
  if (/^(otra categoria|otra opcion|algo diferente|algo distinto|quiero ver otra cosa|otra cosa|cambiar de categoria|otra)$/i.test(norm)) return true;

  return false;
}

const VAGUE_RECOMMENDATION_REPLY = '¿Qué tipo de producto buscás hoy? Decime y te muestro lo mejor que tengo 💕\n\n💄 **Maquillaje** — labiales, bases, sombras, rubor\n🧴 **Skincare** — cremas, serums, protector solar\n🌸 **Perfumes** — fragancias para todos los gustos\n💇 **Cabello** — shampoos, tratamientos\n\n[[sug: Mostrame maquillaje | Quiero skincare | Ver perfumes | Productos para cabello]]';

/* Extract slugs the bot already showed in prior model messages (excludes [[sug: ...]] markers) */
function extractShownSlugs(messages) {
  const shown = new Set();
  if (!Array.isArray(messages)) return shown;
  for (const m of messages) {
    if (!m || m.role !== 'model' || typeof m.content !== 'string') continue;
    const stripped = m.content.replace(/\[\[sug:[^\]]+\]\]/gi, '');
    const re = /\[\[([a-z0-9-]+)\]\]/gi;
    let match;
    while ((match = re.exec(stripped)) !== null) shown.add(match[1]);
  }
  return shown;
}

/* Find the dominant category of the most recently shown products — used by the
 * "show more" intent so the bot stays in the same topic when the user says "más". */
function findLastShownCategory(messages, allCatalog) {
  if (!Array.isArray(messages) || !Array.isArray(allCatalog)) return null;
  const slugIndex = new Map(allCatalog.map((p) => [p.slug, p.categoria]));
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!m || m.role !== 'model' || typeof m.content !== 'string') continue;
    const stripped = m.content.replace(/\[\[sug:[^\]]+\]\]/gi, '');
    const slugs = [...stripped.matchAll(/\[\[([a-z0-9-]+)\]\]/gi)].map((x) => x[1]);
    if (slugs.length === 0) continue;
    const counts = {};
    for (const s of slugs) {
      const cat = slugIndex.get(s);
      if (cat) counts[cat] = (counts[cat] || 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) return sorted[0][0];
  }
  return null;
}

/* Essentials per category — used by the budget-combo builder. Each entry is a
 * "subtype" we try to fill once. Matches against PRODUCT_TYPE_SYNONYMS below. */
const ESSENTIALS_BY_CATEGORY = {
  maquillaje: ['base', 'labial', 'sombra', 'rubor', 'corrector'],
  rostro:     ['base', 'corrector', 'rubor', 'iluminador', 'polvo'],
  labios:     ['labial', 'gloss', 'tinta', 'balsamo'],
  ojos:       ['mascara', 'sombra', 'delineador'],
  skincare:   ['limpiador', 'tonico', 'hidratante', 'protector', 'serum'],
  cabello:    ['shampoo', 'acondicionador', 'tratamiento'],
  perfumes:   ['perfume'],
};

/* True if the message is essentially "I have ₡X" with no category, type, brand
 * keyword, or offer signal — i.e. a pure budget statement. */
function isBudgetOnlyQuery(text) {
  if (!text) return false;
  const cap = detectPriceCeiling(text);
  if (cap === null) return false;
  const norm = normalizeText(text);
  const tokens = norm.split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  const cats = detectCategories(tokens);
  const productTypes = tokens.filter((t) => PRODUCT_TYPE_KEYWORDS.has(t));
  const hasBrowseKw = tokens.some((t) => BROWSE_KEYWORDS.includes(t));
  const wantsOffer = /\b(oferta|ofertas|descuento|promo|barato|baratos)\b/.test(norm);
  return cats.size === 0 && productTypes.length === 0 && !hasBrowseKw && !wantsOffer;
}

/* Build a curated 2-4 product pack within budget, prioritizing essentials of
 * the requested category. Returns { picked, total, missing } — `missing` lists
 * subtypes we couldn't fill because nothing fit the remaining budget. */
function buildBudgetCombo(category, budget, allCatalog, excludeSlugs = new Set()) {
  if (!Array.isArray(allCatalog) || allCatalog.length === 0) return null;

  // Map "maquillaje" requests to multi-category candidates so we can mix
  // base + labial + sombra (which live in rostro/labios/ojos categories).
  const categoryPool = (() => {
    if (category === 'maquillaje') return ['rostro', 'labios', 'ojos', 'maquillaje'];
    if (category === 'mix' || category === 'variado') return ['rostro', 'labios', 'ojos', 'skincare', 'cabello', 'perfumes', 'maquillaje'];
    return [category];
  })();

  const inPool = allCatalog.filter(
    (p) => categoryPool.includes(p.categoria) &&
           p.precio <= budget &&
           p.stock !== 'agotado' &&
           !excludeSlugs.has(p.slug)
  );
  if (inPool.length === 0) return null;

  // Demote accessories/bundles for combo curation
  const isAccessory = (p) => {
    const n = normalizeText(p.nombre);
    return ACCESSORY_KEYWORDS.some((a) => n.includes(a));
  };
  const isBundle = (p) => {
    const words = normalizeText(p.nombre).split(/\s+/);
    return BUNDLE_KEYWORDS.some((b) => words.includes(b));
  };

  const subtypes = ESSENTIALS_BY_CATEGORY[category] || ESSENTIALS_BY_CATEGORY.maquillaje;
  const picked = [];
  const missing = [];
  let total = 0;

  for (const sub of subtypes) {
    const remaining = budget - total;
    if (remaining < 500) break; // not worth packing more

    const synonyms = (PRODUCT_TYPE_SYNONYMS[sub] || [sub]).map(normalizeText);
    const candidates = inPool
      .filter((p) => !picked.find((x) => x.slug === p.slug))
      .filter((p) => p.precio <= remaining)
      .filter((p) => {
        const hay = normalizeText(`${p.nombre} ${p.descripcion || ''} ${(p.caracteristicas || []).join(' ')}`);
        return synonyms.some((s) => hay.includes(s));
      })
      .map((p) => ({
        p,
        bias:
          (isAccessory(p) ? -10 : 0) +
          (isBundle(p)    ? -3  : 0) +
          (p.rating || 0) * 1.5 +
          (p.precioAnterior && p.precioAnterior > p.precio ? 1 : 0),
      }))
      .sort((a, b) => b.bias - a.bias || a.p.precio - b.p.precio);

    if (candidates.length > 0) {
      picked.push(candidates[0].p);
      total += candidates[0].p.precio;
    } else {
      missing.push(sub);
    }
    if (picked.length >= 4) break;
  }

  // If we picked nothing essential, fall back to top 2-3 highest-rated products
  // in the category that fit the budget.
  if (picked.length === 0) {
    const fallback = inPool
      .filter((p) => !isAccessory(p) && !isBundle(p))
      .sort((a, b) => (b.rating || 0) - (a.rating || 0) || a.precio - b.precio);
    let acc = 0;
    for (const p of fallback) {
      if (acc + p.precio > budget) continue;
      picked.push(p);
      acc += p.precio;
      if (picked.length >= 3) break;
    }
    total = acc;
  }

  return picked.length > 0 ? { picked, total, missing } : null;
}

/* Detect the user picking a category in the middle of a budget conversation.
 * Looks at recent messages: if a budget was mentioned and the user replies with
 * a category-only message, we know they want a combo. */
function findBudgetInHistory(messages) {
  if (!Array.isArray(messages)) return null;
  const userMsgs = messages.filter((m) => m && m.role === 'user' && typeof m.content === 'string');
  for (let i = userMsgs.length - 1; i >= 0; i--) {
    const cap = detectPriceCeiling(userMsgs[i].content);
    if (cap !== null) return cap;
  }
  return null;
}

/* Find the slugs of the most recent combo presented by the bot. Used by the
 * "cambiar un producto" flow to know which products are currently in the user's
 * curated pack. */
function findLastComboSlugs(messages) {
  if (!Array.isArray(messages)) return [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!m || m.role !== 'model' || typeof m.content !== 'string') continue;
    const match = m.content.match(/\[\[combo:\s*([a-z0-9,\-\s]+)\]\]/i);
    if (match) {
      return [...new Set(match[1].split(',').map((s) => s.trim()).filter(Boolean))];
    }
  }
  return [];
}

/* Best-guess subtype label for a product based on what synonyms appear in its
 * name/description. Returns "base", "labial", "limpiador", etc., or null. */
const SUBTYPE_DETECTION_ORDER = [
  'base','foundation','labial','gloss','tinta','balsamo','sombra','mascara','rimmel',
  'delineador','rubor','corrector','iluminador','primer','polvo',
  'limpiador','tonico','hidratante','protector','serum','exfoliante','mascarilla','contorno','aceite',
  'shampoo','acondicionador','tratamiento','keratina',
  'perfume','colonia','fragancia','jabon',
];
function getProductSubtype(product) {
  if (!product) return null;
  const hay = normalizeText(`${product.nombre || ''} ${product.descripcion || ''}`);
  for (const sub of SUBTYPE_DETECTION_ORDER) {
    const syns = (PRODUCT_TYPE_SYNONYMS[sub] || [sub]).map(normalizeText);
    if (syns.some((s) => hay.includes(s))) return sub;
  }
  return null;
}

/* Detect "change product" intents — either a generic ask or a specific subtype. */
function detectChangeIntent(text) {
  const norm = normalizeText(text).trim().replace(/[!.?¿¡,]+/g, '').trim();
  if (/^(cambiar un producto|cambiar otro producto|cambiar producto|cambiar algo|cambiar alguno|cambiar otra cosa|otro producto|cambia algo|quiero cambiar|cambiar)$/i.test(norm)) {
    return { kind: 'ask_which' };
  }
  // "Cambiar la base", "otra base", "no quiero esa base", "cambiar base", "no me gusta el labial"
  const m1 = norm.match(/^(?:cambiar|cambia|otra|otro|no quiero|no me gusta|reemplazar|reemplaza)\s+(?:la|el|los|las|esa|ese|esto|este|un|una|unos|unas|esta|estos|estas)?\s*([a-z]+)$/i);
  if (m1 && PRODUCT_TYPE_KEYWORDS.has(m1[1])) return { kind: 'swap', subtype: m1[1] };
  // Subtype alone after a "cambiar" prompt — e.g. user clicks "Cambiar base" sug, sends "Cambiar base"
  const m2 = norm.match(/^cambiar\s+([a-z]+)$/i);
  if (m2 && PRODUCT_TYPE_KEYWORDS.has(m2[1])) return { kind: 'swap', subtype: m2[1] };
  return null;
}

/* Detect price-refinement intents — "más baratos", "los más caros", etc. */
function detectPriceRefinement(text) {
  const norm = normalizeText(text).trim().replace(/[!.?¿¡,]+/g, '').trim();
  if (/^(mas baratos?|mas baratas?|mas economic[oa]s?|baratos?|baratas?|economic[oa]s?|los baratos|las baratas|de los baratos|algo barato)$/i.test(norm)) return 'cheaper';
  if (/^(mas caros?|mas caras?|los mas caros?|las mas caras?|premium|de lujo|los caros|las caras|algo (mas )?caro)$/i.test(norm)) return 'pricier';
  return null;
}

/* Refine the previous browse by sorting price asc/desc within the same context.
 * Pulls category from the last shown combo (preferred) or last user category mention. */
function priceRefinementBrowse(messages, allCatalog, sortMode) {
  if (!Array.isArray(allCatalog) || allCatalog.length === 0) return null;
  const shown = extractShownSlugs(messages);
  const lastBudget = findBudgetInHistory(messages);

  // Resolve the active category from combo first, then from last user msg with a category
  let categoryFilter = null;
  const lastComboSlugs = findLastComboSlugs(messages);
  if (lastComboSlugs.length > 0) {
    const cats = new Set();
    for (const s of lastComboSlugs) {
      const p = allCatalog.find((x) => x.slug === s);
      if (p && p.categoria) cats.add(p.categoria);
    }
    if (cats.size > 0) categoryFilter = [...cats];
  }
  if (!categoryFilter) {
    const userMsgs = messages.filter((m) => m && m.role === 'user' && typeof m.content === 'string');
    for (let i = userMsgs.length - 1; i >= 0; i--) {
      const norm = normalizeText(userMsgs[i].content);
      const tokens = norm.split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !STOPWORDS.has(t));
      const cats = detectCategories(tokens);
      if (cats.size > 0) { categoryFilter = [...cats]; break; }
    }
  }
  if (!categoryFilter || categoryFilter.length === 0) return null;

  let pool = allCatalog.filter((p) =>
    categoryFilter.includes(p.categoria) &&
    !shown.has(p.slug) &&
    p.stock !== 'agotado' && p.stock !== 0 &&
    (!lastBudget || p.precio <= lastBudget)
  );

  // Hard-filter accessories/bundles for price refinement — user is asking for
  // real product picks, not algodones or kits.
  pool = pool.filter((p) => {
    const n = normalizeText(p.nombre);
    const isAccessory = ACCESSORY_KEYWORDS.some((a) => n.includes(a));
    const words = n.split(/\s+/);
    const isBundle = BUNDLE_KEYWORDS.some((b) => words.includes(b));
    return !isAccessory && !isBundle;
  });

  if (pool.length === 0) return null;

  pool.sort((a, b) =>
    sortMode === 'cheaper' ? a.precio - b.precio : b.precio - a.precio
  );

  const top = pool.slice(0, 4);
  const list = top.map((p) => `[[${p.slug}]]`).join('\n');
  const intro = sortMode === 'cheaper' ? '💸 Estos son los más económicos que tengo' : '✨ Estos son los más premium que tengo';
  return `${intro}:\n${list}\n\n¿Te gusta alguno?\n\n[[sug: Mostrame más | Otra categoría | ${sortMode === 'cheaper' ? 'Algo más premium' : 'Algo más económico'} | Ir al carrito]]`;
}

/* ─── Restock notification flow ───
 * Two-step: (1) bot detects "avisame cuando vuelva" intent + finds the relevant
 * out-of-stock product, asks for phone, embeds invisible [[restock-ask: slug]]
 * marker. (2) on next turn, if user sends a phone number, look up the marker
 * and create the RestockRequest. */

/* "Notify me when back in stock" intent */
function detectRestockIntent(text) {
  const norm = normalizeText(text);
  return /\b(avisame|avisenme|avisar|notificame|notificar|notifica|escribime cuando|escribanme cuando|aviso cuando|cuando vuelva|cuando regrese|cuando este disponible|cuando lo tengan|cuando llegue|cuando recargen|cuando lo repongan|me avisas|nos avisan)\b/i.test(norm);
}

/* CR mobile phone — 8 digits, optionally prefixed with +506 / 506 / spaces or dashes */
function extractCRPhone(text) {
  const digits = String(text || '').replace(/[^\d]/g, '');
  if (/^506\d{8}$/.test(digits)) return digits.slice(3);
  if (/^\d{8}$/.test(digits)) return digits;
  return null;
}

/* Find the most recently mentioned/shown out-of-stock product. Looks at the
 * last 3 user messages for a token match against catalog product names. */
function findRecentAgotadoProduct(messages, allCatalog) {
  if (!Array.isArray(allCatalog)) return null;
  const userMsgs = (messages || [])
    .filter((m) => m && m.role === 'user' && typeof m.content === 'string')
    .slice(-3);
  for (let i = userMsgs.length - 1; i >= 0; i--) {
    const norm = normalizeText(userMsgs[i].content);
    const tokens = norm.split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !STOPWORDS.has(t));
    if (tokens.length === 0) continue;

    // Score each agotado product against the user's tokens
    const candidates = allCatalog
      .filter((p) => p.stock === 'agotado')
      .map((p) => {
        const hay = normalizeText(`${p.nombre} ${p.descripcion || ''} ${p.marca || ''}`);
        const hits = tokens.filter((t) => hay.includes(t)).length;
        return { p, hits };
      })
      .filter((x) => x.hits > 0)
      .sort((a, b) => b.hits - a.hits);
    if (candidates.length > 0) return candidates[0].p;
  }
  return null;
}

/* Handle a restock flow turn. Returns { reply, kind } or null if not applicable.
 * Async because step 2 writes to MongoDB. */
async function handleRestockFlow(messages, allCatalog) {
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const lastUser = [...messages].reverse().find((m) => m && m.role === 'user');
  if (!lastUser || typeof lastUser.content !== 'string') return null;
  const text = lastUser.content;

  // Step 2: phone number response to a prior restock-ask
  const phone = extractCRPhone(text);
  const askedSlug = findRestockAskSlug(messages);
  if (phone && askedSlug) {
    try {
      const result = await saveRestockRequest(askedSlug, phone);
      if (result.error) {
        return {
          reply: `Mmm, no encontré ese producto en el catálogo 🥺 ¿Podés decirme cuál era?\n\n[[sug: Mostrame ofertas | Hablar por WhatsApp]]`,
          kind: 'restock_error',
        };
      }
      const note = result.alreadySubscribed
        ? `Ya estabas anotada para **${result.productName}** 💕 Te avisamos al ${phone} en cuanto llegue.`
        : `¡Listo! Te anotamos para **${result.productName}** 💕 Te escribimos al ${phone} en cuanto llegue.`;
      return {
        reply: `${note}\n\n¿Algo más mientras tanto?\n\n[[sug: Mostrame ofertas | Quiero ver otra cosa | Ir al carrito]]`,
        kind: 'restock_saved',
      };
    } catch (err) {
      console.error('❌ saveRestockRequest:', err.message);
      return {
        reply: `Hubo un problema guardando tu aviso 🥺 Mejor escribinos por WhatsApp y te anotamos a mano.\n\n[[link: Abrir WhatsApp|https://wa.me/50688045100]]\n\n[[sug: Seguir viendo | Mostrame ofertas]]`,
        kind: 'restock_error',
      };
    }
  }

  // Step 1: user expresses "avisame cuando vuelva"
  if (detectRestockIntent(text)) {
    const product = findRecentAgotadoProduct(messages, allCatalog);
    if (product) {
      return {
        reply: `¡Claro! Te aviso cuando vuelva **${product.nombre}** 💕\n\nPasame tu número de WhatsApp (8 dígitos, sin espacios) y te escribimos en cuanto regrese.\n\n[[restock-ask: ${product.slug}]]\n\n[[sug: Hablar por WhatsApp]]`,
        kind: 'restock_ask',
      };
    }
    return {
      reply: `¡Con gusto te aviso! 💕 ¿Cuál producto querés que te notifique cuando vuelva? Decime el nombre.\n\n[[sug: Mostrame ofertas | Hablar por WhatsApp]]`,
      kind: 'restock_no_product',
    };
  }

  return null;
}

/* Read the slug embedded in the bot's last [[restock-ask: slug]] marker */
function findRestockAskSlug(messages) {
  if (!Array.isArray(messages)) return null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!m || m.role !== 'model' || typeof m.content !== 'string') continue;
    const match = m.content.match(/\[\[restock-ask:\s*([a-z0-9-]+)\]\]/i);
    if (match) return match[1];
    // Stop searching after the most recent bot message
    return null;
  }
  return null;
}

/* Create the actual restock subscription. Idempotent (unique index). */
async function saveRestockRequest(productSlug, phone) {
  const product = await Product.findOne({ slug: productSlug, isActive: true });
  if (!product) return { error: 'Producto no encontrado' };
  try {
    await RestockRequest.create({
      product: product._id,
      productName: product.name,
      phone,
    });
    return { ok: true, productName: product.name };
  } catch (err) {
    // Duplicate key — they already subscribed for this product+phone
    if (err.code === 11000) return { ok: true, productName: product.name, alreadySubscribed: true };
    throw err;
  }
}

/* Free-text catalog search — last resort before no_match. Catches product names,
 * brands, and niche terms ("prensas", "moira", "snoopy") that aren't in our
 * hardcoded category/type lists. Returns null if no token matches anything. */
function freeTextSearch(userText, allCatalog, excludeSlugs = new Set()) {
  if (!Array.isArray(allCatalog) || allCatalog.length === 0) return null;
  const norm = normalizeText(userText);
  const tokens = norm
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  if (tokens.length === 0) return null;

  const scored = allCatalog
    .map((p) => {
      const hay = normalizeText(
        `${p.nombre} ${p.descripcion || ''} ${p.marca || ''} ${(p.caracteristicas || []).join(' ')} ${p.badge || ''}`
      );
      let score = 0;
      let nameHits = 0;
      for (const tok of tokens) {
        if (hay.includes(tok)) {
          score += 2;
          if (normalizeText(p.nombre).includes(tok)) {
            score += 3; // name match weighs more than description
            nameHits += 1;
          }
        }
      }
      return { p, score, nameHits };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (b.nameHits - a.nameHits));

  if (scored.length === 0) return null;

  // Prefer products whose name actually contains a query token — avoids
  // matching only a description mention with no real product fit.
  const nameMatches = scored.filter((x) => x.nameHits > 0);
  const pool = nameMatches.length > 0 ? nameMatches : scored;

  let withoutShown = pool.filter((x) => !excludeSlugs.has(x.p.slug));
  if (withoutShown.length === 0) withoutShown = pool;

  const top = withoutShown.slice(0, 4).map((x) => x.p);
  if (top.length === 0) return null;

  const list = top.map((p) => `[[${p.slug}]]`).join('\n');
  return `Mirá lo que encontré:\n${list}\n\n¿Es lo que buscabas o querés algo distinto?\n\n[[sug: Mostrame más | Otra cosa | Ver ofertas | Tengo ₡10 mil]]`;
}

/* ─── Fuzzy typo correction ───
 * Cuando el usuario escribe "labiabes" o "shapoo", intentamos corregir contra
 * el vocabulario conocido (categorías + tipos de producto + atributos). Solo
 * aplica a tokens de ≥4 chars y con distancia ≤ 2. Costo bajo y resultado claro:
 * un typo común no manda al usuario al fallback no_match. */
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  // Early-exit: si la diferencia de longitudes ya supera 2, no nos sirve
  if (Math.abs(a.length - b.length) > 2) return 99;
  const m = a.length, n = b.length;
  let prev = new Array(n + 1);
  let cur  = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

// Vocabulary built once (lazy) — categorías, tipos de producto, atributos.
let _vocabCache = null;
function getFuzzyVocab() {
  if (_vocabCache) return _vocabCache;
  const set = new Set();
  for (const arr of Object.values(CATEGORY_KEYWORDS)) for (const k of arr) set.add(normalizeText(k));
  for (const k of PRODUCT_TYPE_KEYWORDS) set.add(normalizeText(k));
  for (const k of ATTRIBUTE_KEYWORDS) set.add(normalizeText(k));
  for (const k of BROWSE_KEYWORDS) set.add(normalizeText(k));
  // Solo palabras de longitud útil para fuzzy match
  _vocabCache = [...set].filter((w) => w.length >= 4);
  return _vocabCache;
}

/* Devuelve una versión del texto con tokens "raros" reemplazados por su match
 * más cercano del vocabulario. Si no corrige nada, devuelve el texto original. */
function correctTypos(text) {
  if (!text || typeof text !== 'string') return { corrected: text, changed: false };
  const norm = normalizeText(text);
  const vocab = getFuzzyVocab();
  const tokens = norm.split(/[^a-z0-9]+/);
  let changed = false;
  const fixed = tokens.map((tok) => {
    if (tok.length < 4) return tok;
    if (STOPWORDS.has(tok)) return tok;
    if (vocab.includes(tok)) return tok; // ya es válido
    let best = null;
    let bestDist = 3; // umbral: solo aceptamos distancia ≤ 2
    for (const v of vocab) {
      // Skip si la diferencia de longitudes es muy grande
      if (Math.abs(v.length - tok.length) > 2) continue;
      const d = levenshtein(tok, v);
      if (d < bestDist) { bestDist = d; best = v; }
    }
    if (best && bestDist <= 2) {
      changed = true;
      return best;
    }
    return tok;
  });
  return { corrected: fixed.join(' '), changed };
}

/* "Show more" — user wants different products, ideally same category */
function isMoreRequest(text) {
  const norm = normalizeText(text).trim().replace(/[!.?¿¡,]+/g, '').trim();
  if (/^(mas|otros|otras|diferentes|distintos|distintas|nuevos|nuevas|siguiente|siguientes)$/i.test(norm)) return true;
  if (/^(mas opciones|mas productos|mas cosas|hay mas|que mas|que mas tenes|tenes mas|tienen mas|mostrame mas|muestrame mas|ensename mas|ver mas|dame mas|quiero mas|necesito mas|otros productos|otras opciones|alguno mas|alguna mas|que mas hay|que otros tenes|otros que tengas)$/i.test(norm)) return true;
  if (/^(mostrame|muestrame|dame|quiero|ver|ensename) (otros|otras|diferentes|distintos|distintas|mas|alguno mas|alguna mas)( productos| opciones)?$/i.test(norm)) return true;
  return false;
}

/* Specific product-type keywords. When the user names one ("serum", "crema",
 * "labial", "shampoo"), we strictly filter to products whose name/description
 * contains the term (or any synonym below) — so "Quiero serums" doesn't return
 * random skincare. */
const PRODUCT_TYPE_KEYWORDS = new Set([
  // skincare
  'serum','serums','sérum','serúm','crema','cremas','limpiador','limpiadores','tonico','tonicos','tónico','tónicos',
  'mascarilla','mascarillas','exfoliante','exfoliantes','aceite','aceites','hidratante','hidratantes',
  'protector','protectores','solar','solares','bloqueador','bloqueadores','spf','retinol','niacinamida','vitamina',
  'contorno','contornos',
  // labios
  'labial','labiales','labio','labios','gloss','glosses','tinta','tintas','balsamo','balsamos','bálsamo','rouge','brillo','brillos','pintalabios','lip','lipstick',
  // ojos
  'sombra','sombras','mascara','rimmel','delineador','delineadores','eyeliner','eyeliners',
  'pestanina','pestaninas','pestañina','pestañinas','pestañas','pestanas','kohl','eyeshadow',
  // rostro
  'base','bases','rubor','ruborizador','iluminador','iluminadores','corrector','correctores',
  'polvo','polvos','primer','primers','bronzer','bronzers','blush','foundation','colorete','coloretes',
  // cabello
  'shampoo','shampoos','champu','champús','champú','acondicionador','acondicionadores','tratamiento','tratamientos','keratina','queratina',
  // perfumes
  'perfume','perfumes','colonia','colonias','fragancia','fragancias',
  // limpieza corporal
  'jabon','jabones','jabón',
]);

/* Synonyms / stems each product-type token expands into for matching products.
 * Match is haystack.includes(synonym), so short stems ("labio" matches "labios",
 * "labiales", etc). Use this when the bare token wouldn't match the product
 * (e.g. user types "labiales" but products are named "labios"). */
const PRODUCT_TYPE_SYNONYMS = {
  // skincare
  serum: ['serum','sérum'],
  serums: ['serum','sérum'],
  crema: ['crema'],
  cremas: ['crema'],
  hidratante: ['hidratante','crema','moisturizer'],
  hidratantes: ['hidratante','crema','moisturizer'],
  limpiador: ['limpiador','limpieza','cleanser'],
  limpiadores: ['limpiador','limpieza','cleanser'],
  tonico: ['tonico','tónico','toner'],
  tonicos: ['tonico','tónico','toner'],
  mascarilla: ['mascarilla','mask'],
  mascarillas: ['mascarilla','mask'],
  exfoliante: ['exfoliante','exfolia','peeling','scrub'],
  exfoliantes: ['exfoliante','exfolia','peeling','scrub'],
  protector: ['protector','solar','bloqueador','spf','sunscreen'],
  protectores: ['protector','solar','bloqueador','spf','sunscreen'],
  solar: ['protector','solar','bloqueador','spf','sunscreen'],
  solares: ['protector','solar','bloqueador','spf','sunscreen'],
  bloqueador: ['protector','solar','bloqueador','spf'],
  bloqueadores: ['protector','solar','bloqueador','spf'],
  spf: ['protector','solar','bloqueador','spf'],
  contorno: ['contorno','eye cream'],
  contornos: ['contorno','eye cream'],
  aceite: ['aceite','oil'],
  aceites: ['aceite','oil'],
  retinol: ['retinol'],
  niacinamida: ['niacinamida','niacinamide'],
  vitamina: ['vitamin'],
  // labios
  labial: ['labial','labio','lip','gloss','tinta','balsamo','bálsamo','brillo','rouge','pintalabios'],
  labiales: ['labial','labio','lip','gloss','tinta','balsamo','bálsamo','brillo','rouge','pintalabios'],
  labio: ['labial','labio','lip','gloss','tinta','balsamo','bálsamo','brillo','rouge'],
  labios: ['labial','labio','lip','gloss','tinta','balsamo','bálsamo','brillo','rouge'],
  gloss: ['gloss','lip','labio','brillo'],
  glosses: ['gloss','lip','labio','brillo'],
  tinta: ['tinta','tint','labio'],
  tintas: ['tinta','tint','labio'],
  balsamo: ['balsamo','bálsamo','labio','lip','balm'],
  balsamos: ['balsamo','bálsamo','labio','lip','balm'],
  rouge: ['rouge','labial','labio','lip'],
  brillo: ['brillo','gloss','labio','lip'],
  brillos: ['brillo','gloss','labio','lip'],
  pintalabios: ['pintalabios','labial','labio','lip'],
  lip: ['lip','labio','labial','gloss','tinta','balsamo'],
  lipstick: ['lipstick','labial','labio','lip'],
  // ojos
  sombra: ['sombra','eyeshadow'],
  sombras: ['sombra','eyeshadow'],
  mascara: ['mascara','rimmel','pestañ','pestan'],
  rimmel: ['rimmel','mascara','pestañ','pestan'],
  delineador: ['delineador','eyeliner','eye liner','kohl'],
  delineadores: ['delineador','eyeliner','eye liner','kohl'],
  eyeliner: ['eyeliner','delineador','eye liner'],
  eyeliners: ['eyeliner','delineador'],
  pestanina: ['pestañ','pestan','mascara','rimmel'],
  pestaninas: ['pestañ','pestan','mascara','rimmel'],
  pestañina: ['pestañ','pestan','mascara','rimmel'],
  pestañinas: ['pestañ','pestan','mascara','rimmel'],
  pestañas: ['pestañ','pestan','mascara'],
  pestanas: ['pestañ','pestan','mascara'],
  kohl: ['kohl','delineador'],
  eyeshadow: ['eyeshadow','sombra'],
  // rostro
  base: ['base','foundation','bb cream','cc cream'],
  bases: ['base','foundation','bb cream','cc cream'],
  foundation: ['foundation','base'],
  rubor: ['rubor','blush','colorete'],
  ruborizador: ['rubor','blush','colorete'],
  iluminador: ['iluminador','highlighter'],
  iluminadores: ['iluminador','highlighter'],
  corrector: ['corrector','concealer','cubre','ojeras'],
  correctores: ['corrector','concealer','cubre','ojeras'],
  polvo: ['polvo','powder','compacto'],
  polvos: ['polvo','powder','compacto'],
  primer: ['primer','prebase','pre-base'],
  primers: ['primer','prebase'],
  bronzer: ['bronzer','bronceador'],
  bronzers: ['bronzer','bronceador'],
  blush: ['blush','rubor','colorete'],
  colorete: ['colorete','blush','rubor'],
  coloretes: ['colorete','blush','rubor'],
  // cabello
  shampoo: ['shampoo','champu','champú'],
  shampoos: ['shampoo','champu','champú'],
  champu: ['champu','champú','shampoo'],
  champús: ['champu','champú','shampoo'],
  champú: ['champu','champú','shampoo'],
  acondicionador: ['acondicionador','conditioner'],
  acondicionadores: ['acondicionador','conditioner'],
  tratamiento: ['tratamiento','mask capilar','mascarilla','keratina','queratina'],
  tratamientos: ['tratamiento','mascarilla','keratina','queratina'],
  keratina: ['keratina','queratina'],
  queratina: ['keratina','queratina'],
  // perfumes
  perfume: ['perfume','colonia','fragancia','eau de'],
  perfumes: ['perfume','colonia','fragancia','eau de'],
  fragancia: ['fragancia','perfume','colonia','eau de'],
  fragancias: ['fragancia','perfume','colonia','eau de'],
  colonia: ['colonia','perfume','fragancia'],
  colonias: ['colonia','perfume','fragancia'],
  // jabón
  jabon: ['jabon','jabón','soap'],
  jabón: ['jabon','jabón','soap'],
  jabones: ['jabon','jabón','soap'],
};

function expandTypeTokens(typeTokens) {
  const out = new Set();
  for (const t of typeTokens) {
    const syns = PRODUCT_TYPE_SYNONYMS[t] || [t];
    for (const s of syns) out.add(normalizeText(s));
  }
  return [...out];
}

/* Accessory / bundle words — demote when user does a generic category browse,
 * since algodones/vinchas/kits dominate skincare results otherwise. */
const ACCESSORY_KEYWORDS = ['algodon','algodones','vincha','vinchas','panoleta','panoletas','pañoleta','pañoletas','cepillo','cepillos','esponja','esponjas','brocha','brochas','aplicador','aplicadores','sacapunta','sacapuntas'];
const BUNDLE_KEYWORDS = ['kit','kits','set','sets','pack','packs','combo','combos'];

/* Color / attribute keywords — when present, score products whose name/desc match more highly */
const ATTRIBUTE_KEYWORDS = [
  'rojo','rojos','roja','rojas','rosa','rosado','rosados','nude','nudes','marron','marrones',
  'cafe','vino','borgona','coral','corales','fucsia','durazno','melon','melocoton','naranja',
  'morado','morados','violeta','negro','negros','blanco','blancos','dorado','plateado',
  'mate','mates','brillante','brillantes','glossy','satinado','metalico','liquido','liquidos',
  'natural','naturales','nude','intenso','intensos','seco','seca','grasa','grasas','mixta','mixtas',
  'sensible','sensibles','madura','maduras','floral','frutal','dulce','amaderado','citrico',
];

/* Compose a browse-intent reply with up to 4 matching products, or null if no good match.
 * Requires a clear topic signal in the CURRENT message (not just the conversation history) —
 * category, price filter, offer, or browse-keyword. Inherits a price cap from prior context
 * if the current message has another signal but no price.
 * Without a clear current-message topic we return null so AI/fallback can give a smarter answer. */
function ruleBasedBrowse(currentText, priorContextText, allCatalog, opts = {}) {
  if (!Array.isArray(allCatalog) || allCatalog.length === 0) return null;
  const { excludeSlugs = new Set(), strictExclude = false, isMore = false } = opts;

  const norm = normalizeText(currentText);
  const tokens = norm.split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  const cats = detectCategories(tokens);
  const currentPriceCap = detectPriceCeiling(currentText);
  const inheritedPriceCap = currentPriceCap || detectPriceCeiling(priorContextText || '');
  const wantsOffer = /\b(oferta|ofertas|descuento|promo|barato|baratos|barata|baratas)\b/.test(norm);
  const hasBrowseKw = tokens.some((t) => BROWSE_KEYWORDS.includes(t));
  const attrTokens = tokens.filter((t) => ATTRIBUTE_KEYWORDS.includes(t));
  const productTypeTokens = tokens.filter((t) => PRODUCT_TYPE_KEYWORDS.has(t));

  // Inherit category from prior message when current is attribute-only
  // (e.g. "¿Tienen rojos?" after "labiales" → keep labios category).
  let inheritedCatFromPrior = false;
  if (cats.size === 0 && attrTokens.length > 0 && !currentPriceCap && !wantsOffer && !hasBrowseKw && priorContextText) {
    const priorTokens = normalizeText(priorContextText)
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
    const priorCats = detectCategories(priorTokens);
    if (priorCats.size > 0) {
      for (const c of priorCats) cats.add(c);
      inheritedCatFromPrior = true;
    }
  }

  // Need a clear topic in the CURRENT message (or inherited category from prior
  // when user is just refining with an attribute) — otherwise unrelated follow-ups
  // ("quiero hola") would reuse the prior topic.
  if (cats.size === 0 && !currentPriceCap && !wantsOffer && !hasBrowseKw) return null;

  // Build scoring text: current message + inherited price (if not in current) +
  // inherited category words (when current is attribute-only).
  const inheritedCatWords = inheritedCatFromPrior ? [...cats].join(' ') : '';
  const scoreText = `${currentText} ${currentPriceCap ? '' : (inheritedPriceCap || '')} ${inheritedCatWords}`.trim();

  let allScored = scoreCatalog(allCatalog, scoreText)
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  // Boost products whose name/description matches attribute tokens (e.g. "rojo")
  if (attrTokens.length > 0) {
    allScored = allScored.map(({ p, score }) => {
      const hay = normalizeText(`${p.nombre} ${p.descripcion} ${(p.caracteristicas || []).join(' ')}`);
      const hits = attrTokens.filter((a) => hay.includes(a)).length;
      return { p, score: score + hits * 4, attrHits: hits };
    }).sort((a, b) => b.score - a.score);
  }

  // STRICT filter when the user names a specific product type — using synonym
  // expansion so "labiales" matches products named "labios"/"lip"/"gloss"/"tinta".
  // ALSO require category match when one was detected, so "Cremas hidratantes"
  // (skincare) doesn't return "Hidratante de labios" (labios category).
  let productTypeMissing = false;
  if (productTypeTokens.length > 0) {
    const synonyms = expandTypeTokens(productTypeTokens);
    let strict = allScored.filter(({ p }) => {
      // Owner-set tags get priority — a product tagged "serum" matches even
      // when the word "serum" doesn't appear in its name.
      const tagsList = Array.isArray(p.tags) ? p.tags.map(normalizeText) : [];
      if (productTypeTokens.some((t) => tagsList.includes(t))) return true;
      if (synonyms.some((s) => tagsList.includes(s))) return true;
      const hay = normalizeText(`${p.nombre} ${p.descripcion} ${(p.caracteristicas || []).join(' ')}`);
      return synonyms.some((t) => hay.includes(t));
    });
    if (cats.size > 0) {
      const catFiltered = strict.filter(({ p }) => cats.has(p.categoria));
      if (catFiltered.length > 0) strict = catFiltered;
    }
    if (strict.length > 0) {
      const priceFiltered = inheritedPriceCap
        ? strict.filter(({ p }) => p.precio <= inheritedPriceCap)
        : strict;
      allScored = priceFiltered.length > 0 ? priceFiltered : strict;
    } else {
      productTypeMissing = true;
    }
  }

  // Hard-respect the budget when a price cap exists — score-based "-5" isn't
  // enough when no in-budget products of the requested type exist.
  if (inheritedPriceCap) {
    const inBudget = allScored.filter(({ p }) => p.precio <= inheritedPriceCap);
    if (inBudget.length > 0) allScored = inBudget;
  }

  // Demote accessories and bundles when (a) the user did a generic category
  // browse, (b) it's a price-only browse (no category, no type), or (c) the
  // requested type wasn't found and we're showing fallback alternatives.
  // In all three cases we want real picks at the top, not kits/algodones.
  const shouldDemoteFillers = productTypeTokens.length === 0 || productTypeMissing;
  if (shouldDemoteFillers) {
    allScored = allScored.map(({ p, score, ...rest }) => {
      const nameNorm = normalizeText(p.nombre);
      const tagsList = Array.isArray(p.tags) ? p.tags.map(normalizeText) : [];
      const isAccessory = tagsList.includes('accesorio') ||
                          tagsList.includes('accesorios') ||
                          ACCESSORY_KEYWORDS.some((a) => nameNorm.includes(a));
      const nameWords = nameNorm.split(/\s+/);
      const isBundle = tagsList.includes('kit') ||
                       tagsList.includes('set') ||
                       tagsList.includes('combo') ||
                       BUNDLE_KEYWORDS.some((b) => nameWords.includes(b));
      let adj = score;
      if (isAccessory) adj -= 8;
      if (isBundle) adj -= 4;
      return { p, score: adj, ...rest };
    }).sort((a, b) => b.score - a.score);
  }

  if (allScored.length === 0 || allScored[0].score < 3) return null;

  // Skip products already shown in this conversation. Falls back to the full list
  // if filtering would leave us empty (unless caller insists with strictExclude).
  let scored = excludeSlugs.size > 0
    ? allScored.filter((x) => !excludeSlugs.has(x.p.slug))
    : allScored;
  if (scored.length === 0) {
    if (strictExclude) return null; // caller signals "no more" upstream
    scored = allScored;
  }

  const top = scored.slice(0, 4).map((x) => x.p);

  // If user asked for a color/attribute but no top result actually matches it,
  // we'll soften the intro so we don't lie about having "labiales rojos" when we don't.
  const attrMatchedAny = attrTokens.length > 0 && scored.slice(0, 4).some((x) => x.attrHits > 0);
  const attrAskedButMissing = attrTokens.length > 0 && !attrMatchedAny;

  const labels = {
    labios:   'en labios',
    ojos:     'para los ojos',
    rostro:   'para el rostro',
    skincare: 'en skincare',
    maquillaje: 'de maquillaje',
    cabello:  'para el cabello',
  };

  let intro;
  if (productTypeMissing && productTypeTokens.length > 0) {
    // Honest fallback when we don't actually carry the requested type
    intro = `No tengo "${productTypeTokens[0]}" exactos, pero estos te pueden interesar`;
  } else if (wantsOffer) {
    intro = isMore ? '🔥 Más ofertas para vos' : '🔥 Mirá las ofertas que tengo';
  } else if (cats.size === 1) {
    const catLabel = labels[[...cats][0]];
    if (isMore) {
      intro = `Acá te van otras opciones ${catLabel}`;
    } else if (attrAskedButMissing) {
      intro = `No tengo justo eso, pero mirá lo que tengo ${catLabel}`;
    } else if (productTypeTokens.length > 0) {
      // Lead with the specific type so the intro matches what the user asked
      intro = `Mirá los ${productTypeTokens[0]} que tengo`;
    } else {
      intro = `Mirá lo que tengo ${catLabel}`;
    }
  } else if (tokens.includes('perfume') || tokens.includes('perfumes') || tokens.includes('fragancia') || tokens.includes('fragancias')) {
    intro = isMore ? 'Más perfumes que te pueden gustar' : 'Mirá los perfumes y fragancias que tengo';
  } else {
    intro = isMore ? 'Otras opciones que pueden interesarte' : 'Mirá estas opciones que pueden interesarte';
  }
  if (inheritedPriceCap) {
    intro += ` por debajo de ₡${inheritedPriceCap.toLocaleString('es-CR')}`;
  }

  const list = top.map((p) => `[[${p.slug}]]`).join('\n');
  // Build context-aware follow-up suggestions
  let sugList;
  if (cats.size === 1) {
    const cat = [...cats][0];
    const sugByCat = {
      labios:   'Mostrame labiales mate | ¿Tienen rojos? | Quiero glosses',
      ojos:     'Mostrame sombras | Pestañinas | Delineadores',
      rostro:   'Bases para piel grasa | Correctores | Iluminadores',
      skincare: 'Quiero serums | Cremas hidratantes | Protectores solares',
      maquillaje: 'Mostrame labiales | Bases | Sombras',
      cabello:  'Shampoos | Tratamientos | Acondicionadores',
    };
    sugList = sugByCat[cat] || 'Mostrame más | ¿Más baratos? | Quiero ver otra cosa';
  } else if (wantsOffer) {
    sugList = 'Más ofertas | Quiero skincare | Ver maquillaje';
  } else {
    sugList = 'Mostrame más | ¿Más baratos? | Quiero ver maquillaje';
  }
  return `${intro}:\n${list}\n\n¿Querés ver más opciones o algo más específico?\n\n[[sug: ${sugList}]]`;
}

const SYSTEM_PROMPT = `Eres "JD Asistente", la asesora virtual de belleza de **JD Virtual**, una tienda costarricense de maquillaje, skincare, perfumes y cuidado del cabello ubicada en El Roble, Puntarenas.

PERSONALIDAD:
- Cálida, cercana y profesional. Hablás en español de Costa Rica con tono amistoso (usá "vos" naturalmente).
- Experta en belleza: maquillaje, skincare, fragancias, cuidado capilar.
- Concisa: respuestas cortas (2-4 oraciones salvo que pidan detalle).
- Honesta: si NO tenés un producto en el catálogo, lo decís claramente y ofrecés alternativas reales del catálogo.

🚨 REGLAS CRÍTICAS — INVENTARIO 🚨

1. **PROHIBIDO INVENTAR.** SOLO podés recomendar productos que aparezcan exactamente en el JSON del catálogo de abajo. Nunca menciones marcas, productos o precios que NO estén en ese JSON. Si no encontrás algo apropiado, decí: "No tengo ese producto exacto, pero te puedo ofrecer estas alternativas..." y mostrá lo que SÍ tenés.

2. **SLUGS EXACTOS.** Cuando recomendes un producto, escribí ÚNICAMENTE su slug entre corchetes dobles: [[slug-exacto-del-json]]. El frontend lo convierte en tarjeta clickeable con foto, precio y nombre — NO escribas el nombre del producto antes ni después del slug. Ejemplo correcto: "Te recomiendo:\\n[[labial-mate-rojo]]\\n[[base-fluida-natural]]"

3. **PRECIOS REALES.** Los precios están en el campo "precio" del JSON, en colones (₡). Si los mencionás, usá separador de miles: ₡8.500. Nunca inventes precios.

4. **STOCK.** Si un producto tiene stock="agotado", avisalo y ofrecé alternativas similares en stock. El campo "stock" te dice exactamente la disponibilidad.

5. **CATEGORÍAS.** Las únicas categorías reales del catálogo son: ojos, labios, rostro, skincare, maquillaje, cabello. No inventes otras.

6. **FILTRADO INTELIGENTE.** Cuando el cliente pregunta algo (ej: "labial rojo mate"), buscá en el JSON productos cuya "descripcion" o "nombre" o "caracteristicas" coincidan con la consulta. NO recomendes algo que claramente no encaja.

REGLAS GENERALES:
- Si preguntan por temas fuera de belleza (matemáticas, política, etc.), redirigí amablemente al catálogo.
- Para envíos, pago o políticas, sugerí visitar /como-comprar.
- No solicités datos personales sensibles (cédula, contraseñas, tarjetas).
- Si te piden ayuda para rastrear pedido, sugerí ir a /pedido.

EJEMPLO DE RESPUESTA BUENA:
Usuario: "Busco una base para piel grasa"
Tú: "¡Claro! Para piel grasa te recomiendo estas opciones que controlan el brillo:
[[fit-me-matte-poreless]]
[[base-mate-maybelline]]
¿Querés que te ayude a elegir según tu tono de piel?"

EJEMPLO DE RESPUESTA HONESTA (cuando no hay):
Usuario: "¿Tienes Chanel No. 5?"
Tú: "Por ahora no manejamos Chanel No. 5, pero tengo perfumes florales hermosos que te pueden encantar:
[[perfume-floral-x]]
¿Querés que te cuente más?"

SUGERENCIAS DE SEGUIMIENTO (importante):
Al FINAL de cada respuesta — y SOLO al final, después del texto principal — incluí 3 sugerencias cortas que el cliente podría querer preguntar a continuación. Formato exacto y obligatorio:
[[sug: opción 1 | opción 2 | opción 3]]
- Cada opción: máx 5-6 palabras, redactada en primera persona del cliente (lo que el cliente diría), accionable.
- Adaptá las sugerencias al contexto de la conversación.
- Si la conversación ya cerró (despedida o "gracias"), podés omitir las sugerencias.
- NUNCA menciones que escribiste sugerencias en el texto — el frontend las renderiza como botones aparte.
- Ejemplos buenos: "Mostrame opciones más baratas" | "¿Para piel seca?" | "Quiero ver labiales rojos"

═══════════════════════════════════════
CATÁLOGO COMPLETO Y VIGENTE (JSON con TODOS los productos activos):
═══════════════════════════════════════`;

/* ─── Rule-based intents — respond without burning AI quota ─── */
function detectIntent(text) {
  const norm = normalizeText(text).trim().replace(/[!.?¿¡,]+/g, '').trim();

  // Pure greeting (whole message)
  if (/^(hola|hello|hey|hi|buenas|buenos dias|buenas tardes|buenas noches|saludos|que tal)( jd)?$/i.test(norm)) return 'greeting';

  // Pure thanks
  if (/^(gracias|muchas gracias|thanks|thank you|ok gracias|perfecto gracias|listo gracias)$/i.test(norm)) return 'thanks';

  // Casual chitchat — "cómo estás", "qué hacés", small talk that isn't a product query
  if (/^(como (estas|te va|andas|vas|amaneciste)|que tal|todo bien|que haces|que mas|que onda|estas ahi|hay alguien|me escuchas|me oyes|jaja+|jeje+|jiji+|lol|xd)$/i.test(norm)) return 'chitchat';

  // Acknowledgments / fillers — "ok", "listo", "vale", "ah", "mm"
  if (/^(ok|okay|vale|listo|dale|si|claro|bueno|ah+|mm+|aja|ajam|ya|ya esta)$/i.test(norm)) return 'ack';

  // Pack / combo / gift requests — high intent for curated bundle
  if (/(hazme|armame|hace[mr]?e?|haceme|necesito|quiero|recomendame|recomienda|dame|sugerime|sugiere|armar)\s+(un|una|me)?\s*(pack|packs|combo|combos|kit|kits|set|sets|paquete|paquetes|bundle|regalo|regalitos)/i.test(norm)) return 'pack';
  if (/^(pack|combo|kit|set|regalo|paquete|bundle)s?$/i.test(norm)) return 'pack';

  // Order tracking
  if (/(rastrear|seguir|estado|donde esta|donde va).{0,15}(pedido|orden|envio|paquete|compra)/i.test(norm)) return 'tracking';

  // How to buy / shipping / payment
  if (/(como.{0,8}(comprar|pagar|pago|comprarlo)|metodo.{0,5}(pago|envio)|sinpe|transferencia|cuanto.{0,5}(envio|cuesta el envio)|hacen envio|envian a|donde envian|formas de pago|costo.{0,5}envio)/i.test(norm)) return 'how_to_buy';

  // Location / contact
  if (/(donde.{0,10}(estan|ubican|queda|tienda|local)|ubicacion|direccion|telefono|whatsapp|contacto|horario)/i.test(norm)) return 'location';

  // Apartados — sistema de reserva
  if (/\b(apartar|apartado|apartados|aparto|reservar|reserva|reservas|abonar|abono|partar)\b/i.test(norm)) return 'apartados';

  // Off-topic (math, politics, etc.)
  if (/(matematica|politica|hackear|virus|programacion|codigo de|cuentame un chiste|que opinas de la|inteligencia artificial)/i.test(norm)) return 'off_topic';

  return null; // needs AI
}

/* Hour in Costa Rica timezone (UTC-6, no DST). Returns 0-23. */
function getCRHour() {
  const now = new Date();
  // CR is fixed UTC-6 — no DST → simple offset works year-round
  const utcHour = now.getUTCHours();
  return (utcHour - 6 + 24) % 24;
}

function timeBasedGreeting() {
  const h = getCRHour();
  if (h < 12) return '¡Buenos días! ☀️';
  if (h < 19) return '¡Buenas tardes! 🌸';
  return '¡Buenas noches! 🌙';
}

function ruleBasedReply(intent) {
  switch (intent) {
    case 'greeting':
      return `${timeBasedGreeting()} Soy JD Asistente. Te ayudo a encontrar maquillaje, skincare, perfumes o productos para el cabello. ¿Qué buscás hoy?\n\n[[sug: Quiero un labial | Ver skincare | Mostrame ofertas | Tengo ₡10 mil]]`;
    case 'thanks':
      return '¡Con mucho gusto! 💕 Si necesitás algo más, acá estoy.';
    case 'chitchat':
      return '¡Súper bien, gracias! 💕 Lista para ayudarte a encontrar lo que buscás. ¿Te muestro maquillaje, skincare, perfumes o algo para el cabello?\n\n[[sug: Mostrame ofertas | Quiero un labial | Recomendame skincare | Tengo ₡10 mil]]';
    case 'ack':
      return '¿Querés que te muestre algo? Decime qué buscás y te ayudo 💕\n\n[[sug: Mostrame maquillaje | Quiero skincare | Ver perfumes | Productos para cabello]]';
    case 'pack':
      return '¡Me encanta armar packs! 💕 Decime qué tipo te tinca y armo algo lindo:\n\n💄 **Pack maquillaje** — labial + base + sombras\n🧴 **Pack skincare** — limpiador + tónico + crema\n🌸 **Pack regalo** — perfume + crema corporal\n💇 **Pack cabello** — shampoo + tratamiento\n\nO contame tu presupuesto y categoría preferida y te armo el combo perfecto ✨\n\n[[sug: Pack de maquillaje | Pack skincare | Pack regalo | Tengo ₡15 mil]]';
    case 'tracking':
      return 'Para rastrear tu pedido andá a la sección **[Pedido](/pedido)** y escribí tu número de orden. Ahí vas a ver el estado actualizado.\n\n[[sug: Tengo otra pregunta | Mostrame productos | Hablar por WhatsApp]]';
    case 'how_to_buy':
      return 'En **[Cómo comprar](/como-comprar)** encontrás todo: métodos de pago (SINPE Móvil, transferencia bancaria), zonas de envío y tiempos de entrega. Cualquier duda, también podés escribirnos por WhatsApp al **8804-5100**.\n\n[[sug: Quiero ver productos | ¿Hacen envío a mi zona? | Mostrame ofertas]]';
    case 'location':
      return 'Estamos en **El Roble, Puntarenas** 🌴 También podés escribirnos por **WhatsApp al 8804-5100** o ver detalles en **[Cómo comprar](/como-comprar)**.\n\n[[sug: ¿Hacen envíos? | Quiero ver productos | Mostrame ofertas]]';
    case 'apartados':
      return 'Sí, tenemos **sistema de apartados** 💕\n\n💰 **50%** del valor para reservar el producto\n🗓️ **Hasta 1 mes** apartado\n🔔 Te avisamos 1-2 días antes de que venza\n💕 Te pedimos respetar el plazo\n\nTe paso a la página con todos los detalles 👇\n\n[[link: Ver sistema de apartados|/apartados]]\n\n[[sug: Quiero apartar algo | Hablar por WhatsApp | Mostrame productos]]';
    case 'off_topic':
      return 'Soy especialista en belleza 💄 ¿Te ayudo a buscar maquillaje, skincare, perfumes o productos para el cabello?\n\n[[sug: Mostrame ofertas | Recomendame algo | Buscame un labial]]';
    default:
      return null;
  }
}

/* Try rule-based response. Strategy: AI ONLY for hard cases (comparisons,
 * tutorials, multi-condition reasoning). Everything else handled locally to
 * preserve Gemini quota.
 *
 * Order:
 *   1. Simple FAQ intents (greeting, thanks, tracking, how_to_buy, off_topic)
 *   2. Vague "qué me recomendás" → category picker
 *   3. needsAI? → null (let controller call AI)
 *   4. Smart local search (browse intent)
 *   5. No-match fallback — instead of burning AI quota on unrecognized queries
 *      (typos, slang, single unknown words), return a friendly redirect.
 */
function tryRuleBasedReply(messages, allCatalog) {
  if (!Array.isArray(messages)) return null;
  const lastUser = [...messages].reverse().find((m) => m && m.role === 'user');
  if (!lastUser || typeof lastUser.content !== 'string') return null;

  const userText = lastUser.content;

  // 1. Simple FAQ intents
  const intent = detectIntent(userText);
  if (intent) return { reply: ruleBasedReply(intent), kind: intent };

  // 2. Vague "qué me recomendás"
  if (isVagueRecommendation(userText)) {
    return { reply: VAGUE_RECOMMENDATION_REPLY, kind: 'vague_recommendation' };
  }

  // 2.1. Budget-only query → ask what they want, then we'll build a combo.
  if (isBudgetOnlyQuery(userText)) {
    const cap = detectPriceCeiling(userText);
    return {
      reply: `Con ₡${cap.toLocaleString('es-CR')} te puedo armar algo lindo 💕\n\n¿Qué priorizás?\n\n💄 **Maquillaje** — base + labial + sombra\n🧴 **Skincare** — limpieza, hidratación, protección\n💇 **Cabello** — shampoo + tratamiento\n🌸 **Perfume** — fragancia + algo más\n✨ **Mix variado** — un poquito de todo\n\nO si preferís ver productos sueltos, también va.\n\n[[sug: Maquillaje | Skincare | Mix variado | Mostrame productos sueltos]]`,
      kind: 'budget_choose',
    };
  }

  // 2.2. Category-only follow-up after a budget was mentioned → build a combo
  //      with curated essentials that fit the budget. Excludes products already
  //      shown so repeat asks give variety.
  {
    const budgetInHistory = findBudgetInHistory(messages);
    const norm = normalizeText(userText).trim().replace(/[!.?¿¡,]+/g, '').trim();
    const comboTrigger = /^(maquillaje|skincare|skin care|cabello|pelo|perfume|perfumes|fragancia|fragancias|mix|mix variado|variado|combinado|de todo)$/i.test(norm)
      || /^(quiero|me gustaria|me gustaría|armame|hazme|hace[mr]?e?|prefiero) (maquillaje|skincare|skin care|cabello|pelo|perfume|perfumes|fragancia|fragancias|mix|mix variado|variado|combinado|de todo)$/i.test(norm);
    if (budgetInHistory && comboTrigger && allCatalog && allCatalog.length > 0) {
      let cat = norm.replace(/^(quiero|me gustaria|me gustaría|armame|hazme|hace[mr]?e?|prefiero)\s+/i, '');
      if (/^(skincare|skin care)$/.test(cat)) cat = 'skincare';
      else if (/^(cabello|pelo)$/.test(cat)) cat = 'cabello';
      else if (/^(perfume|perfumes|fragancia|fragancias)$/.test(cat)) cat = 'perfumes';
      else if (/^(mix|mix variado|variado|combinado|de todo)$/.test(cat)) cat = 'mix';
      else cat = 'maquillaje';

      const shown = extractShownSlugs(messages);
      const combo = buildBudgetCombo(cat, budgetInHistory, allCatalog, shown);
      if (combo && combo.picked.length > 0) {
        // Defensive dedup — never send the same slug twice in a combo, otherwise
        // the cart's addItem(p, 1) sums quantities into a single product.
        const uniquePicked = [];
        const seen = new Set();
        for (const p of combo.picked) {
          if (!seen.has(p.slug)) { seen.add(p.slug); uniquePicked.push(p); }
        }
        const list = uniquePicked.map((p) => `[[${p.slug}]]`).join('\n');
        const slugList = uniquePicked.map((p) => p.slug).join(',');
        const totalAfterDedup = uniquePicked.reduce((s, p) => s + p.precio, 0);
        const remaining = budgetInHistory - totalAfterDedup;
        const remainingNote = remaining > 1000
          ? `\n\nTe sobran **₡${remaining.toLocaleString('es-CR')}** del presupuesto — ¿le sumamos algo más?`
          : '';
        const catLabel = {
          maquillaje: 'maquillaje',
          rostro: 'rostro',
          labios: 'labios',
          ojos: 'ojos',
          skincare: 'skincare',
          cabello: 'cabello',
          perfumes: 'perfumes',
          mix: 'mix variado',
        }[cat] || cat;
        return {
          reply: `Listo, te armé un combo de ${catLabel} con lo más esencial 💕\n${list}\nTotal: **₡${totalAfterDedup.toLocaleString('es-CR')}** de ₡${budgetInHistory.toLocaleString('es-CR')}${remainingNote}\n\n[[combo: ${slugList}]]\n\nDale al botón de arriba para sumar todo al carrito de una. ¿Querés cambiar algo?\n\n[[sug: Otro combo distinto | Cambiar un producto | Ver más opciones | Ir al carrito]]`,
          kind: 'combo',
        };
      }
    }
  }

  // 2.3. Direct cart navigation request — convert the suggestion click into a link.
  if (/^(ir al carrito|ver carrito|abrir carrito|carrito)$/i.test(normalizeText(userText).trim())) {
    return {
      reply: 'Te llevo al carrito 🛒\n\n[[link: Ir al carrito|/carrito]]\n\n¿Algo más antes de pagar?\n\n[[sug: Seguir viendo | Hablar por WhatsApp | Cómo pagar]]',
      kind: 'cart_redirect',
    };
  }

  // 2.3b. WhatsApp escalation — convert sug click into a clickable link button.
  if (/^(hablar por whatsapp|whatsapp|hablar con humano|hablar con alguien|chat real|persona real)$/i.test(normalizeText(userText).trim())) {
    return {
      reply: `Te paso con una persona real por WhatsApp 💕\n\n[[link: Abrir WhatsApp|${WHATSAPP_URL}]]\n\nNuestro número directo es **8804-5100**. Te respondemos lo antes posible.\n\n[[sug: Seguir viendo | Mostrame ofertas | Tengo otra pregunta]]`,
      kind: 'whatsapp_redirect',
    };
  }

  // 2.4. "Cambiar un producto" — works against the most recent combo. Either
  //      asks "¿cuál?" or, if the user already named a subtype, swaps directly.
  if (allCatalog && allCatalog.length > 0) {
    const lastComboSlugs = findLastComboSlugs(messages);
    if (lastComboSlugs.length > 0) {
      const change = detectChangeIntent(userText);
      if (change && change.kind === 'ask_which') {
        const products = lastComboSlugs
          .map((s) => allCatalog.find((p) => p.slug === s))
          .filter(Boolean);
        if (products.length > 0) {
          const subtypes = [];
          for (const p of products) {
            const sub = getProductSubtype(p) || 'producto';
            if (!subtypes.includes(sub)) subtypes.push(sub);
          }
          const sugList = subtypes.slice(0, 4).map((s) => `Cambiar ${s}`).join(' | ');
          return {
            reply: `¿Cuál de estos querés cambiar?\n${products.map((p) => `• ${p.nombre}`).join('\n')}\n\nDecime el tipo y te muestro otras opciones.\n\n[[sug: ${sugList}]]`,
            kind: 'change_ask',
          };
        }
      }
      if (change && change.kind === 'swap') {
        const subtype = change.subtype;
        const lastBudget = findBudgetInHistory(messages);
        const synonyms = expandTypeTokens([subtype]);
        const candidates = allCatalog
          .filter((p) => {
            if (lastComboSlugs.includes(p.slug)) return false;
            if (p.stock === 'agotado' || p.stock === 0) return false;
            if (lastBudget && p.precio > lastBudget) return false;
            const hay = normalizeText(`${p.nombre} ${p.descripcion || ''} ${(p.caracteristicas || []).join(' ')}`);
            return synonyms.some((s) => hay.includes(s));
          })
          .sort((a, b) => (b.rating || 0) - (a.rating || 0) || a.precio - b.precio);

        if (candidates.length === 0) {
          return {
            reply: `Mmm, no tengo otro ${subtype} disponible que cumpla el presupuesto 🥺 ¿Querés probar con otro tipo o subo un poco el límite?\n\n[[sug: Cambiar otro producto | Otro combo distinto | Hablar por WhatsApp | Ir al carrito]]`,
            kind: 'change_no_alt',
          };
        }
        const top = candidates.slice(0, 4);
        const list = top.map((p) => `[[${p.slug}]]`).join('\n');
        return {
          reply: `Te muestro otras opciones de ${subtype}:\n${list}\n\nClickeá el carrito en la que te guste para sumarla. ¿Cambiamos algo más?\n\n[[sug: Cambiar otro producto | Otro combo | Ver más opciones | Ir al carrito]]`,
          kind: 'change_alternatives',
        };
      }
    }
  }

  // 2.5. Price refinement — "más baratos" / "más caros" within the same context.
  {
    const sortMode = detectPriceRefinement(userText);
    if (sortMode && allCatalog && allCatalog.length > 0) {
      const reply = priceRefinementBrowse(messages, allCatalog, sortMode);
      if (reply) return { reply, kind: `browse_${sortMode}` };
    }
  }

  // 2.5. "Mostrame más" / "otros" — inherit topic + budget from prior user messages
  //      (NOT from the categories of products the bot decided to show), and exclude
  //      products already mentioned. This avoids two failure modes:
  //        - Inferring a category the user never asked for (e.g. price-only queries)
  //        - Losing the budget across turns
  if (isMoreRequest(userText) && allCatalog && allCatalog.length > 0) {
    const shown = extractShownSlugs(messages);
    const priorUserMessages = messages
      .filter((m) => m && m.role === 'user' && typeof m.content === 'string' && !isMoreRequest(m.content))
      .slice(-3)
      .map((m) => m.content)
      .join(' ');

    if (priorUserMessages.trim()) {
      const browse = ruleBasedBrowse(priorUserMessages, '', allCatalog, {
        excludeSlugs: shown,
        strictExclude: true,
        isMore: true,
      });
      if (browse) return { reply: browse, kind: 'browse_more' };
      return {
        reply: `Ya te mostré todo lo que tengo así 💕 ¿Querés explorar otra cosa?\n\n[[sug: Mostrame maquillaje | Quiero skincare | Ver perfumes | Hablar por WhatsApp]]`,
        kind: 'no_more',
      };
    }
    return { reply: VAGUE_RECOMMENDATION_REPLY, kind: 'vague_recommendation' };
  }

  // 3. Genuinely complex → AI
  if (needsAI(userText)) return null;

  // 4. Smart local search — use CURRENT message for topic detection, with prior
  //    user message available only as context for budget inheritance.
  //    Exclude products already shown to keep responses fresh, but fall back to
  //    the full set if filtering would leave us empty.
  if (allCatalog && allCatalog.length > 0) {
    const userMessages = messages.filter((m) => m && m.role === 'user' && typeof m.content === 'string');
    const priorText = userMessages.length >= 2 ? userMessages[userMessages.length - 2].content : '';
    const shown = extractShownSlugs(messages);
    const browse = ruleBasedBrowse(userText, priorText, allCatalog, { excludeSlugs: shown });
    if (browse) return { reply: browse, kind: 'browse' };

    // 4.5. No category/type signal but the words might still appear in product
    //      names (e.g. "prensas", "snoopy", a brand name). Try free-text search.
    const freeText = freeTextSearch(userText, allCatalog, shown);
    if (freeText) return { reply: freeText, kind: 'text_search' };

    // 4.6. Fuzzy typo correction — "labiabes" → "labiales", "shapoo" → "shampoo".
    //      Only run if no match so far AND the correction actually changes something.
    const { corrected, changed } = correctTypos(userText);
    if (changed) {
      const browseFuzzy = ruleBasedBrowse(corrected, priorText, allCatalog, { excludeSlugs: shown });
      if (browseFuzzy) {
        return {
          reply: `Asumí que querías decir **"${corrected}"** 🙊\n\n${browseFuzzy}`,
          kind: 'fuzzy_browse',
        };
      }
      const fuzzyFreeText = freeTextSearch(corrected, allCatalog, shown);
      if (fuzzyFreeText) {
        return {
          reply: `Asumí que querías decir **"${corrected}"** 🙊\n\n${fuzzyFreeText}`,
          kind: 'fuzzy_text_search',
        };
      }
    }
  }

  // 5. Low-signal query (typo, slang, unknown word). needsAI was false, so AI
  //    won't add value here. Reply locally instead of burning Gemini quota.
  const snippet = userText.trim().slice(0, 40);
  return {
    reply: `Mmm, "${snippet}" no lo tengo claro 🤔\n\n¿Buscás algo en particular? Decime el tipo de producto, una marca o tu presupuesto y te ayudo. O escogé una categoría:\n\n[[sug: Mostrame maquillaje | Quiero skincare | Ver perfumes | Hablar por WhatsApp]]`,
    kind: 'no_match',
  };
}

/* WhatsApp deep link — used by `Hablar por WhatsApp` suggestion clicks. */
const WHATSAPP_NUMBER = '50688045100';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola JD Virtual, vengo del chat de la web y necesito ayuda 💕')}`;

/* Best-effort fallback when Gemini is unavailable — local catalog search.
 * Only shows products if there's a genuine topic signal (category/price/offer/browse-keyword).
 * Otherwise returns a "not found" message with category picker so we don't show the
 * same top-rated products for every unrelated query. */
function bestEffortFallback(messages, allCatalog) {
  const lastUser = [...messages].reverse().find((m) => m && m.role === 'user');
  const userText = lastUser?.content || '';

  const norm = normalizeText(userText);
  const tokens = norm.split(/[^a-z0-9]+/).filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  const cats = detectCategories(tokens);
  const priceCap = detectPriceCeiling(userText);
  const wantsOffer = /\b(oferta|ofertas|descuento|promo|barato|baratos|barata|baratas)\b/.test(norm);
  const hasBrowseKw = tokens.some((t) => BROWSE_KEYWORDS.includes(t));

  const hasTopic = cats.size > 0 || priceCap || wantsOffer || hasBrowseKw;

  // No clear topic — return helpful "not found" with category picker
  if (!hasTopic) {
    return `Mmm, no encontré productos que coincidan con "${userText.slice(0, 40)}" 🥺\n\nProbá explorando estas categorías:\n\n💄 **Maquillaje** — labiales, bases, sombras\n🧴 **Skincare** — cremas, serums, protector solar\n🌸 **Perfumes** — fragancias\n💇 **Cabello** — shampoos, tratamientos\n\nO escribinos por WhatsApp al **8804-5100** para ayudarte personalmente.\n\n[[sug: Mostrame maquillaje | Quiero skincare | Ver perfumes | Hablar por WhatsApp]]`;
  }

  // Has topic — score and return real matches
  const scored = scoreCatalog(allCatalog, userText)
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0 || scored[0].score < 3) {
    return `No encontré productos exactos para tu búsqueda 🥺 ¿Querés ver otra categoría?\n\n[[sug: Mostrame maquillaje | Quiero skincare | Ver perfumes | Productos para cabello]]`;
  }

  const top = scored.slice(0, 4).map((x) => x.p);
  const list = top.map((p) => `[[${p.slug}]]`).join('\n');
  return `Te muestro algunos productos que pueden interesarte:\n${list}\n\n_Para recomendaciones más personalizadas, escribinos por WhatsApp al **8804-5100**._\n\n[[sug: Mostrame más | ¿Cómo comprar? | Hablar por WhatsApp]]`;
}

/* ─── Per-IP simple cooldown to prevent abuse ─── */
const recentRequests = new Map();
const COOLDOWN_MS = 1500;

function checkCooldown(ip) {
  const last = recentRequests.get(ip) || 0;
  const now = Date.now();
  if (now - last < COOLDOWN_MS) return false;
  recentRequests.set(ip, now);
  if (recentRequests.size > 1000) {
    const cutoff = now - 60_000;
    for (const [k, t] of recentRequests) if (t < cutoff) recentRequests.delete(k);
  }
  return true;
}

/* ─── Build chat session from validated messages ─── */
async function buildChatSession(messages) {
  const cleaned = [];
  for (const m of messages) {
    if (!m || typeof m !== 'object') continue;
    const role = m.role === 'user' ? 'user' : 'model';
    const content = typeof m.content === 'string' ? m.content.trim().slice(0, 1000) : '';
    if (!content) continue;
    cleaned.push({ role, parts: [{ text: content }] });
  }
  if (cleaned.length === 0 || cleaned[cleaned.length - 1].role !== 'user') {
    const err = new Error('El último mensaje debe ser del usuario.');
    err.status = 400;
    throw err;
  }

  const allCatalog = await getCatalogContext();

  // Filter catalog using last 2 user messages (gives some conversational context)
  const recentUserText = cleaned
    .filter((m) => m.role === 'user')
    .slice(-2)
    .map((m) => m.parts[0].text)
    .join(' ');

  const catalog = filterCatalog(allCatalog, recentUserText);
  console.log(`📊 Catálogo filtrado: ${catalog.length}/${allCatalog.length} productos para "${recentUserText.slice(0, 60)}"`);

  const systemInstruction = `${SYSTEM_PROMPT}\n${JSON.stringify(catalog)}`;

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1500,        // suficiente para 5-6 productos + sugerencias
      // thinkingBudget: 0 — si se usa modelo 2.5, evitar que "piense" y se quede sin output
      thinkingConfig: { thinkingBudget: 0 },
    },
    // Relajar safety: la consulta de cosméticos a veces dispara filtros falsos
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  });

  const history = cleaned.slice(0, -1);
  const lastMsg = cleaned[cleaned.length - 1].parts[0].text;

  // Gemini requires history to start with 'user' role
  const idx = history.findIndex((h) => h.role === 'user');
  const validHistory = idx === -1 ? [] : history.slice(idx);

  return { chat: model.startChat({ history: validHistory }), lastMsg };
}

/* ─── Initial validation — does NOT require genAI; rule-based responses work without it ─── */
function validateRequest(req, res) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  if (!checkCooldown(ip)) {
    res.status(429).json({ error: 'Esperá un momento antes de enviar otro mensaje.' });
    return false;
  }
  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Se requiere un array de mensajes.' });
    return false;
  }
  if (messages.length > 30) {
    res.status(400).json({ error: 'Conversación demasiado larga.' });
    return false;
  }
  return true;
}

function mapAIError(err) {
  const msg = err?.message || '';
  if (msg.includes('API key') || err?.status === 401 || err?.status === 403) {
    return { status: 503, error: 'Error de autenticación con el servicio IA.' };
  }
  if (err?.status === 429 || msg.includes('429') || msg.toLowerCase().includes('quota')) {
    // Distinguir cuota agotada vs rate limit por minuto
    const isQuota = msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('exceeded');
    return {
      status: 429,
      error: isQuota
        ? 'Cuota diaria del asistente IA agotada. Intentá mañana o contactanos por WhatsApp.'
        : 'Muchas consultas en este momento. Esperá unos segundos e intentá de nuevo.',
    };
  }
  if (err?.status === 404 || msg.includes('not found') || msg.includes('NOT_FOUND')) {
    return { status: 503, error: 'El modelo IA configurado no está disponible. Avisá al administrador.' };
  }
  return null;
}

function logAIError(err) {
  console.error('❌ Chatbot error:');
  console.error('   message:', err?.message);
  console.error('   status :', err?.status);
  if (err?.errorDetails) console.error('   details:', JSON.stringify(err.errorDetails, null, 2));
  if (err?.cause) console.error('   cause  :', err.cause);
}

exports.chat = async (req, res, next) => {
  try {
    if (!validateRequest(req, res)) return;

    const allCatalog = await getCatalogContext();
    const lastUser = [...(req.body.messages || [])].reverse().find((m) => m && m.role === 'user');
    const userText = lastUser?.content || '';

    // 0. Restock flow (async — may write to DB)
    const restock = await handleRestockFlow(req.body.messages, allCatalog);
    if (restock) {
      console.log(`🤖 Restock flow (${restock.kind})`);
      logQuery(userText, restock.kind, restock.kind === 'restock_saved' || restock.kind === 'restock_ask');
      return res.json({ reply: restock.reply, source: 'rules' });
    }

    // 1. Try rule-based first (greetings, FAQ, simple browse) — no AI cost
    const rule = tryRuleBasedReply(req.body.messages, allCatalog);
    if (rule) {
      console.log(`🤖 Respuesta rule-based (${rule.kind}) — sin IA`);
      logQuery(userText, rule.kind, !FAILED_KINDS.has(rule.kind) && replyResolves(rule.reply));
      return res.json({ reply: rule.reply, source: 'rules' });
    }

    // 2. If AI not configured, use local catalog fallback
    if (!genAI) {
      const reply = bestEffortFallback(req.body.messages, allCatalog);
      logQuery(userText, 'fallback', replyResolves(reply));
      return res.json({ reply, source: 'fallback' });
    }

    // 3. Use AI
    try {
      const { chat, lastMsg } = await buildChatSession(req.body.messages);
      const result = await chat.sendMessage(lastMsg);
      const reply = result.response.text();
      logQuery(userText, 'ai', replyResolves(reply));
      return res.json({ reply, source: 'ai' });
    } catch (err) {
      logAIError(err);
      const mapped = mapAIError(err);
      // On quota / service issues, fall back to local search
      if (mapped && (mapped.status === 429 || mapped.status === 503)) {
        const reply = bestEffortFallback(req.body.messages, allCatalog);
        logQuery(userText, 'fallback', replyResolves(reply));
        return res.json({ reply, source: 'fallback' });
      }
      if (err.status === 400) return res.status(400).json({ error: err.message });
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

/* Stream a static text in word-sized chunks to mimic AI streaming UX */
async function streamStatic(res, text, isAborted) {
  const chunks = text.split(/(\s+)/);
  let buf = '';
  for (const c of chunks) {
    if (isAborted()) return;
    buf += c;
    // Flush every ~3 tokens for a natural feel
    if (buf.length >= 8) {
      res.write(`data: ${JSON.stringify({ delta: buf })}\n\n`);
      buf = '';
      await new Promise((r) => setTimeout(r, 18));
    }
  }
  if (buf && !isAborted()) res.write(`data: ${JSON.stringify({ delta: buf })}\n\n`);
}

/* ─── Streaming endpoint (Server-Sent Events) ─── */
exports.chatStream = async (req, res, next) => {
  try {
    if (!validateRequest(req, res)) return;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let aborted = false;
    req.on('close', () => { aborted = true; });
    const isAborted = () => aborted;

    const allCatalog = await getCatalogContext();
    const lastUser = [...(req.body.messages || [])].reverse().find((m) => m && m.role === 'user');
    const userText = lastUser?.content || '';

    // 0. Restock flow (async — may write to DB)
    const restock = await handleRestockFlow(req.body.messages, allCatalog);
    if (restock) {
      console.log(`🤖 Restock flow (${restock.kind})`);
      logQuery(userText, restock.kind, restock.kind === 'restock_saved' || restock.kind === 'restock_ask');
      await streamStatic(res, restock.reply, isAborted);
      if (!aborted) res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    // 1. Rule-based intent? → respond without AI
    const rule = tryRuleBasedReply(req.body.messages, allCatalog);
    if (rule) {
      console.log(`🤖 Respuesta rule-based (${rule.kind}) — sin IA`);
      logQuery(userText, rule.kind, !FAILED_KINDS.has(rule.kind) && replyResolves(rule.reply));
      await streamStatic(res, rule.reply, isAborted);
      if (!aborted) res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    // 2. AI not configured? → local catalog fallback
    if (!genAI) {
      console.log('🤖 Sin GEMINI_API_KEY — usando fallback local');
      const fbReply = bestEffortFallback(req.body.messages, allCatalog);
      logQuery(userText, 'fallback', replyResolves(fbReply));
      await streamStatic(res, fbReply, isAborted);
      if (!aborted) res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    // 3. Build AI session
    let chatSession;
    try {
      chatSession = await buildChatSession(req.body.messages);
    } catch (err) {
      if (err.status === 400) {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
        return;
      }
      throw err;
    }

    // 4. Stream from AI, fallback to local search on quota/service errors
    try {
      const result = await chatSession.chat.sendMessageStream(chatSession.lastMsg);
      let aiText = '';
      for await (const chunk of result.stream) {
        if (aborted) break;
        const text = chunk.text();
        if (text) {
          aiText += text;
          res.write(`data: ${JSON.stringify({ delta: text })}\n\n`);
        }
      }
      try {
        const finalResp = await result.response;
        const finishReason = finalResp?.candidates?.[0]?.finishReason;
        if (finishReason && finishReason !== 'STOP') {
          console.warn(`⚠️  Chatbot finishReason=${finishReason}`);
          if (finishReason === 'MAX_TOKENS') {
            res.write(`data: ${JSON.stringify({ delta: '\n\n_(respuesta truncada)_' })}\n\n`);
          } else if (finishReason === 'SAFETY') {
            res.write(`data: ${JSON.stringify({ error: 'La respuesta fue bloqueada por filtros de seguridad. Intentá reformular la pregunta.' })}\n\n`);
          }
        }
      } catch {}
      if (!aborted) {
        logQuery(userText, 'ai', replyResolves(aiText));
        res.write('data: [DONE]\n\n');
      }
    } catch (err) {
      logAIError(err);
      const mapped = mapAIError(err);

      // Fall back to local catalog search on quota/service errors
      if (mapped && (mapped.status === 429 || mapped.status === 503)) {
        console.log('🔄 Gemini falló — usando fallback local');
        const fb = bestEffortFallback(req.body.messages, allCatalog);
        logQuery(userText, 'fallback', replyResolves(fb));
        await streamStatic(res, `\n\n${fb}`, isAborted);
        if (!aborted) res.write('data: [DONE]\n\n');
      } else {
        const payload = mapped ? { error: mapped.error } : { error: 'Error generando la respuesta.' };
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
    }
    res.end();
  } catch (err) {
    if (!res.headersSent) next(err);
    else { try { res.end(); } catch {} }
  }
};
