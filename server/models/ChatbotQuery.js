const { Schema, model } = require('mongoose');

/* Light log of chatbot queries — used by the admin to see what users ask, what
 * the bot couldn't resolve, and where the catalog has gaps.
 *
 * NO PII: we don't store IP, user-agent, or session id. Just text + outcome.
 * Auto-expires after 90 days via TTL index. */
const chatbotQuerySchema = new Schema(
  {
    text:     { type: String, required: true, trim: true, maxlength: 500 },
    kind:     { type: String, required: true, index: true }, // rule kind or 'ai'
    resolved: { type: Boolean, required: true, index: true },
    createdAt:{ type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

// Auto-expire after 90 days
chatbotQuerySchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = model('ChatbotQuery', chatbotQuerySchema);
