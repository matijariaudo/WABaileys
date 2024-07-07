const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const chargeSchema = new Schema({
    userId: {type: Schema.Types.ObjectId, ref: 'User'},
    month: { type: String}, // Format: YYYY-MM
    amount: { type: Number, required: true },
    title: { type: String, required: true },
    created: { type: Number, required: true }, // Timestamp
    dueDate: { type: Number, required: true }, // Due date as timestamp
    status: { type: String, required: true , default:'pending',emun:['pending', 'paid', 'unpaid']}, // 'pending', 'paid', 'unpaid'
});

const Charge = mongoose.model('Charge', chargeSchema);
module.exports = Charge;

