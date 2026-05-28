import { motion } from 'framer-motion';
import SEO from '../components/ui/SEO';

const SECTIONS = [
  {
    title: '1. Información que recopilamos',
    content: `Al realizar un pedido en Be Curly Full CR, recopilamos los siguientes datos personales:
• Nombre completo
• Número de teléfono (WhatsApp)
• Provincia y dirección de entrega
• Notas adicionales que el cliente proporcione voluntariamente

No recopilamos datos de tarjetas de crédito ni información financiera. Los pagos se realizan por SINPE Móvil directamente entre el cliente y Be Curly Full CR.`,
  },
  {
    title: '2. Uso de la información',
    content: `Utilizamos su información exclusivamente para:
• Procesar y coordinar su pedido
• Comunicarnos con usted sobre el estado del envío
• Coordinar la entrega o retiro del pedido
• Resolver consultas o reclamos relacionados con su compra

No vendemos, alquilamos ni compartimos su información personal con terceros con fines comerciales.`,
  },
  {
    title: '3. Base legal (Ley 8968 de Costa Rica)',
    content: `De conformidad con la Ley 8968 — Ley de Protección de la Persona frente al Tratamiento de sus Datos Personales — el tratamiento de sus datos se realiza con su consentimiento explícito al momento de completar el formulario de pedido, y es necesario para la ejecución del contrato de compraventa.

Usted tiene derecho a:
• Acceder a sus datos personales que obran en nuestro poder
• Rectificar datos incorrectos o incompletos
• Solicitar la supresión de sus datos cuando no sean necesarios
• Oponerse al tratamiento de sus datos en cualquier momento`,
  },
  {
    title: '4. Almacenamiento y seguridad',
    content: `Sus datos se almacenan en servidores seguros con las siguientes medidas de protección:
• Conexión cifrada HTTPS en todo momento
• Acceso restringido al panel de administración mediante contraseña y token de sesión
• Los datos de pedidos se conservan por un período de 12 meses para efectos de garantía y soporte`,
  },
  {
    title: '5. Cookies y análisis',
    content: `Utilizamos Google Analytics 4 para analizar el tráfico de la tienda de forma anónima. Estas cookies no contienen información personal identificable. Al navegar en nuestro sitio, usted acepta el uso de estas cookies de análisis.

No utilizamos cookies de rastreo publicitario ni compartimos datos con redes de publicidad.`,
  },
  {
    title: '6. Comunicaciones por WhatsApp',
    content: `Al proporcionar su número de WhatsApp para realizar un pedido, usted consiente recibir mensajes relacionados con:
• Confirmación y estado de su pedido
• Coordinación de entrega o retiro
• Información sobre el pago SINPE

No utilizamos su número para enviar publicidad sin su consentimiento previo.`,
  },
  {
    title: '7. Contacto y derechos ARCO',
    content: `Para ejercer sus derechos de Acceso, Rectificación, Cancelación u Oposición (ARCO), o para cualquier consulta sobre esta política, puede contactarnos por:

• WhatsApp: 7212-5261
• Horario de atención: Lunes a Sábado, 9am a 7pm
• Email: info@becurlyful.cr`,
  },
  {
    title: '8. Cambios a esta política',
    content: `Be Curly Full CR se reserva el derecho de modificar esta política de privacidad en cualquier momento. Los cambios serán publicados en esta página con la fecha de actualización correspondiente. Le recomendamos revisarla periódicamente.`,
  },
];

export default function Privacy() {
  const today = new Date().toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <main className="pt-24 pb-20 bg-white">
      <SEO
        title="Política de privacidad"
        description="Política de privacidad de Be Curly Full CR. Información sobre el tratamiento de datos personales conforme a la Ley 8968 de Costa Rica."
        url="/privacidad"
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10">
          <span className="inline-block text-4xl mb-4">🔒</span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Política de privacidad
          </h1>
          <p className="text-gray-400 text-sm">Última actualización: {today}</p>
          <p className="text-gray-600 mt-4 leading-relaxed">
            En <strong>Be Curly Full CR</strong> nos tomamos en serio la privacidad de nuestros clientes.
            Esta política explica cómo recopilamos, usamos y protegemos su información personal,
            de conformidad con la <strong>Ley 8968</strong> de Protección de Datos Personales de Costa Rica.
          </p>
        </motion.div>

        {/* Sections */}
        <div className="space-y-8">
          {SECTIONS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="border-b border-gray-100 pb-8 last:border-0">
              <h2 className="font-display text-lg font-bold text-gray-900 mb-3">{s.title}</h2>
              <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{s.content}</div>
            </motion.div>
          ))}
        </div>

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 bg-gray-50 border border-gray-100 rounded-2xl p-6 text-center">
          <p className="text-gray-600 text-sm mb-4">
            ¿Tenés preguntas sobre esta política o querés ejercer tus derechos?
          </p>
          <a href="https://wa.me/50672125261?text=Hola! Tengo una consulta sobre la política de privacidad."
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-5 py-2.5 rounded-full transition-colors text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Contactarnos por WhatsApp
          </a>
        </motion.div>
      </div>
    </main>
  );
}
