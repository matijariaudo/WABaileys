const {Router}=require('express');
const { checkUserJWT, checkPaymentChargeCustomer } = require('../helpers/validaciones');
const createCharge = require('../helpers/createCharge.js');
const { addCard, changeDefaultCard, deleteCard, getCards, chargeCustomer, pendingCharges, getPayments } = require('../controllers/paymentPost.js');


const paymentRouter=Router()

paymentRouter.post('/addcard',checkUserJWT,addCard);
paymentRouter.post('/changedefault',checkUserJWT, changeDefaultCard);
paymentRouter.post('/deletecard',checkUserJWT, deleteCard);
paymentRouter.post('/getcard',checkUserJWT, getCards);
paymentRouter.post('/chargecustomer',checkPaymentChargeCustomer,chargeCustomer );
paymentRouter.post('/pendingcharges',checkUserJWT, pendingCharges);
paymentRouter.post('/userpayments',checkUserJWT , getPayments);

//createCharge('668515765a899765fcc00e46',2500,'2024-07',1719879720,'Mensual invoice 4')

module.exports=paymentRouter