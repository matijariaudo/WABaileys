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

const JWTValidationEmail=async(tokenBase,{req})=>{
    try {
        const token=tokenBase;
        const rta=jwt.verify(token, process.env.SEED);
        let usuario_jwt;
        if(rta.uid){
            usuario_jwt=await User.findOne({id:rta.uid,correo:rta.email});
            console.log(usuario_jwt)
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
    body('name','No ingresó nombre').not().isEmpty(),
    body('email','No ingresó correo').not().isEmpty(),
    body('password','La clave debe tener al menos 6 caracteres').isLength({min:6}),
    checkValidation
];
const checkUserUpdate=[
    body('name','No ingresó nombre').if(body('nombre').notEmpty()).isLength({min:4}),
    body('email','El formato del correo es inválido').if(body('correo').notEmpty()).isEmail(),
    body('state','El formato del estado es inválido').if(body('estado').notEmpty()).isBoolean(),
    body('password','El formato de la clave es incorrecto').if(body('clave').notEmpty()).isLength({min:6}),
    header('authorization').notEmpty().custom(JWTValidation),
    body('uid','El id no tiene formato adecuado.').isMongoId(),
    checkValidation
];

const checkUserLogin=[
    body('correo','No ingresó correo').isEmail(),
    body('clave','La clave debe tener al menos 6 caracteres').isLength({min:6}),
    checkValidation,
];

const checkUserJWT=[
    header('authorization').notEmpty().custom(JWTValidation),
    checkValidation
]

const checkUserJWTParam=[
    param('token','El token no es válido').custom(JWTValidationEmail),
    checkValidation
]

const checkInstanceCreate=[
    body('name','You must enter a name').notEmpty(),
    //body('webhook','webhook must to be an URL').if(body('webhook').notEmpty()).isURL({protocols: ['http', 'https'],require_tld: false,require_protocol: true}),
    header('authorization').notEmpty().custom(APIJWTValidation),
    checkValidation
]

const checkInstanceID=[
    body('instanceId','You must to enter a valid ID').custom(checkID),
    header('authorization').notEmpty().custom(APIJWTValidation),
    checkValidation
];

const checkInstanceEdit=[
    body('instanceId','You must to enter a valid ID').custom(checkID),
    body('webhook','webhook must to be an URL').if(body('webhook').notEmpty()).isURL({protocols: ['http', 'https'],require_tld: false,require_protocol: true}),
    header('authorization').notEmpty().custom(APIJWTValidation),
    checkValidation
]

const checkInstanceGet=[
    body('instanceId','You must to enter a valid ID').if(body('instanceId').notEmpty()).custom(checkID),
    header('authorization').notEmpty().custom(APIJWTValidation),
    checkValidation
];

const checkInstanceChat=[
    body('instanceId','You must to enter a valid ID').custom(checkID),
    body('remoteJid','You must to enter a valid ID').custom(validateRemoteJid),
    header('authorization').notEmpty().custom(APIJWTValidation),
    checkValidation
];

const checkInstanceMessage=[
    body('instanceId','You must to enter a valid ID').custom(checkID),
    body('remoteJid','You must to enter a valid ID').custom(validateRemoteJid),
    body('messageId','You must enter a messageId').notEmpty(),
    header('authorization').notEmpty().custom(APIJWTValidation),
    checkValidation
];

const checkInstanceSendMessage=[
    body('instanceId','You must to enter a valid ID').custom(checkID),
    body('remoteJid','You must to enter a valid ID').custom(validateRemoteJid),
    body('message','You must enter a message').notEmpty(),
    header('authorization').notEmpty().custom(APIJWTValidation),
    checkValidation
];

const checkInstanceSendMedia=[
    body('instanceId','You must to enter a valid ID').custom(checkID),
    body('remoteJid','You must to enter a valid ID').custom(validateRemoteJid),
    //body('fileUrl','You must enter a url').isURL(),
    body('type',`You must enter a type('image','video','audio','document')`).isIn(['image','video','audio','document']),
    header('authorization').notEmpty().custom(APIJWTValidation),
    checkValidation
];

module.exports={
    checkUserCreate,
    checkUserLogin,
    checkUserUpdate,
    checkUserJWT,
    checkUserJWTParam,
    checkInstanceCreate,
    checkInstanceID,
    checkInstanceEdit,
    checkInstanceGet,
    checkInstanceChat,
    checkInstanceMessage,
    checkInstanceSendMedia,
    checkInstanceSendMessage
}