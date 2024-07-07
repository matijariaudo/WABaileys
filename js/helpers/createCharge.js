const { Charge } = require("../database/models");

const createCharge = async (userId, amount, month, dueDate,title="") => {
    try {
        const charge = new Charge({
            userId,
            month: month, // Formato: YYYY-MM
            amount: amount,
            title,
            created: Math.floor(Date.now() / 1000), // Timestamp actual
            dueDate: dueDate, // Timestamp de la fecha de vencimiento
        });

        await charge.save();
        console.log('Charge created successfully:', charge);
        return charge;
    } catch (error) {
        console.error('Error creating charge:', error);
        throw error;
    }
};

module.exports = createCharge;