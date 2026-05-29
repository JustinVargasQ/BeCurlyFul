// Script one-shot: sube las 14 fotos de productos al Cloudinary de Be Curly Full CR
// y genera el nuevo src/data/products.js con las URLs reales.
// Correr desde la raiz del proyecto: node upload-images.js

const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs   = require('fs');

cloudinary.config({
  cloud_name: 'dq4eqkzyn',
  api_key:    '457353387749256',
  api_secret: 'UdZUEnrd9jqTm-spPgGXEpcHbmw',
});

const PRODUCTS_DIR = path.join(__dirname, '..', 'public', 'imgs', 'productos');
const FOLDER       = 'becurlyfulcr/productos';

// Mapeo: nombre de archivo → slug del producto en products.js
const IMAGE_MAP = [
  { file: 'Activador de Rizos.jpg',        slug: 'activador-de-rizos'       },
  { file: 'Crema Gel.jpg',                 slug: 'crema-gel-rizos'          },
  { file: 'Crema Hidratante.jpg',          slug: 'crema-hidratante-rizos'   },
  { file: 'Gel alta Fijación.jpg',         slug: 'gel-alta-fijacion'        },
  { file: 'Gel alta fijación XL.jpg',      slug: 'gel-alta-fijacion-xl'     },
  { file: 'Shampoo limpieza diaria.jpg',   slug: 'shampoo-limpieza-diaria'  },
  { file: 'Shampoo Limpieza Profunda.jpg', slug: 'shampoo-limpieza-profunda'},
  { file: 'Acondicionador Revitalizante.jpg', slug: 'acondicionador-revitalizante' },
  { file: 'Mascarilla Hidronutritiva.jpg', slug: 'mascarilla-hidronutritiva' },
  { file: 'Travel KIT.jpg',               slug: 'travel-kit'               },
  { file: 'Shampoo KIDS.jpg',             slug: 'shampoo-kids'             },
  { file: 'Acondicionador KIDS.jpg',      slug: 'acondicionador-kids'      },
  { file: 'Crema para Peinar KIDS.jpg',   slug: 'crema-peinar-kids'        },
  { file: 'Gel líquido KIDS.jpg',         slug: 'gel-liquido-kids'         },
];

async function uploadAll() {
  const results = {};

  for (const { file, slug } of IMAGE_MAP) {
    const filePath = path.join(PRODUCTS_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.error(`⚠  No encontrado: ${file}`);
      continue;
    }
    try {
      console.log(`⬆  Subiendo: ${file}...`);
      const res = await cloudinary.uploader.upload(filePath, {
        folder:         FOLDER,
        public_id:      slug,
        overwrite:      true,
        resource_type:  'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      });
      results[slug] = res.secure_url;
      console.log(`✅ ${slug} → ${res.secure_url}`);
    } catch (err) {
      console.error(`❌ Error en ${file}:`, err.message);
    }
  }

  // Generar el products.js actualizado
  const productsPath = path.join(__dirname, '..', 'src', 'data', 'products.js');
  let content = fs.readFileSync(productsPath, 'utf8');

  for (const [slug, url] of Object.entries(results)) {
    // Reemplaza /imgs/productos/... por la URL de Cloudinary
    const escaped = slug.replace(/[-]/g, '\\-');
    content = content.replace(
      new RegExp(`slug: '${escaped}',[\\s\\S]*?img: '[^']*'`, 'm'),
      (match) => match.replace(/img: '[^']*'/, `img: '${url}'`)
    );
  }

  fs.writeFileSync(productsPath, content, 'utf8');
  console.log('\n🎉 products.js actualizado con URLs de Cloudinary');
  console.log('Imágenes subidas:', Object.keys(results).length, '/ 14');
}

uploadAll().catch(console.error);
