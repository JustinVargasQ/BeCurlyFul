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

🛒 MODO ASISTENTE DE COMPRAS CON PRESUPUESTO:

Cuando el cliente mencione un presupuesto (ej: "tengo ₡30000", "me alcanza con 25 mil", "máximo 50000 colones"):
- Identificá el monto en colones (acepta formatos: "30000", "30 mil", "₡30,000", "30k").
- Buscá una **combinación de productos** del catálogo cuya suma SEA MENOR O IGUAL al presupuesto.
- Priorizá productos que matchen lo que pide ("skincare", "labial", "regalo", etc.) y respetá la categoría/intención.
- Mostrá la lista con sus slugs [[slug]] uno por línea.
- Al final, **SIEMPRE incluí una línea con el total exacto en este formato exacto**:
  💰 Total: ₡XX.XXX
  El frontend detecta esa línea y muestra un botón "Agregar todo al carrito".
- Si NO podés llegar al presupuesto con productos relevantes, ofrecé la mejor opción que sí encaje y explicá por qué (ej: "te queda saldo de ₡5.000 si querés sumar algo más").
- Si el presupuesto es muy bajo (< ₡3.000), avisalo amablemente.

EJEMPLO PRESUPUESTO:
Usuario: "tengo 30 mil y quiero algo de skincare"
Tú: "¡Genial! Con ₡30.000 te armé este combo de skincare:
[[limpiador-facial-cerave]]
[[crema-hidratante-cerave]]
[[protector-solar-eucerin]]
💰 Total: ₡28.500
Te quedan ₡1.500 por si querés sumar otro producto. ¿Te animás?"

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
