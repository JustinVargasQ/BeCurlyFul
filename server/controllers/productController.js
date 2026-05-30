const Product = require('../models/Product');
const Order   = require('../models/Order');
const { invalidateCatalog } = require('./chatbotController');

/* ---------- Public ---------- */

exports.getAll = async (req, res, next) => {
  try {
    const { cat, brand, q, featured, limit = 50, page = 1 } = req.query;
    const filter = { isActive: true };

    if (cat && cat !== 'todos') filter.category = cat;
    if (brand) filter.brand = brand;
    if (featured === 'true') filter.badge = { $ne: '' };
    if (q) filter.$text = { $search: q };

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Product.countDocuments(filter),
    ]);

    res.json({ products, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
};

exports.getBySlug = async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true });
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(product);
  } catch (err) { next(err); }
};

/* ─── Kit Builder ─── Devuelve los esenciales por categoría con N opciones
 * cada uno, todos por debajo del presupuesto. Usado por el widget del home y
 * el flow interactivo del chatbot. */
const KIT_ESSENTIALS = {
  maquillaje: [
    { key: 'base',      label: 'Base',         emoji: '🎨', cats: ['rostro','maquillaje'], synonyms: ['base','foundation','bb cream','cc cream'] },
    { key: 'labial',    label: 'Labial',       emoji: '💋', cats: ['labios','maquillaje'],  synonyms: ['labial','labio','lip','gloss','tinta','balsamo','rouge'] },
    { key: 'sombra',    label: 'Sombras',      emoji: '👁️', cats: ['ojos','maquillaje'],    synonyms: ['sombra','eyeshadow','paleta'] },
    { key: 'rubor',     label: 'Rubor',        emoji: '🌸', cats: ['rostro','maquillaje'], synonyms: ['rubor','blush','colorete'] },
    { key: 'corrector', label: 'Corrector',    emoji: '✨', cats: ['rostro','maquillaje'], synonyms: ['corrector','concealer','cubre','ojeras'] },
  ],
  skincare: [
    { key: 'limpiador', label: 'Limpiador',    emoji: '🧼', cats: ['skincare'], synonyms: ['limpiador','limpieza','cleanser','jabon','jabón'] },
    { key: 'tonico',    label: 'Tónico',       emoji: '💧', cats: ['skincare'], synonyms: ['tonico','tónico','toner'] },
    { key: 'hidratante',label: 'Hidratante',   emoji: '💦', cats: ['skincare'], synonyms: ['hidratante','crema','moisturizer'] },
    { key: 'serum',     label: 'Serum',        emoji: '🧪', cats: ['skincare'], synonyms: ['serum','sérum','niacinamida','retinol'] },
    { key: 'protector', label: 'Protector',    emoji: '☀️', cats: ['skincare'], synonyms: ['protector','solar','bloqueador','spf'] },
  ],
  cabello: [
    { key: 'shampoo',         label: 'Shampoo',        emoji: '🧴', cats: ['cabello'], synonyms: ['shampoo','champu','champú'] },
    { key: 'acondicionador',  label: 'Acondicionador', emoji: '💆', cats: ['cabello'], synonyms: ['acondicionador','conditioner'] },
    { key: 'tratamiento',     label: 'Tratamiento',    emoji: '✨', cats: ['cabello'], synonyms: ['tratamiento','keratina','queratina','mascarilla'] },
  ],
  perfumes: [
    { key: 'perfume',         label: 'Perfume',        emoji: '🌸', cats: ['perfumes','rostro','maquillaje'], synonyms: ['perfume','colonia','fragancia','eau de'] },
  ],
  mix: [
    { key: 'base',      label: 'Base',         emoji: '🎨', cats: ['rostro','maquillaje'], synonyms: ['base','foundation','bb cream'] },
    { key: 'labial',    label: 'Labial',       emoji: '💋', cats: ['labios','maquillaje'],  synonyms: ['labial','labio','lip','gloss','tinta','balsamo'] },
    { key: 'hidratante',label: 'Hidratante',   emoji: '💦', cats: ['skincare'],             synonyms: ['hidratante','crema','moisturizer'] },
    { key: 'protector', label: 'Protector',    emoji: '☀️', cats: ['skincare'],             synonyms: ['protector','solar','bloqueador','spf'] },
  ],
};

const ACCESSORY_NAME_KEYWORDS = ['algodon','vincha','panoleta','pañoleta','cepillo','esponja','brocha','aplicador','sacapuntas'];
const BUNDLE_NAME_KEYWORDS = ['kit','set','combo','pack','paquete'];

function _normalizeForKit(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

exports.getKitOptions = async (req, res, next) => {
  try {
    const cat = String(req.query.cat || 'maquillaje').toLowerCase();
    const budget = Math.max(0, parseInt(req.query.budget, 10) || 0);
    // Subimos el cap a 20 — antes era 6 que se sentia muy chico al usuario
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 20);

    const subtypes = KIT_ESSENTIALS[cat] || KIT_ESSENTIALS.maquillaje;

    // Traemos solo los productos relevantes para los subtypes pedidos
    const allCats = [...new Set(subtypes.flatMap((s) => s.cats))];
    const filter = { isActive: true, category: { $in: allCats } };
    if (budget > 0) filter.price = { $lte: budget };

    const products = await Product.find(filter)
      .select('name slug brand category price oldPrice description features images stock badge rating reviewCount tags variants')
      .lean({ virtuals: true });

    // Para cada subtipo, encontrar candidatos por nombre/desc/tags y elegir top N
    const result = subtypes.map((sub) => {
      const candidates = products
        .filter((p) => sub.cats.includes(p.category))
        .filter((p) => p.stock !== 0)
        .filter((p) => {
          const name = _normalizeForKit(p.name);
          const tags = (p.tags || []).map(_normalizeForKit);
          // Match por tag (preferido — owner-curado) o por sinónimo en el nombre
          if (sub.synonyms.some((s) => tags.includes(_normalizeForKit(s)))) return true;
          return sub.synonyms.some((s) => name.includes(_normalizeForKit(s)));
        })
        .filter((p) => {
          const name = _normalizeForKit(p.name);
          const tags = (p.tags || []).map(_normalizeForKit);
          // Excluir accesorios y kits/sets — el usuario está armando un kit propio
          if (tags.includes('accesorio')) return false;
          if (tags.includes('kit') || tags.includes('set') || tags.includes('combo')) return false;
          if (ACCESSORY_NAME_KEYWORDS.some((k) => name.includes(k))) return false;
          if (BUNDLE_NAME_KEYWORDS.some((k) => name.split(/\s+/).includes(k))) return false;
          return true;
        })
        .sort((a, b) => {
          // Priorizar: tiene oferta > rating con reviews > más barato
          const aDiscount = a.oldPrice && a.oldPrice > a.price ? 1 : 0;
          const bDiscount = b.oldPrice && b.oldPrice > b.price ? 1 : 0;
          if (aDiscount !== bDiscount) return bDiscount - aDiscount;
          const aSocial = (a.reviewCount || 0) > 0 ? (a.rating || 0) : 0;
          const bSocial = (b.reviewCount || 0) > 0 ? (b.rating || 0) : 0;
          if (aSocial !== bSocial) return bSocial - aSocial;
          return a.price - b.price;
        })
        .slice(0, limit);

      return {
        key: sub.key,
        label: sub.label,
        emoji: sub.emoji,
        options: candidates,
      };
    });

    res.json({ category: cat, budget, subtypes: result });
  } catch (err) { next(err); }
};

/* Batch lookup by slug — used by the chatbot to fetch a whole combo's
 * products in one round-trip instead of N parallel requests. */
exports.getByBatch = async (req, res, next) => {
  try {
    const raw = String(req.query.slugs || '').trim();
    if (!raw) return res.json({ products: [] });
    const slugs = [...new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))].slice(0, 20);
    if (slugs.length === 0) return res.json({ products: [] });
    const products = await Product.find({ slug: { $in: slugs }, isActive: true });
    // Preserve request order so consumers can rely on it
    const bySlug = new Map(products.map((p) => [p.slug, p]));
    const ordered = slugs.map((s) => bySlug.get(s)).filter(Boolean);
    res.json({ products: ordered, missing: slugs.filter((s) => !bySlug.has(s)) });
  } catch (err) { next(err); }
};

exports.getCategories = async (req, res, next) => {
  try {
    const cats = await Product.distinct('category', { isActive: true });
    res.json(['todos', ...cats.sort()]);
  } catch (err) { next(err); }
};

exports.topSellers = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 4, 12);
    const since = new Date();
    since.setDate(since.getDate() - 60); // last 60 days

    const rows = await Order.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $ne: 'cancelado' } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.productId', units: { $sum: '$items.qty' } } },
      { $sort: { units: -1 } },
      { $limit: limit * 2 }, // fetch extra in case some are inactive
    ]);

    const ids = rows.map((r) => r._id).filter(Boolean);
    const products = await Product.find({ _id: { $in: ids }, isActive: true }).limit(limit);

    // Sort by order of top-sellers ranking
    const sorted = ids
      .map((id) => products.find((p) => String(p._id) === String(id)))
      .filter(Boolean)
      .slice(0, limit);

    // Fallback: if not enough orders yet, fill with badge products
    if (sorted.length < limit) {
      const fallback = await Product.find({
        isActive: true,
        badge: { $nin: ['', null] },
        _id: { $nin: sorted.map((p) => p._id) },
      }).limit(limit - sorted.length);
      sorted.push(...fallback);
    }

    res.json({ products: sorted });
  } catch (err) { next(err); }
};

/* Dynamic sitemap.xml — lets Google discover every product page automatically.
 * Output is plain XML, cacheable for 1 hour. */
exports.sitemap = async (req, res, next) => {
  try {
    const SITE_URL = process.env.CLIENT_URL || 'https://becurlyfulcr.vercel.app';
    const products = await Product.find({ isActive: true })
      .select('slug updatedAt')
      .sort({ updatedAt: -1 })
      .lean();

    const staticPaths = [
      { loc: '',                priority: '1.0', changefreq: 'daily'   },
      { loc: '/ofertas',        priority: '0.9', changefreq: 'daily'   },
      { loc: '/como-comprar',   priority: '0.6', changefreq: 'monthly' },
      { loc: '/pedido',         priority: '0.4', changefreq: 'monthly' },
      { loc: '/privacidad',     priority: '0.3', changefreq: 'yearly'  },
    ];

    const escape = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const urls = [
      ...staticPaths.map((p) => `
  <url>
    <loc>${escape(SITE_URL + p.loc)}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`),
      ...products.map((p) => `
  <url>
    <loc>${escape(SITE_URL + '/producto/' + p.slug)}</loc>
    <lastmod>${(p.updatedAt || new Date()).toISOString().slice(0, 10)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`),
    ].join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err) { next(err); }
};

exports.getBrands = async (req, res, next) => {
  try {
    const brands = await Product.distinct('brand', { isActive: true });
    res.json(brands.sort());
  } catch (err) { next(err); }
};

/* ---------- Admin ---------- */

exports.adminGetAll = async (req, res, next) => {
  try {
    const { q, cat, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (cat && cat !== 'todos') filter.category = cat;
    if (q) filter.$text = { $search: q };

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Product.countDocuments(filter),
    ]);
    res.json({ products, total });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    invalidateCatalog();
    res.status(201).json(product);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const before = await Product.findById(req.params.id).select('stock');
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

    // Detect restock: stock went from 0 → >0 → surface pending requests so admin can notify.
    let restockAlert = null;
    if (before && before.stock === 0 && product.stock > 0) {
      const RestockRequest = require('../models/RestockRequest');
      const { broadcast } = require('../lib/sse');
      const pending = await RestockRequest.find({ product: product._id, notified: false })
        .sort({ createdAt: 1 });
      if (pending.length > 0) {
        restockAlert = { count: pending.length, requests: pending };
        broadcast('restock-available', {
          productId: product._id,
          productName: product.name,
          waitingCount: pending.length,
        });
      }
    }

    invalidateCatalog();
    res.json({ ...product.toObject(), restockAlert });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    invalidateCatalog();
    res.json({ message: 'Producto eliminado' });
  } catch (err) { next(err); }
};

exports.uploadImages = async (req, res, next) => {
  try {
    if (!req.cloudinaryFiles?.length) return res.status(400).json({ error: 'No se recibieron imágenes' });
    const urls = req.cloudinaryFiles.map((f) => f.url);
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $push: { images: { $each: urls } } },
      { new: true }
    );
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ urls, product });
  } catch (err) { next(err); }
};

/* ─── Auto-tagging — analiza nombre/descripción/marca y propone tags. ───
 * Idempotente: solo AGREGA tags al set existente, nunca sobreescribe lo que
 * el admin ya configuró manualmente.
 *
 * Modo:
 *   ?dryRun=true → devuelve sugerencias sin guardar (preview)
 *   default      → aplica y devuelve resumen
 */
const AUTO_TAG_KEYWORDS = {
  // labios / maquillaje
  labial:        ['labial','labiales','labio','labios','lip ','lipstick','rouge','pintalabios'],
  gloss:         ['gloss',' brillo'],
  tinta:         ['tinta','tint '],
  balsamo:       ['balsamo','bálsamo','balm'],
  // ojos
  sombra:        ['sombra','sombras','eyeshadow'],
  mascara:       ['mascara','rimmel','pestañ','pestañina','pestaninas'],
  delineador:    ['delineador','eyeliner','kohl'],
  // rostro
  base:          ['base ','foundation','bb cream','cc cream'],
  rubor:         ['rubor','blush','colorete'],
  iluminador:    ['iluminador','highlighter'],
  corrector:     ['corrector','concealer','cubre ojeras'],
  primer:        ['primer','prebase','pre-base'],
  polvo:         ['polvo','powder','compacto'],
  bronzer:       ['bronzer','bronceador'],
  // skincare
  serum:         ['serum','sérum','niacinamida','retinol','vitamina c','vitamin c'],
  crema:         ['crema','cream'],
  hidratante:    ['hidratante','moisturizer'],
  limpiador:     ['limpiador','limpieza','cleanser','jabon','jabón'],
  tonico:        ['tonico','tónico','toner'],
  mascarilla:    ['mascarilla','mask'],
  exfoliante:    ['exfoliante','peeling','scrub'],
  protector:     ['protector solar','protectores solares','solar','bloqueador','spf','sunscreen'],
  contorno:      ['contorno'],
  // cabello
  shampoo:       ['shampoo','champu','champú'],
  acondicionador:['acondicionador','conditioner'],
  tratamiento:   ['tratamiento','keratina','queratina'],
  // perfumes
  perfume:       ['perfume','colonia','fragancia','eau de'],
  // especiales
  accesorio:     ['algodon','algodones','vincha','vinchas','panoleta','pañoleta','panoletas','pañoletas','cepillo','cepillos','esponja','esponjas','brocha','brochas','aplicador','aplicadores','sacapuntas'],
  kit:           ['kit ','set ','combo ','pack ','paquete '],
};

function normalizeForMatch(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectTagsForProduct(product) {
  const hay = ' ' + normalizeForMatch(
    `${product.name || ''} ${product.description || ''} ${(product.features || []).join(' ')} ${product.brand || ''}`
  ) + ' ';
  const found = new Set();
  for (const [tag, kws] of Object.entries(AUTO_TAG_KEYWORDS)) {
    if (kws.some((k) => hay.includes(normalizeForMatch(k)))) found.add(tag);
  }
  // Heuristic: products in 'cabello' that match 'tratamiento' AND 'protector'
  // are termo-protectores → drop the 'protector' tag (it's a hair protector,
  // not a skin SPF). Avoids the "Termo protector cabello" false positive.
  if (product.category === 'cabello' && found.has('protector')) {
    found.delete('protector');
  }
  // Same: a 'jabon' tagged limpiador in skincare is still a skincare cleanser,
  // but if it's in another category we don't tag it as limpiador.
  return [...found];
}

exports.autoTagAll = async (req, res, next) => {
  try {
    const dryRun = String(req.query.dryRun || '').toLowerCase() === 'true';
    const products = await Product.find({ isActive: true });
    const preview = [];
    const errors = [];
    let updated = 0;
    for (const p of products) {
      const suggested = detectTagsForProduct(p);
      const existing = new Set((p.tags || []).map((t) => String(t).toLowerCase()));
      const toAdd = suggested.filter((t) => !existing.has(t));
      if (toAdd.length === 0) continue;
      preview.push({
        id: String(p._id),
        name: p.name,
        category: p.category,
        existing: [...existing],
        added: toAdd,
      });
      if (!dryRun) {
        // updateOne con $set NO valida campos no tocados — evita romper por
        // datos heredados (ej: stock negativo) que no son responsabilidad de
        // este endpoint. Try/catch por producto para que una fila mala no
        // mate el batch entero.
        try {
          await Product.updateOne(
            { _id: p._id },
            { $set: { tags: [...existing, ...toAdd] } }
          );
          updated += 1;
        } catch (err) {
          errors.push({ id: String(p._id), name: p.name, error: err.message });
        }
      }
    }
    if (!dryRun && updated > 0) invalidateCatalog();
    res.json({
      dryRun,
      totalScanned: products.length,
      totalChanged: preview.length,
      updated,
      errors,
      preview,
    });
  } catch (err) { next(err); }
};

/* ─── Bulk CSV import ───
 * Acepta un array de productos (parseado por el frontend desde un CSV) y los
 * crea o actualiza. Por slug: si existe, hace update; si no, create.
 * Devuelve resumen detallado para que el admin sepa qué pasó con cada fila.
 */
const VALID_CATEGORIES = ['rizos', 'limpieza', 'tratamiento', 'kids', 'kits'];

function slugify(s = '') {
  return String(s).toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeRow(row) {
  if (!row || typeof row !== 'object') return null;
  const name = String(row.name || row.nombre || '').trim();
  const brand = String(row.brand || row.marca || '').trim();
  const category = String(row.category || row.categoria || '').toLowerCase().trim();
  const price = Number(row.price || row.precio);
  if (!name || !brand || !category || !Number.isFinite(price) || price <= 0) return null;
  if (!VALID_CATEGORIES.includes(category)) return null;

  const slug = String(row.slug || '').trim().toLowerCase() || slugify(name);
  const oldPriceRaw = row.oldPrice ?? row.precioAnterior ?? row.old_price;
  const stockRaw    = row.stock;
  const tagsRaw     = row.tags ?? row.etiquetas;

  return {
    name,
    slug,
    brand,
    category,
    price,
    oldPrice: oldPriceRaw === '' || oldPriceRaw == null ? null : Number(oldPriceRaw) || null,
    description: String(row.description || row.descripcion || '').trim(),
    stock: stockRaw === '' || stockRaw == null ? null : Number(stockRaw),
    tags: typeof tagsRaw === 'string'
      ? tagsRaw.split(/[,;|]/).map((t) => slugify(t)).filter(Boolean)
      : Array.isArray(tagsRaw) ? tagsRaw.map((t) => slugify(t)).filter(Boolean) : [],
    badge: String(row.badge || '').trim(),
    isActive: row.isActive !== false && row.isActive !== 'false' && row.isActive !== 0,
  };
}

exports.bulkImport = async (req, res, next) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (rows.length === 0) return res.status(400).json({ error: 'Sin filas para importar.' });
    if (rows.length > 500) return res.status(413).json({ error: 'Máximo 500 productos por importación.' });

    const dryRun = String(req.query.dryRun || '').toLowerCase() === 'true';

    const results = { created: 0, updated: 0, skipped: 0, errors: [], details: [] };
    for (let i = 0; i < rows.length; i++) {
      const data = normalizeRow(rows[i]);
      if (!data) {
        results.skipped += 1;
        results.errors.push({ row: i + 1, error: 'Datos inválidos (faltan name/brand/category/price o categoría inválida)' });
        results.details.push({ row: i + 1, name: rows[i]?.name || '—', action: 'skipped' });
        continue;
      }
      try {
        const existing = await Product.findOne({ slug: data.slug });
        if (existing) {
          if (!dryRun) {
            // Merge: tags se agregan al set existente; otros campos se reemplazan
            const mergedTags = [...new Set([...(existing.tags || []), ...data.tags])];
            await Product.updateOne({ _id: existing._id }, { ...data, tags: mergedTags });
          }
          results.updated += 1;
          results.details.push({ row: i + 1, name: data.name, slug: data.slug, action: 'updated' });
        } else {
          if (!dryRun) await Product.create(data);
          results.created += 1;
          results.details.push({ row: i + 1, name: data.name, slug: data.slug, action: 'created' });
        }
      } catch (err) {
        results.errors.push({ row: i + 1, name: data.name, error: err.message });
        results.skipped += 1;
        results.details.push({ row: i + 1, name: data.name, action: 'error', error: err.message });
      }
    }

    if (!dryRun && (results.created > 0 || results.updated > 0)) invalidateCatalog();
    res.json({ dryRun, ...results });
  } catch (err) { next(err); }
};

/* Data cleanup: clamp negative stock to 0. Causa común: una orden vieja
 * descontó stock cuando ya estaba en 0 o por una race condition. El schema
 * tiene min:0 así que cualquier intento de save() rompe hasta que esto se
 * arregla. Idempotente — sin productos afectados devuelve 0. */
exports.fixNegativeStock = async (req, res, next) => {
  try {
    const dryRun = String(req.query.dryRun || '').toLowerCase() === 'true';
    const broken = await Product.find({ stock: { $lt: 0 } }).select('name slug stock').lean();
    if (broken.length === 0) {
      return res.json({ dryRun, fixed: 0, products: [] });
    }
    if (!dryRun) {
      await Product.updateMany({ stock: { $lt: 0 } }, { $set: { stock: 0 } });
      invalidateCatalog();
    }
    res.json({ dryRun, fixed: broken.length, products: broken });
  } catch (err) { next(err); }
};

exports.toggleActive = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    product.isActive = !product.isActive;
    await product.save();
    invalidateCatalog();
    res.json(product);
  } catch (err) { next(err); }
};
