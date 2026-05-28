require('dotenv').config();
const mongoose = require('mongoose');
const Product  = require('./models/Product');
const data     = require('./firebase_products.json');

// Firebase category ID → our category slug
const FIREBASE_CAT_MAP = {
  '7FdNs4hVOcmfwAUoZik4': 'labios',      // Labios
  'AchSHOFNZGbZgLSjtckx': 'ojos',        // Cejas
  'ImDbmywpuwNI9YJBHn9J': 'ojos',        // Pestañas
  'LDsxoXNlCZD8Hg6wJ9jG': 'rostro',     // Rostro
  'PpRJDiGNNhUh9mus1Lv9': 'maquillaje', // Productos nuevos
  'PzxwppdveQEku0fBWQlp': 'skincare',   // Skincare
  'WdX3gJoZkAdAjaktiw1v': 'maquillaje', // Accesorios
  's6K55TbU5D997WpHyAlN': 'cabello',    // Cabello → maquillaje (no está en nuestro enum, lo ponemos en maquillaje)
};

function guessCategory(name = '', catId = '') {
  if (FIREBASE_CAT_MAP[catId]) return FIREBASE_CAT_MAP[catId];
  const text = name.toLowerCase();
  if (/labial|gloss|lip|bálsamo|balm/.test(text))  return 'labios';
  if (/rímel|rimel|delineador|sombra|ceja|pestaña|mascara/.test(text)) return 'ojos';
  if (/base|corrector|polvo|rubor|contorno|iluminador|primer|sellador/.test(text)) return 'rostro';
  if (/sérum|serum|bloqueador|tónico|hidratante|limpiador|exfoliante|skincare|crema/.test(text)) return 'skincare';
  return 'maquillaje';
}

function slugify(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}

function getField(fields, key) {
  const f = fields[key];
  if (!f) return null;
  return f.stringValue ?? f.integerValue ?? f.doubleValue ?? f.booleanValue ?? null;
}

function getArray(fields, key) {
  const f = fields[key];
  if (!f?.arrayValue?.values) return [];
  return f.arrayValue.values.map(v => v.stringValue || v.mapValue?.fields?.imageUrl?.stringValue || '').filter(Boolean);
}

function parseProduct(doc) {
  const fields = doc.fields || {};
  const name     = getField(fields, 'name') || 'Sin nombre';
  const price    = parseFloat(getField(fields, 'price') || getField(fields, 'basePrice') || 0);
  const oldPrice = parseFloat(getField(fields, 'originalPrice') || getField(fields, 'compareAtPrice') || 0) || null;
  const desc     = getField(fields, 'description') || '';
  const brand    = getField(fields, 'brand') || getField(fields, 'brandName') || 'Be Curly Full CR';
  const cat      = getField(fields, 'category') || getField(fields, 'categoryId') || '';
  const badge    = getField(fields, 'badge') || getField(fields, 'tag') || '';
  const stock    = parseInt(getField(fields, 'stock') || getField(fields, 'quantity') || 99);
  const rating   = parseFloat(getField(fields, 'rating') || 5);
  const reviews  = parseInt(getField(fields, 'reviewCount') || getField(fields, 'reviews') || 0);

  // Images — try multiple field names
  let images = getArray(fields, 'galleryImages');
  if (!images.length) images = getArray(fields, 'images');
  if (!images.length) {
    const main = getField(fields, 'imageUrl') || getField(fields, 'mainImage') || getField(fields, 'image');
    if (main) images = [main];
  }

  // Features
  let features = getArray(fields, 'features');
  if (!features.length) features = getArray(fields, 'highlights');

  const category = guessCategory(name, cat);
  const baseSlug = slugify(name);

  return {
    name, brand, category, price,
    oldPrice: oldPrice && oldPrice > price ? oldPrice : null,
    description: desc,
    features,
    images,
    stock: isNaN(stock) ? 99 : stock,
    isActive: true,
    badge: badge || '',
    badgeType: badge?.toLowerCase().includes('oferta') || badge?.toLowerCase().includes('sale') ? 'sale'
             : badge?.toLowerCase().includes('nuevo') || badge?.toLowerCase().includes('new') ? 'new' : '',
    rating: isNaN(rating) ? 5 : Math.min(5, rating),
    reviewCount: isNaN(reviews) ? 0 : reviews,
    _baseSlug: baseSlug,
  };
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Conectado a MongoDB Atlas');

  const docs = data.documents || [];
  console.log(`📦 ${docs.length} productos encontrados en Firebase`);

  // Clear existing products
  await Product.deleteMany({});
  console.log('🗑️  Productos anteriores eliminados');

  // Parse and deduplicate slugs
  const parsed = docs.map(parseProduct);
  const slugCount = {};
  const products = parsed
    .filter(p => p.price > 0 && p.name !== 'Sin nombre')
    .map(p => {
      slugCount[p._baseSlug] = (slugCount[p._baseSlug] || 0) + 1;
      const slug = slugCount[p._baseSlug] > 1
        ? `${p._baseSlug}-${slugCount[p._baseSlug]}`
        : p._baseSlug;
      const { _baseSlug, ...rest } = p;
      return { ...rest, slug };
    });

  console.log(`✅ ${products.length} productos válidos después de filtrar`);

  // Show sample
  console.log('\n📋 Muestra de productos importados:');
  products.slice(0, 5).forEach(p => {
    console.log(`  • ${p.name} | ${p.category} | ₡${p.price.toLocaleString()} | ${p.images.length} img`);
  });

  // Insert
  const inserted = await Product.insertMany(products, { ordered: false });
  console.log(`\n🎉 ${inserted.length} productos insertados en Atlas`);

  // Stats by category
  const byCat = {};
  products.forEach(p => { byCat[p.category] = (byCat[p.category] || 0) + 1; });
  console.log('\n📊 Por categoría:');
  Object.entries(byCat).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  await mongoose.disconnect();
  console.log('\n✅ Importación completa');
}

run().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
