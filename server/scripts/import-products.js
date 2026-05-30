/**
 * Importa products-import.json a MongoDB.
 * Uso: node server/scripts/import-products.js
 * - Si el producto (por slug) ya existe, lo actualiza.
 * - Si no existe, lo crea.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Product  = require('../models/Product');
const products = require('../../products-import.json');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ MongoDB conectado');

  let created = 0, updated = 0, errors = 0;

  for (const p of products) {
    try {
      const result = await Product.findOneAndUpdate(
        { slug: p.slug },
        {
          $set: {
            name:        p.name,
            slug:        p.slug,
            brand:       p.brand,
            category:    p.category,
            price:       p.price,
            oldPrice:    p.oldPrice || null,
            description: p.description || '',
            features:    p.features   || [],
            images:      p.images     || [],
            badge:       p.badge      || '',
            badgeType:   p.badgeType  || '',
            isActive:    p.isActive   !== false,
            stock:       p.stock      ?? 100,
            rating:      p.rating     || 0,
            reviewCount: p.reviewCount|| 0,
          },
        },
        { upsert: true, new: true, runValidators: true }
      );
      const wasNew = result.createdAt?.getTime() === result.updatedAt?.getTime();
      wasNew ? created++ : updated++;
      console.log(`  ${wasNew ? '➕' : '✏️ '} ${p.name}`);
    } catch (err) {
      errors++;
      console.error(`  ❌ ${p.name}: ${err.message}`);
    }
  }

  console.log(`\n📦 Listo — ${created} creados, ${updated} actualizados, ${errors} errores`);
  await mongoose.disconnect();
}

run().catch((err) => { console.error(err); process.exit(1); });
