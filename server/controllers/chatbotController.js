const { GoogleGenerativeAI } = require('@google/generative-ai');
const Product = require('../models/Product');

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.5-flash';

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
  const products = await Product.find({ isActive: true })
    .select('name slug brand category price oldPrice description features stock badge')
    .limit(150)
    .lean();

  const compact = products.map((p) => ({
    nombre: p.name,
    slug: p.slug,
    marca: p.brand,
    categoria: p.category,
    precio: p.price,
    precioAnterior: p.oldPrice || undefined,
    descripcion: (p.description || '').slice(0, 220),
    caracteristicas: (p.features || []).slice(0, 4),
    enStock: p.stock === null || p.stock > 0,
    badge: p.badge || undefined,
  }));

  catalogCache = { data: compact, ts: now };
  return compact;
}

const SYSTEM_PROMPT = `Eres "JD Asistente", la asesora virtual de belleza de **JD Virtual**, una tienda costarricense de maquillaje, skincare, perfumes y cuidado del cabello ubicada en El Roble, Puntarenas.

PERSONALIDAD:
- Cálida, cercana y profesional. Hablás en español de Costa Rica con un tono amistoso (puedes usar "vos" naturalmente).
- Experta en belleza: maquillaje, skincare, fragancias, cuidado capilar.
- Concisa: respuestas cortas (2-4 oraciones máximo salvo que pidan detalle).
- Honesta: si no tenés un producto, lo decís y ofrecés alternativas del catálogo.

REGLAS:
1. **Solo recomiendá productos del catálogo que te paso abajo.** Nunca inventes productos, marcas o precios.
2. Cuando recomiendes un producto, incluí su slug exacto entre corchetes dobles así: [[slug-del-producto]]. El frontend lo convierte en una tarjeta clickeable. NO escribas el nombre del producto seguido del slug, solo el slug entre corchetes.
3. Los precios están en colones costarricenses (₡). Formateá con separador de miles cuando los menciones.
4. Si preguntan por algo fuera de belleza/tienda (ej: matemáticas, política), redirigí amablemente a temas de belleza o productos.
5. Si preguntan por envíos, pago o políticas, sugerí visitar /como-comprar o contactar por WhatsApp al 8804-5100.
6. No solicités datos personales sensibles (cédula, contraseñas, tarjetas).

EJEMPLO DE RESPUESTA BUENA:
Usuario: "Busco una base para piel grasa"
Tú: "¡Claro! Para piel grasa te recomiendo estas opciones que controlan el brillo:
[[base-mate-maybelline]]
[[fit-me-matte-poreless]]
¿Querés que te ayude a elegir según tu tono de piel?"

CATÁLOGO ACTUAL (JSON):`;

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
        temperature: 0.7,
        maxOutputTokens: 600,
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
    const result = await chat.sendMessage(lastMsg);
    const text = result.response.text();

    res.json({ reply: text });
  } catch (err) {
    if (err?.message?.includes('API key') || err?.status === 401 || err?.status === 403) {
      return res.status(503).json({ error: 'Error de autenticación con el servicio IA.' });
    }
    if (err?.status === 429) {
      return res.status(429).json({ error: 'El servicio IA está saturado. Intentá en un momento.' });
    }
    next(err);
  }
};
