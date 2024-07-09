const { User, Charge, Payment } = require('../database/models/index.js');
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE);



const addCard=async(req,res)=>{
    const {paymentMethodId} =req.body;
    const {id:userId}=req.body.user_jwt;
    const priceId="price_1PWH8VLW177YQySEAf1E7vTZ";
    try {
        const user=await User.findById(userId);
        if(!user){ throw new Error('No user founded')}
        let {correo:email,payment_customer,payment_subscription}=user;
        if(!payment_customer || payment_customer==""){
            const customers = await stripe.customers.list({
                email
            });
            if (customers?.data?.length > 0) {
                payment_customer=customers.data[0].id;
            }
            else
            {
                const customer = await stripe.customers.create({
                    email: email,
                    payment_method: paymentMethodId,
                    invoice_settings: {default_payment_method: paymentMethodId}
                });
                payment_customer=customer.id;
            } 
            user.payment_customer=payment_customer;
        }
        if(payment_subscription==""){
            const subscriptions = await stripe.subscriptions.list({
                customer: payment_customer,
                status: 'active', // puedes filtrar por 'active', 'past_due', 'canceled', etc.
            });
            if (subscriptions?.data?.length > 0) {
                payment_subscription=subscriptions.data[0].id;
            }else{
                const subscription = await stripe.subscriptions.create({
                    customer: payment_customer,
                    items: [{ price: priceId }],
                    expand: ['latest_invoice.payment_intent'],
                });
                payment_subscription=subscription.id;
            }
            user.payment_subscription=payment_subscription;
        }
        user.save();
        await stripe.paymentMethods.attach(paymentMethodId, {
            customer: payment_customer,
        });
        await stripe.customers.update(payment_customer, {
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });
        res.send({success:true});
    }catch(error){
        res.send({success:error.message});
    }
}

const changeDefaultCard=async (req, res) => {
    try {
        const {paymentMethodId } = req.body;
        const {id:userId}=req.body.user_jwt;
        const user=await User.findById(userId);
        if(!user){ throw new Error('No user founded')}
        
        // Actualiza la tarjeta de pago predeterminada del cliente
        await stripe.customers.update(user.payment_customer, {
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });
        res.send({ success: true });
    } catch (error) {
        res.status(400).send({ error: { message: error.message } });
    }
}

const deleteCard=async (req, res) => {
    try {
        const {paymentMethodId} =req.body;
        const {id:userId}=req.body.user_jwt;
        // Desasocia el método de pago del cliente
        await stripe.paymentMethods.detach(paymentMethodId);
        res.send({ success: true });
    } catch (error) {
        res.status(400).send({ error: { message: error.message } });
    }
}

const getCards=async(req, res) => {
    const {id:userId}=req.body.user_jwt;
    try {
        const user=await User.findById(userId);
        if(!user){ throw new Error('No user')}
        let {payment_customer}=user;
        let paymentMethodsSend=[];
        if(payment_customer || payment_customer!=""){
            const paymentMethods = await stripe.paymentMethods.list({
                customer: payment_customer,
                type: 'card',
            });
            const customer = await stripe.customers.retrieve(payment_customer);
            const defaultPaymentMethodId = customer.invoice_settings.default_payment_method;
            const {data:dataPay}=paymentMethods;
            paymentMethodsSend=dataPay.map(a=>{return {card:a?.card,id:a.id,isDefault: a.id === defaultPaymentMethodId}})
        }
        return res.send({paymentMethods:paymentMethodsSend});
        
    } catch (error) {
        return res.status(200).json({error:error.message})
    }
}

const chargeCustomer=async (req, res) => {
    const {paymentMethodId, amount ,chargeIds } = req.body;
    const {id:userId}=req.body.user_jwt;
    try {
        const user=await User.findById(userId);
        if(!user){ throw new Error('No user')}
        const {payment_customer:customerId}=user;
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount, // cantidad en la menor unidad de la moneda, ej. para $10.00 USD usa 1000
            currency: 'usd', // o la moneda que estés utilizando
            customer: customerId,
            payment_method: paymentMethodId,
            off_session: true, // para intentos de pago fuera de sesión
            confirm: true,
        });
        if (paymentIntent.status === 'succeeded') {
            const newPayment = new Payment({
                paymentIntentId: paymentIntent.id,
                amount: paymentIntent.amount,
                status: paymentIntent.status,
                paymentMethodId: paymentIntent.payment_method,
                customerId: paymentIntent.customer,
                userId:userId,
                created: paymentIntent.created,
                chargeIds: chargeIds,
                description: paymentIntent.description,
                receiptEmail: paymentIntent.receipt_email
            });

            await newPayment.save();

            // Update status of associated charges
            await Charge.updateMany(
                { _id: { $in: chargeIds } },
                { status: 'paid' }
            );

            return res.status(200).json({ success: true, paymentIntent: newPayment });
        } else {
            return res.status(400).json({ success: false, message: 'Payment failed' });
        }
    } catch (error) {
        res.status(400).send({ error: { message: error.message } });
    }
}

const pendingCharges=async (req, res) => {
    const {id:userId}=req.body.user_jwt;
    try {
        const user=await User.findById(userId);
        if(!user){ throw new Error('No user')}
        const now = Math.floor(Date.now() / 1000);
        const pendingCharges = await Charge.find({
            userId: userId,
            status: 'pending',
            dueDate: { $lt: now }
        });
        const totalamount=pendingCharges.reduce((total, obj) => total + obj.amount, 0);
        return res.status(200).json({ success: true, charges: pendingCharges ,totalamount});
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
}

const getPayments=async (req, res) => {
    const {id:userId}=req.body.user_jwt;
    try {
        // Buscar todos los pagos del usuario por su ID
        const payments = await Payment.find({userId});
        // Si encontramos pagos, los enviamos como respuesta
        if (payments) {
            res.status(200).json({ success: true, payments });
        } else {
            res.status(404).json({ success: false, message: 'No se encontraron pagos para este usuario.' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}


module.exports={addCard,changeDefaultCard,deleteCard,getCards,chargeCustomer,pendingCharges,getPayments}