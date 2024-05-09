const User=require('../database/models/user.js')
const { validationResult,body,param } = require('express-validator');
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

const  checkRemoteJID=(v)=>{
    if(validarJID(v)){return true}else{throw new Error('remoteJid is invalid');}
}

function validarJID(jid) {
    // Expresión regular para verificar el formato de un JID
    const jidRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return jidRegex.test(jid);
}

const checkValidation=async(req,res,next)=>{
    const error=validationResult(req)
    if(error.errors.length>0){return res.status(200).json(await jsonAnswer(400,"Body params issues","It has happend and issue with the body params",{errors:error.errors}));}
    next()
}

const JWTValidation=async(token,{req})=>{
    //verify genera error solo si no hay resultado
    try {
        const rta=jwt.verify(token, process.env.SEED);
        const usuario_jwt=await User.findById(rta.uid);
        if(usuario_jwt){
            req.body.user_jwt=usuario_jwt;
            req.body.data_jwt=rta;
        }else{
            throw new Error(); 
        }
    } catch (error) {
        throw new Error();        
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
    body('token','El token no es válido').custom(JWTValidation),
    body('uid','El id no tiene formato adecuado.').isMongoId(),
    checkValidation
];

const checkUserLogin=[
    body('correo','No ingresó correo').isEmail(),
    body('clave','La clave debe tener al menos 6 caracteres').isLength({min:6}),
    checkValidation,
];

const checkUserJWT=[
    body('token','El token no es válido').custom(JWTValidation),
    checkValidation
]

const checkUserJWTParam=[
    param('token','El token no es válido').custom(JWTValidation),
    checkValidation
]

const checkInstanceCreate=[
    body('name','You must enter a name').notEmpty(),
    body('webhook','webhook must to be an URL').if(body('webhook').notEmpty()).isURL(),
    body('token','El token no es válido').custom(JWTValidation),
    checkValidation
]

const checkInstanceID=[
    body('instanceId','You must to enter a valid ID').custom(checkID),
    body('token','El token no es válido').custom(JWTValidation),
    checkValidation
];

const checkInstanceEdit=[
    body('instanceId','You must to enter a valid ID').custom(checkID),
    body('webhook','webhook must to be an URL').if(body('webhook').notEmpty()).isURL(),
    body('token','El token no es válido').custom(JWTValidation),
    checkValidation
]

const checkInstanceGet=[
    body('instanceId','You must to enter a valid ID').if(body('instanceId').notEmpty()).custom(checkID),
    body('token','El token no es válido').custom(JWTValidation),
    checkValidation
];

const checkInstanceChat=[
    body('instanceId','You must to enter a valid ID').custom(checkID),
    body('remoteJid','You must to enter a valid ID').custom(checkRemoteJID),
    body('token','El token no es válido').custom(JWTValidation),
    checkValidation
];

const checkInstanceMessage=[
    body('instanceId','You must to enter a valid ID').custom(checkID),
    body('remoteJid','You must to enter a valid ID').custom(checkRemoteJID),
    body('messageId','You must enter a messageId').notEmpty(),
    body('token','El token no es válido').custom(JWTValidation),
    checkValidation
];

const checkInstanceSendMessage=[
    body('instanceId','You must to enter a valid ID').custom(checkID),
    body('remoteJid','You must to enter a valid ID').custom(checkRemoteJID),
    body('message','You must enter a message').notEmpty(),
    body('token','El token no es válido').custom(JWTValidation),
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
    checkInstanceSendMessage
}