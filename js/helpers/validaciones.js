const User=require('../database/models/user.js')
const { validationResult,body,param, header } = require('express-validator');
var jwt = require('jsonwebtoken');
const { jsonAnswer } = require('./apiFormat.js');
require('dotenv').config()
const mongoose = require('mongoose');

const  checkID=(v)=>{
    if(checkMongooId(v)){return true}else{throw new Error('El parámetro ID de instancia no es válido');}
}

const checkMongooId=(instanciaId)=>{
    return mongoose.Types.ObjectId.isValid(instanciaId);
}

const checkValidation=async(req,res,next)=>{
    const error=validationResult(req)
    if(error.errors.length>0){return res.status(200).json(await jsonAnswer(400,"Body params issues","An error has occurred with the parameters received, please check and try again",{errors:error.errors}));}
    next()
}

const JWTValidation=async(tokenBase,{req})=>{
    try {
        const token=tokenBase.split(" ")[1];
        const rta=jwt.verify(token, process.env.SEED);
        if(!rta.uid){throw new Error("You must to enter a Session token.");}
        const usuario_jwt=await User.findById(rta.uid);
        if(usuario_jwt){
            req.body.user_jwt=usuario_jwt;
            req.body.data_jwt=rta;
        }else{
            throw new Error("Non-existent user"); 
        }
    } catch (error) {
        throw new Error("Invalid token: "+error.message);        
    }
}

const checkValidationEmail=async(req,res,next)=>{
    const error=validationResult(req)
    if(error.errors.length>0){
        req.body.errors=error.errors
    }
    next()
}

const JWTValidationEmail=async(tokenBase,{req})=>{
    try {
        const token=tokenBase;
        const rta=jwt.verify(token, process.env.SEED);
        let usuario_jwt;
        if(!rta.uid){throw new Error("You must to enter a Session token.");}
        if(rta.email){
            usuario_jwt=await User.findOne({id:rta.uid,correo:rta.email});
        }
        if(usuario_jwt){
            req.body.user_jwt=usuario_jwt;
            req.body.data_jwt=rta;
        }else{
            throw new Error("Non-existent user, or Api token invalid."); 
        }
    } catch (error) {
        throw new Error("Invalid token: "+error.message);        
    }
}

const validateRemoteJid = (value) => {
                // Regular expression to match WhatsApp remoteJid
                const userRegex = /^[0-9]+@s\.whatsapp\.net$/;
                const groupRegex = /^[0-9-]+@g\.us$/;
                
                if (!userRegex.test(value) && !groupRegex.test(value)) {
                    throw new Error('Invalid remoteJid format.');
                }
                return true;
}



const APIJWTValidation=async(tokenBase,{req})=>{
    try {
        const token=tokenBase.split(" ")[1];
        const rta=jwt.verify(token, process.env.SEED);
        let usuario_jwt;
        if(rta.apiPass){
            usuario_jwt=await User.findOne({apiPass:{$elemMatch:{password:rta.apiPass,status:"active"}}});
        }
        if(rta.uid){
            usuario_jwt=await User.findById(rta.uid);
        }
        if(usuario_jwt){
            req.body.user_jwt=usuario_jwt;
            req.body.data_jwt=rta;
        }else{
            throw new Error("Non-existent user, or Api token invalid."); 
        }
    } catch (error) {
        throw new Error("Invalid token: "+error.message);        
    }
}

const checkUserCreate=[
    body('name','You must enter a name').not().isEmpty(),
    body('email','You must enter an email').not().isEmpty(),
    checkValidation
];

const checkUserUpdatePassword=[
    header('authorization').notEmpty().custom(JWTValidation),
    body('newPassword','You must to enter a new Password with size 6').not().isEmpty().isLength({min:6}),
    checkValidation
];

const checkUserUpdate=[
    body('name','You must enter a name').if(body('nombre').notEmpty()).isLength({min:4}),
    body('email','You must enter a valid email').if(body('correo').notEmpty()).isEmail(),
    body('state','You must enter a valid new state').if(body('estado').notEmpty()).isBoolean(),
    body('plan','You must enter a valid plan').if(body('plan').notEmpty()).isNumeric(),
    body('password','You must enter a valid password (at least 6 characters)').if(body('clave').notEmpty()).isLength({min:6}),
    header('authorization').notEmpty().custom(JWTValidation),
    body('uid','You must enter a valid user Id').isMongoId(),
    checkValidation
];

const checkUserLogin=[
    body('correo','You must enter an email').isEmail(),
    body('clave','You must enter a valid password (at least 6 characters)').isLength({min:6}),
    checkValidation,
];

const checkUserJWT=[
    header('authorization').notEmpty().custom(JWTValidation),
    checkValidation
]

const checkUserJWTEmail=[
    param('token','You must enter a valid token').custom(JWTValidationEmail),
    checkValidationEmail
]

const checkInstanceCreate=[
    body('name','You must enter a name').notEmpty(),
    //body('webhook','webhook must to be an URL').if(body('webhook').notEmpty()).isURL({protocols: ['http', 'https'],require_tld: false,require_protocol: true}),
    header('authorization').notEmpty().custom(APIJWTValidation),
    checkValidation
]

const checkInstanceID=[
    body('instanceId','You must enter a valid instance ID').custom(checkID),
    header('authorization').notEmpty().custom(APIJWTValidation),
    checkValidation
];

const checkInstanceEdit=[
    body('instanceId','You must enter a valid instance ID').custom(checkID),
    body('webhook','webhook must to be an URL').if(body('webhook').notEmpty()).isURL({protocols: ['http', 'https'],require_tld: false,require_protocol: true}),
    header('authorization').notEmpty().custom(APIJWTValidation),
    checkValidation
]

const checkInstanceGet=[
    body('instanceId','You must enter a valid instance ID').if(body('instanceId').notEmpty()).custom(checkID),
    header('authorization').notEmpty().custom(APIJWTValidation),
    checkValidation
];

const checkInstanceChat=[
    body('instanceId','You must enter a valid instance ID').custom(checkID),
    body('remoteJid','You must enter a valid remoteJid').custom(validateRemoteJid),
    header('authorization').notEmpty().custom(APIJWTValidation),
    checkValidation
];

const checkInstanceMessage=[
    body('instanceId','You must enter a valid instance ID').custom(checkID),
    body('messageId','You must enter a valid messageId').notEmpty(),
    header('authorization').notEmpty().custom(APIJWTValidation),
    checkValidation
];

const checkInstanceSendMessage=[
    body('instanceId','You must enter a valid instance ID').custom(checkID),
    body('remoteJid','You must enter a valid remoteJid').custom(validateRemoteJid),
    body('message','You must enter a message').notEmpty(),
    header('authorization').notEmpty().custom(APIJWTValidation),
    checkValidation
];

const checkInstanceSendMedia=[
    body('instanceId','You must enter a valid instance ID').custom(checkID),
    body('remoteJid','You must enter a valid remoteJid').custom(validateRemoteJid),
    body('fileUrl','Your fileUrl must be an URL').if(body('fileUrl').notEmpty()).isURL({protocols: ['http', 'https'],require_tld: false,require_protocol: true}),
    body('type',`You must enter a type('image','video','audio','document')`).isIn(['image','video','audio','document']),
    header('authorization').notEmpty().custom(APIJWTValidation),
    checkValidation
];


const checkPaymentChargeCustomer=[
    header('authorization').notEmpty().custom(JWTValidation),
    body('amount','You must enter a message').isNumeric(),
    body('paymentMethodId','You must enter a payment Method Id').notEmpty(),
    body('chargeIds').isArray({ min: 1 }).withMessage('chargeIds must to be an Array'),
    body('chargeIds.*').isMongoId().withMessage('Each item of chargeIds must to be a Mongo Id.'),
    checkValidation
]

module.exports={
    checkUserCreate,
    checkUserLogin,
    checkUserUpdate,
    checkUserJWT,
    checkUserJWTEmail,
    checkInstanceCreate,
    checkInstanceID,
    checkInstanceEdit,
    checkInstanceGet,
    checkInstanceChat,
    checkInstanceMessage,
    checkInstanceSendMedia,
    checkInstanceSendMessage,
    checkUserUpdatePassword,
    checkPaymentChargeCustomer
}