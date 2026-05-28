import { Helmet } from 'react-helmet-async';

const SITE_NAME  = 'Be Curly Full CR';
const SITE_URL   = 'https://becurlyful.vercel.app';
const DEFAULT_IMG = `${SITE_URL}/icons/icon-512.png`;
const DEFAULT_DESC = 'Productos para cabello rizado y cuidado capilar con envíos a todo Costa Rica.';

/* Cuando renderizas SEO sin url (o url === '/'), inyectamos tambien el
 * structured data de LocalBusiness. Google lo usa para el panel de marca
 * (logo, nombre, telefono) en busquedas tipo "Be Curly Full CR".
 * Solo en la home para no duplicarlo. */
const LOCAL_BUSINESS_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Store',
  name: 'Be Curly Full CR',
  url: 'https://becurlyful.vercel.app',
  logo: `${SITE_URL}/icons/icon-512.png`,
  image: `${SITE_URL}/icons/icon-512.png`,
  description: 'Tienda especializada en productos para cabello rizado y cuidado capilar con envíos a todo Costa Rica.',
  telephone: '+506 7212-5261',
  email: 'info@becurlyful.cr',
  priceRange: '₡₡',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'CR',
  },
  areaServed: { '@type': 'Country', name: 'Costa Rica' },
  sameAs: [
    'https://wa.me/50672125261',
    'https://www.instagram.com/becurlyfulcr',
    'https://www.facebook.com/share/1BzCcTxMcy/',
  ],
  openingHoursSpecification: [{
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    opens: '09:00',
    closes: '19:00',
  }],
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://becurlyful.vercel.app/?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

export default function SEO({ title, description, image, url, type = 'website', product, noindex = false }) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Cabello Rizado | Costa Rica`;
  const desc  = description || DEFAULT_DESC;
  const img   = image || DEFAULT_IMG;
  const canonical = url ? `${SITE_URL}${url}` : SITE_URL;
  const isHome = !url || url === '/' || url === '';

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

      {/* LocalBusiness JSON-LD — solo en la home, para no duplicar en sub-paginas
          (Google ignora schemas duplicados pero algunos validators los marcan). */}
      {isHome && !product && (
        <script type="application/ld+json">
          {JSON.stringify(LOCAL_BUSINESS_JSONLD)}
        </script>
      )}

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
