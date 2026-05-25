import { Helmet } from 'react-helmet-async';

const SITE_NAME  = 'JD Virtual Store';
const SITE_URL   = 'https://jd-virtual.vercel.app';
const DEFAULT_IMG = `${SITE_URL}/icons/icon-512.png`;
const DEFAULT_DESC = 'Maquillaje y skincare de marcas auténticas con envíos a todo Costa Rica desde El Roble, Puntarenas.';

export default function SEO({ title, description, image, url, type = 'website', product, noindex = false }) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Maquillaje & Skincare | Costa Rica`;
  const desc  = description || DEFAULT_DESC;
  const img   = image || DEFAULT_IMG;
  const canonical = url ? `${SITE_URL}${url}` : SITE_URL;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex, follow" />}

      {/* Open Graph */}
      <meta property="og:site_name"   content={SITE_NAME} />
      <meta property="og:type"        content={type} />
      <meta property="og:url"         content={canonical} />
      <meta property="og:title"       content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image"       content={img} />
      <meta property="og:locale"      content="es_CR" />

      {/* Twitter */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image"       content={img} />

      {/* Product structured data (JSON-LD).
          Includes AggregateRating when there's a real review base — Google
          surfaces ★ rating + review count directly in search results.
          Also includes priceValidUntil + sku/mpn for better matching. */}
      {product && (
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.name,
            description: product.description || desc,
            image: img,
            sku: product.slug || product._id,
            brand: { '@type': 'Brand', name: product.brand },
            ...(product.category ? { category: product.category } : {}),
            offers: {
              '@type': 'Offer',
              url: canonical,
              priceCurrency: 'CRC',
              price: product.price,
              ...(product.oldPrice && product.oldPrice > product.price ? {
                priceSpecification: {
                  '@type': 'UnitPriceSpecification',
                  price: product.price,
                  priceCurrency: 'CRC',
                  referencePrice: { '@type': 'UnitPriceSpecification', price: product.oldPrice, priceCurrency: 'CRC' },
                },
              } : {}),
              availability: product.stock === 0
                ? 'https://schema.org/OutOfStock'
                : 'https://schema.org/InStock',
              seller: { '@type': 'Organization', name: SITE_NAME },
            },
            ...(product.reviewCount > 0 && product.rating > 0 ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: Number(product.rating).toFixed(1),
                reviewCount: product.reviewCount,
                bestRating: 5,
                worstRating: 1,
              },
            } : {}),
          })}
        </script>
      )}
    </Helmet>
  );
}
