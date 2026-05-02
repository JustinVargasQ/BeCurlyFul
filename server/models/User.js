const { Schema, model } = require('mongoose');

const userSchema = new Schema(
  {
    googleId: { type: String, unique: true, index: true, required: true },
    email:    { type: String, unique: true, index: true, required: true, lowercase: true, trim: true },
    name:     { type: String, required: true, trim: true, maxlength: 120 },
    picture:  { type: String, default: '' },
    locale:   { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = model('User', userSchema);
