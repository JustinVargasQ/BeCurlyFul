require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const Product  = require('./models/Product');
const Admin    = require('./models/Admin');

const PRODUCTS = [
  {
    name: 'Paleta de sombras 35 colores', slug: 'paleta-sombras-35-colores',
    brand: 'Beauty Creations', category: 'ojos',
    price: 12500, oldPrice: 15000, rating: 4.9, reviewCount: 482,
    badge: 'Top ventas', badgeType: '',
    images: ['https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&q=80&auto=format&fit=crop'],
    description: 'La paleta más completa para crear cualquier look: 35 tonos ultra-pigmentados entre mates, shimmer y metálicos en acabados que duran todo el día sin caídas.',
    features: ['35 sombras en tonos tierra, rosa y esmeralda', 'Fórmula cremosa de larga duración', 'Espejo incorporado, ideal para viaje', 'Vegano y cruelty-free'],
  },
  {
    name: 'Niacinamide 10% + Zinc 1%', slug: 'niacinamide-10-zinc-1',
    brand: 'The Ordinary', category: 'skincare',
    price: 9800, oldPrice: null, rating: 4.8, reviewCount: 367,
    badge: 'Nuevo', badgeType: 'new',
    images: ['https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&q=80&auto=format&fit=crop'],
    description: 'Sérum concentrado que reduce la apariencia de poros abiertos y equilibra la producción de grasa para una piel visiblemente más uniforme.',
    features: ['Controla el brillo en zona T', 'Reduce marcas de imperfecciones', 'Sin parabenos ni fragancia', 'Apto para piel sensible'],
  },
  {
    name: 'Hydrating Cleanser', slug: 'hydrating-cleanser-cerave',
    brand: 'CeraVe', category: 'skincare',
    price: 14500, oldPrice: null, rating: 4.9, reviewCount: 521,
    badge: 'Favorito', badgeType: '',
    images: ['https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800&q=80&auto=format&fit=crop'],
    description: 'Limpiador suave y sin fragancia desarrollado con dermatólogos. Limpia e hidrata en un solo paso con 3 ceramidas esenciales.',
    features: ['Restaura la barrera natural', 'Con ácido hialurónico', 'No reseca ni irrita', '473 ml · rendimiento largo'],
  },
  {
    name: 'Labial matte líquido', slug: 'labial-matte-liquido-italia',
    brand: 'Italia Deluxe', category: 'labios',
    price: 4500, oldPrice: null, rating: 4.7, reviewCount: 298,
    badge: '', badgeType: '',
    images: ['https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&q=80&auto=format&fit=crop'],
    description: 'Labial líquido de acabado mate intenso que se mantiene fijo hasta 8 horas sin resecar. Color uniforme desde la primera pasada.',
    features: ['Alta pigmentación', 'No se transfiere', 'Con vitamina E', 'Disponible en 12 tonos'],
  },
  {
    name: 'Base líquida HD larga duración', slug: 'base-liquida-hd-beauty-creations',
    brand: 'Beauty Creations', category: 'rostro',
    price: 11000, oldPrice: 13500, rating: 4.8, reviewCount: 412,
    badge: 'Top ventas', badgeType: '',
    images: ['https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=800&q=80&auto=format&fit=crop'],
    description: 'Base de cobertura media a completa, buildable, con acabado natural luminoso. Resiste calor, humedad y hasta 16 horas de uso.',
    features: ['24 tonos inclusivos', 'Oil-free y no-comedogénica', 'Con SPF 20', 'Efecto "segunda piel"'],
  },
  {
    name: 'Rubor en polvo compacto', slug: 'rubor-polvo-compacto-amor-us',
    brand: 'Amor Us', category: 'rostro',
    price: 5500, oldPrice: null, rating: 4.6, reviewCount: 187,
    badge: '', badgeType: '',
    images: ['https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=800&q=80&auto=format&fit=crop'],
    description: 'Rubor en polvo compacto con textura sedosa que se difumina sin esfuerzo. Tonos naturales que dan un efecto "just-flushed" realista.',
    features: ['Larga duración, no se corre', 'Empaque con espejo', 'Ideal para todos los tonos de piel', 'Vegano'],
  },
  {
    name: 'Delineador líquido negro', slug: 'delineador-liquido-negro-amuse',
    brand: 'Amuse', category: 'ojos',
    price: 3800, oldPrice: null, rating: 4.7, reviewCount: 214,
    badge: '', badgeType: '',
    images: ['https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800&q=80&auto=format&fit=crop'],
    description: 'Delineador líquido con punta ultra fina de precisión. Trazo firme, intenso y sin saltos para crear cat eyes impecables.',
    features: ['Secado rápido, efecto mate', 'Resistente al agua', 'Pincel de fibra suave', 'Fórmula de alta pigmentación'],
  },
  {
    name: 'Sérum Vitamina C 23%', slug: 'serum-vitamina-c-23-the-ordinary',
    brand: 'The Ordinary', category: 'skincare',
    price: 13200, oldPrice: null, rating: 4.9, reviewCount: 389,
    badge: 'Nuevo', badgeType: 'new',
    images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80&auto=format&fit=crop'],
    description: 'Vitamina C pura al 23% en suspensión anhidra. Ilumina, unifica el tono y protege del daño ambiental del día a día.',
    features: ['Reduce manchas oscuras', 'Efecto antioxidante potente', 'Textura ligera no grasosa', 'Uso preferente de noche'],
  },
  {
    name: 'Brillo labial glossy', slug: 'brillo-labial-glossy-beau-visage',
    brand: 'Beau Visage', category: 'labios',
    price: 4200, oldPrice: null, rating: 4.6, reviewCount: 156,
    badge: '', badgeType: '',
    images: ['https://images.unsplash.com/photo-1519415943484-9fa1873496d4?w=800&q=80&auto=format&fit=crop'],
    description: 'Gloss hidratante con acabado espejo y toque de plumping. Da volumen visual sin picar y deja los labios suaves todo el día.',
    features: ['Acabado brillante no pegajoso', 'Con ácido hialurónico', 'Aroma suave a vainilla', '6 tonos shimmer'],
  },
  {
    name: 'Máscara de pestañas volumen', slug: 'mascara-pestanas-volumen-italia',
    brand: 'Italia Deluxe', category: 'ojos',
    price: 5000, oldPrice: null, rating: 4.8, reviewCount: 267,
    badge: '', badgeType: '',
    images: ['https://images.unsplash.com/photo-1502781252888-9143ba7f074e?w=800&q=80&auto=format&fit=crop'],
    description: 'Máscara de volumen extremo con cepillo curvo. Multiplica, alarga y define cada pestaña desde la primera capa.',
    features: ['Fórmula sin grumos', 'Se retira fácil con agua tibia', 'Negro intenso', 'Apto para lentes de contacto'],
  },
  {
    name: 'Set brochas profesionales x12', slug: 'set-brochas-profesionales-x12',
    brand: 'Ushas', category: 'maquillaje',
    price: 15900, oldPrice: 19500, rating: 4.9, reviewCount: 345,
    badge: 'Oferta', badgeType: 'sale',
    images: ['https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=800&q=80&auto=format&fit=crop'],
    description: 'Set de 12 brochas esenciales con cerdas sintéticas súper suaves. Cubre rostro, ojos y detallado. Viene en estuche premium.',
    features: ['Cerdas vegan, cruelty-free', 'Mangos ergonómicos rose-gold', 'Incluye estuche rígido', 'No sueltan pelo'],
  },
  {
    name: 'Contorno e iluminador dúo', slug: 'contorno-iluminador-duo-celavi',
    brand: 'Celavi', category: 'rostro',
    price: 7500, oldPrice: null, rating: 4.7, reviewCount: 198,
    badge: '', badgeType: '',
    images: ['https://images.unsplash.com/photo-1571646034647-52e6ea84b28c?w=800&q=80&auto=format&fit=crop'],
    description: 'Dúo compacto con contorno mate y highlighter shimmer. Esculpe y realza en un solo paso, ideal para llevar en la cartera.',
    features: ['Dos acabados en un producto', 'Textura fundible', 'Buildable de nude a glam', 'Pigmentación balanceada'],
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Conectado a MongoDB');

  // Clear
  await Promise.all([Product.deleteMany(), Admin.deleteMany()]);
  console.log('🗑️  Colecciones limpiadas');

  // Products
  await Product.insertMany(PRODUCTS);
  console.log(`✅ ${PRODUCTS.length} productos insertados`);

  // Admin
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'jd2024', 12);
  await Admin.create({
    name:  'Admin BCF',
    email: process.env.ADMIN_EMAIL || 'admin@becurlyful.cr',
    passwordHash,
  });
  console.log('✅ Admin creado');
  console.log('──────────────────────────────────');
  console.log('   Email:', process.env.ADMIN_EMAIL || 'admin@becurlyful.cr');
  console.log('   Password:', process.env.ADMIN_PASSWORD || 'jd2024');
  console.log('──────────────────────────────────');

  await mongoose.disconnect();
  console.log('🎉 Seed completado');
}

seed().catch((err) => { console.error(err); process.exit(1); });
