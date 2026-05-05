const { GoogleGenerativeAI } = require('@google/generative-ai');
const Product = require('../models/Product');

const GEMINI_KEY = process.env.GEMINI_API_KEY;
// gemini-2.0-flash is fast, no thinking mode (responds directly), ideal for chat
const MODEL_NAME = 'gemini-2.0-flash';

let genAI = null;
if (GEMINI_KEY) genAI = new GoogleGenerativeAI(GEMINI_KEY);

/* ─── Catalog cache (refresh every 5 min) ─── */
let catalogCache = { data: null, ts: 0 };
const CATALOG_TTL = 5 * 60 * 1000;

async function getCatalogContext() {
  const now = Date.now();
  if (catalogCache.data && now - catalogCache.ts < CATALOG_TTL) {
    return catalogCache.data;
  }
  // Cap catalog to keep prompt size reasonable (avoids Gemini TPM rate limits).
  // 100 products is plenty for product recommendations.
  const products = await Product.find({ isActive: true })
    .select('name slug brand category price oldPrice description stock badge')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const compact = products.map((p) => ({
    n: p.name,                                          // nombre
    s: p.slug,                                          // slug
    m: p.brand,                                         // marca
    c: p.category,                                      // categoria
    p: p.price,                                         // precio
    op: p.oldPrice || undefined,                        // precio anterior
    d: (p.description || '').slice(0, 120),             // descripcion compacta
    st: p.stock === null ? 'ok' : (p.stock > 0 ? 'ok' : 'agotado'),
    b: p.badge || undefined,
  }));

  catalogCache = { data: compact, ts: now };
  console.log(`📦 Catálogo cargado: ${compact.length} productos | ~${Math.round(JSON.stringify(compact).length / 4)} tokens`);
  return compact;
}

/* Force a fresh catalog load (called when products change) */
exports.invalidateCatalog = () => {
  catalogCache = { data: null, ts: 0 };
};

const SYSTEM_PROMPT = `Eres "JD Asistente", la asesora virtual de belleza de **JD Virtual**, tienda costarricense de maquillaje, skincare, perfumes y cuidado del cabello (El Roble, Puntarenas).

🔥🔥🔥 REGLA #0 — LA MÁS IMPORTANTE 🔥🔥🔥

**NUNCA respondas al cliente sin entregar productos del catálogo cuando te están pidiendo algo.**

❌ PROHIBIDO responder con frases vacías como:
- "¡Claro que sí! Con ₡20.000 podemos armarte un combo"
- "¡Perfecto! Dame un momento"
- "Te puedo ayudar con eso"
- "Veamos qué tenemos"
- "A ver, dime más"

Esas respuestas hacen que el cliente piense que estás roto. ESTÁ TERMINANTEMENTE PROHIBIDO responder así.

✅ EN LUGAR DE ESO: Tu PRIMERA respuesta DEBE INCLUIR los slugs [[slug]] de los productos. Listá los productos INMEDIATAMENTE. Después podés agregar 1 frase corta. Nunca al revés.

REGLA DE ORO: **Si tu respuesta no contiene al menos un [[slug]], la respuesta está MAL** (excepto si el cliente saluda o pregunta algo no relacionado con productos).

═══════════════════════════════════════

PERSONALIDAD:
- Cálida, costarricense (usá "vos"). Concisa: máximo 2-3 oraciones de texto + la lista de productos.
- Experta en belleza pero **directa al grano**: el cliente quiere productos, no charla.

🚨 REGLAS CRÍTICAS — INVENTARIO 🚨

1. **PROHIBIDO INVENTAR.** SOLO recomendá productos que estén en el JSON del catálogo abajo. Nunca menciones marcas, productos o precios que NO aparezcan en ese JSON.

2. **SLUGS EXACTOS.** Para mostrar un producto, escribí su slug entre corchetes dobles: [[slug-exacto]]. NO escribas el nombre antes ni después del slug — el frontend ya muestra foto, nombre, marca y precio. Solo el slug, uno por línea.

3. **PRECIOS REALES** del campo "precio" del JSON, en colones (₡), con separador de miles: ₡8.500.

4. **STOCK.** Si un producto está "agotado" en el JSON, NO lo recomendés. Solo recomendás productos disponibles.

5. **CATEGORÍAS REALES:** ojos, labios, rostro, skincare, maquillaje, cabello.

6. **FILTRADO.** Buscá en "nombre", "marca", "descripcion", "caracteristicas" del JSON lo que coincida con la consulta del cliente.

🛒 MODO ASISTENTE DE COMPRAS CON PRESUPUESTO:

Cuando el cliente mencione un presupuesto (ej: "tengo 20 mil", "₡30000", "máximo 50k"):

PASO 1: Identificá el monto en colones (acepta "30000", "30 mil", "30k", "₡30,000").
PASO 2: Filtrá productos del JSON relacionados con lo que pide.
PASO 3: Armá una combinación cuya suma SEA MENOR O IGUAL al presupuesto.
PASO 4: Respondé INMEDIATAMENTE con la lista. NO digas "claro, dame un momento" — listá ya.

FORMATO OBLIGATORIO de respuesta con presupuesto:

\`\`\`
Con ₡XX.XXX te armé este combo de [categoría]:
[[slug-1]]
[[slug-2]]
[[slug-3]]
💰 Total: ₡XX.XXX
Te quedan ₡X.XXX si querés sumar algo más.
\`\`\`

EJEMPLOS DE RESPUESTAS CORRECTAS vs INCORRECTAS:

❌ MAL (respuesta vacía):
Usuario: "tengo 20000 y quiero skincare"
Tú: "¡Claro! Con ₡20.000 podemos armarte un combo. ¿Qué tipo de piel tenés?"

✅ BIEN (entrega productos primero):
Usuario: "tengo 20000 y quiero skincare"
Tú: "Con ₡20.000 te armé este combo de skincare:
[[limpiador-facial-cerave]]
[[crema-hidratante-eucerin]]
💰 Total: ₡18.500
Te quedan ₡1.500 si querés sumar algo más. ¿Tenés piel grasa o seca? Te ajusto el combo."

❌ MAL:
Usuario: "buscame un labial rojo"
Tú: "¡Claro! Tengo varias opciones de labiales rojos, ¿qué acabado preferís?"

✅ BIEN:
Usuario: "buscame un labial rojo"
Tú: "Estos son los labiales rojos que tengo:
[[labial-mate-rojo]]
[[labial-rojo-revlon]]
¿Preferís acabado mate o cremoso?"

❌ MAL (cuando no hay producto exacto):
Usuario: "¿Tienen Chanel No. 5?"
Tú: "Por ahora no manejamos esa marca. ¿Querés ver otras opciones?"

✅ BIEN:
Usuario: "¿Tienen Chanel No. 5?"
Tú: "No manejamos Chanel No. 5, pero tengo perfumes florales hermosos:
[[perfume-floral-1]]
[[perfume-floral-2]]
¿Te muestro más opciones florales?"

REGLAS GENERALES:
- Si saludan ("hola"), saludá brevemente y preguntá qué buscan.
- Si preguntan por temas fuera de belleza, redirigí al catálogo.
- Para envíos/pago/políticas, sugerí visitar /como-comprar o WhatsApp 8804-5100.
- Para rastrear pedido, sugerí /pedido.
- No pidás datos sensibles.

═══════════════════════════════════════
CATÁLOGO COMPLETO Y VIGENTE
═══════════════════════════════════════

Diccionario de campos del JSON:
- "n" = nombre del producto
- "s" = slug (lo que vas en [[s]])
- "m" = marca
- "c" = categoría
- "p" = precio en colones
- "op" = precio anterior (si tiene descuento)
- "d" = descripción
- "st" = stock ("ok" disponible, "agotado" no recomendar)
- "b" = badge (ej: "OFERTA")

JSON:`;

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

exports.chat = async (req, res, next) => {
  try {
    if (!genAI) {
      return res.status(503).json({
        error: 'El asistente IA no está configurado. Falta GEMINI_API_KEY.',
      });
    }

    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (!checkCooldown(ip)) {
      return res.status(429).json({ error: 'Esperá un momento antes de enviar otro mensaje.' });
    }

    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de mensajes.' });
    }
    if (messages.length > 30) {
      return res.status(400).json({ error: 'Conversación demasiado larga.' });
    }

    // Validate & sanitize messages
    const cleaned = [];
    for (const m of messages) {
      if (!m || typeof m !== 'object') continue;
      const role = m.role === 'user' ? 'user' : 'model';
      const content = typeof m.content === 'string' ? m.content.trim().slice(0, 1000) : '';
      if (!content) continue;
      cleaned.push({ role, parts: [{ text: content }] });
    }
    if (cleaned.length === 0 || cleaned[cleaned.length - 1].role !== 'user') {
      return res.status(400).json({ error: 'El último mensaje debe ser del usuario.' });
    }

    const catalog = await getCatalogContext();
    const systemInstruction = `${SYSTEM_PROMPT}\n${JSON.stringify(catalog)}`;

    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 1200,
        topP: 0.95,
      },
    });

    // Gemini chat: split history (all but last) + send last
    const history = cleaned.slice(0, -1);
    const lastMsg = cleaned[cleaned.length - 1].parts[0].text;

    // Gemini requires history to start with 'user' role
    const validHistory = (() => {
      const idx = history.findIndex((h) => h.role === 'user');
      return idx === -1 ? [] : history.slice(idx);
    })();

    const chat = model.startChat({ history: validHistory });

    // Retry with exponential backoff for transient 429/503 errors
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let result, lastErr;
    const delays = [0, 1500, 3000]; // 3 attempts: immediate, +1.5s, +3s
    for (const delay of delays) {
      if (delay > 0) await sleep(delay);
      try {
        result = await chat.sendMessage(lastMsg);
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        const status = e?.status || e?.response?.status;
        const transient = status === 429 || status === 503 || status === 500;
        if (!transient) throw e; // non-retryable
        console.warn(`⚠️ Gemini ${status} — reintentando...`);
      }
    }
    if (lastErr) throw lastErr;

    let text = result.response.text();

    // Diagnostics
    const hasSlugs = /\[\[[a-z0-9-]+\]\]/i.test(text);
    const looksLikeProductQuery = /\b(tengo|busco|quiero|recomend|labial|base|crema|perfume|skincare|maquillaje|kit|combo|presupuesto|colones|mil|₡|\d{4,})\b/i.test(lastMsg);
    if (looksLikeProductQuery && !hasSlugs) {
      console.warn(`⚠️ Chatbot sin slugs. Query: "${lastMsg.slice(0, 80)}" | Resp: "${text.slice(0, 200)}"`);
    }
    if (!text || text.trim().length < 10) {
      console.error('❌ Respuesta vacía/corta de Gemini:', text);
      text = 'Disculpá, no pude generar una respuesta. ¿Podés reformular tu pregunta? Probá decirme algo como "Buscame un labial rojo" o "Tengo ₡30.000 y quiero skincare".';
    }

    res.json({ reply: text });
  } catch (err) {
    const status = err?.status || err?.response?.status;
    const message = err?.message || String(err);

    console.error('❌ Error en /api/chatbot:', {
      status,
      message: message.slice(0, 300),
      details: err?.errorDetails || err?.response?.data || undefined,
    });

    if (message.includes('API key') || status === 401 || status === 403) {
      return res.status(503).json({ error: 'Error de autenticación con el servicio IA.' });
    }
    if (status === 429) {
      return res.status(429).json({
        error: 'Mucha demanda en este momento. Esperá unos segundos y volvé a intentar 🙏',
      });
    }
    if (status === 503 || status === 500) {
      return res.status(503).json({
        error: 'El servicio IA está temporalmente fuera de línea. Probá en un momento.',
      });
    }
    next(err);
  }
};
