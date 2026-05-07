const { GoogleGenerativeAI } = require('@google/generative-ai');
const Product = require('../models/Product');

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
    .select('name slug brand category price oldPrice description features stock badge rating')
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
    stock: p.stock === null ? 'disponible' : (p.stock > 0 ? `${p.stock} disponibles` : 'agotado'),
    badge: p.badge || undefined,
    rating: p.rating || undefined,
  }));

  catalogCache = { data: compact, ts: now };
  console.log(`📦 Catálogo cargado: ${compact.length} productos activos`);
  return compact;
}

/* Force a fresh catalog load (called when products change) */
exports.invalidateCatalog = () => {
  catalogCache = { data: null, ts: 0 };
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
  labios:   ['labial', 'labio', 'labios', 'gloss', 'lipstick', 'tinta', 'lip', 'brillo'],
  ojos:     ['sombra', 'sombras', 'mascara', 'pestana', 'pestanas', 'eyeliner', 'delineador', 'ceja', 'cejas', 'eyeshadow', 'rimmel'],
  rostro:   ['base', 'rubor', 'iluminador', 'corrector', 'polvo', 'contorno', 'bronzer', 'primer', 'foundation', 'blush', 'highlighter', 'cubre', 'ojeras'],
  skincare: ['skincare', 'crema', 'serum', 'sérum', 'hidratante', 'limpiador', 'tonico', 'mascarilla', 'protector', 'solar', 'spf', 'retinol', 'niacinamida', 'acne', 'antiage', 'antiarrugas', 'manchas', 'piel'],
  cabello:  ['shampoo', 'champu', 'acondicionador', 'tinte', 'cabello', 'pelo', 'capilar', 'mascarilla'],
};

const STOPWORDS = new Set([
  'que','cual','cuales','me','te','se','lo','la','los','las','el','un','una','unos','unas',
  'de','del','al','en','con','sin','por','para','es','son','soy','tengo','tenes','hay','busco',
  'quiero','quieres','queres','recomendas','recomienda','recomiendas','mi','tu','su','y','o',
  'pero','si','no','mas','menos','algo','todo','todos','todas','mucho','poco','muy','puedo',
  'puedes','podes','dame','dale','muestra','mostrame','ver','vi','hola','gracias','ayuda',
  'ayudame','quisiera','necesito','este','esta','esto','ese','esa','eso','aqui','alli','colones',
]);

/* Extract a price ceiling from natural language: "10 mil", "10000", "menos de 5000" */
function detectPriceCeiling(text) {
  const norm = normalizeText(text);
  const milMatch = norm.match(/(\d+(?:[.,]\d+)?)\s*mil/);
  if (milMatch) return Math.round(parseFloat(milMatch[1].replace(',', '.')) * 1000);
  const num = norm.match(/\b(\d{4,7})\b/);
  if (num) return parseInt(num[1], 10);
  return null;
}

function detectCategories(tokens) {
  const cats = new Set();
  for (const tok of tokens) {
    for (const [cat, keys] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keys.includes(tok)) cats.add(cat);
    }
  }
  return cats;
}

/* Score & filter the catalog based on the user's recent messages */
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

  const scored = allProducts.map((p) => {
    const haystack = normalizeText(
      `${p.nombre} ${p.marca} ${p.categoria} ${p.descripcion} ${(p.caracteristicas || []).join(' ')} ${p.badge || ''}`
    );

    let score = 0;
    if (categories.size > 0 && categories.has(p.categoria)) score += 10;
    for (const tok of tokens) {
      if (haystack.includes(tok)) score += 2;
    }
    if (priceCap) {
      if (p.precio <= priceCap) score += 3;
      else score -= 5;
    }
    if (p.stock === 'agotado') score -= 2;
    score += (p.rating || 0) * 0.1;

    return { p, score };
  });

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

/* ─── Initial validation (returns null on success, error response otherwise) ─── */
function validateRequest(req, res) {
  if (!genAI) {
    res.status(503).json({ error: 'El asistente IA no está configurado. Falta GEMINI_API_KEY.' });
    return false;
  }
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
    const { chat, lastMsg } = await buildChatSession(req.body.messages);
    const result = await chat.sendMessage(lastMsg);
    res.json({ reply: result.response.text() });
  } catch (err) {
    logAIError(err);
    const mapped = mapAIError(err);
    if (mapped) return res.status(mapped.status).json({ error: mapped.error });
    if (err.status === 400) return res.status(400).json({ error: err.message });
    next(err);
  }
};

/* ─── Streaming endpoint (Server-Sent Events) ─── */
exports.chatStream = async (req, res, next) => {
  try {
    if (!validateRequest(req, res)) return;

    let chatSession;
    try {
      chatSession = await buildChatSession(req.body.messages);
    } catch (err) {
      if (err.status === 400) return res.status(400).json({ error: err.message });
      throw err;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let aborted = false;
    req.on('close', () => { aborted = true; });

    try {
      const result = await chatSession.chat.sendMessageStream(chatSession.lastMsg);
      for await (const chunk of result.stream) {
        if (aborted) break;
        const text = chunk.text();
        if (text) res.write(`data: ${JSON.stringify({ delta: text })}\n\n`);
      }
      // Inspect why the model stopped — log if not natural STOP
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
      if (!aborted) res.write('data: [DONE]\n\n');
    } catch (err) {
      logAIError(err);
      const mapped = mapAIError(err);
      const payload = mapped ? { error: mapped.error } : { error: 'Error generando la respuesta.' };
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
    res.end();
  } catch (err) {
    if (!res.headersSent) next(err);
    else { try { res.end(); } catch {} }
  }
};
