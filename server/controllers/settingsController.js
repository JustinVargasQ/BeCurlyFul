const Settings = require('../models/Settings');

async function getSingleton() {
  let s = await Settings.findOne({ key: 'main' });
  if (!s) s = await Settings.create({ key: 'main' });
  return s;
}

exports.get = async (req, res, next) => {
  try {
    const s = await getSingleton();
    res.json(s);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const allowed = [
      'storeName', 'whatsapp', 'email', 'address',
      'heroTitle', 'heroSub', 'heroStyle',
      'shippingCostCorreos', 'shippingCostExpress', 'freeShippingFrom',
      'bankInfo',
      'sinpePhone', 'sinpeName',
      'notificationEmail',
      'promoBanner', 'promoBannerActive', 'promoBannerColor',
      'autoConfirmOrders',
    ];
    const patch = {};
    for (const k of allowed) {
      if (k in req.body) patch[k] = req.body[k];
    }

    const s = await Settings.findOneAndUpdate(
      { key: 'main' },
      { $set: patch },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );
    res.json(s);
  } catch (err) { next(err); }
};
