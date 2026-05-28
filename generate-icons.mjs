import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = resolve(__dirname, 'public/icons/logo.jpg');

const icons = [
  { out: 'public/icons/icon-512.png',          size: 512 },
  { out: 'public/icons/icon-192.png',          size: 192 },
  { out: 'public/icons/apple-touch-icon.png',  size: 180 },
  { out: 'public/icons/favicon-32.png',        size: 32  },
];

for (const { out, size } of icons) {
  await sharp(src)
    .resize(size, size, { fit: 'cover', position: 'center' })
    .png()
    .toFile(resolve(__dirname, out));
  console.log(`✅ ${out} (${size}x${size})`);
}

console.log('🎉 Todos los íconos generados');
