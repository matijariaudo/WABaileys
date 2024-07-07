const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const paymentSchema = new Schema({
    paymentIntentId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    status: { type: String, required: true }, // 'succeeded', 'failed', etc.
    paymentMethodId: { type: String, required: true },
    customerId: { type: String, required: true },
    created: { type: Number, required: true },
    userId: {type: Schema.Types.ObjectId, ref: 'User'},
    chargeIds: [{ type: Schema.Types.ObjectId, ref: 'Charge' }], // References to Charge
    description: { type: String, default: null },
    receiptEmail: { type: String, default: null }
});

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;
