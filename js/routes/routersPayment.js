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



module.exports=paymentRouter