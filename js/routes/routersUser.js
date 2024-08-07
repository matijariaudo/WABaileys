const {Router}=require('express');
const UserRouter=Router()
require('dotenv').config()

const session=require('express-session');

const { passport, receiptTokens, loginTokensPassport } = require('../helpers/passport');
const { userCreate, userLogin, userUpdate, loginJWT, loginJWTCheckemail, sendMailValidation, createApiToken, getApiToken, editApiToken, userSetPassword, sendMailPassword } = require('../controllers/userPost');
const { checkUserCreate, checkUserLogin, checkUserUpdate, checkUserJWT, checkUserJWTEmail, checkUserUpdatePassword } = require('../helpers/validaciones');
require('dotenv').config()

//Users administration
UserRouter.post('/users',checkUserCreate,userCreate);
UserRouter.post('/users/login',checkUserLogin,userLogin);
UserRouter.post('/users/apitoken',checkUserJWT,createApiToken);
UserRouter.post('/users/getapitoken',checkUserJWT,getApiToken);
UserRouter.post('/users/editapitoken',checkUserJWT,editApiToken);
UserRouter.post('/users/check',checkUserJWT,loginJWT);
UserRouter.post('/users/setpassword',checkUserUpdatePassword,userSetPassword);
UserRouter.post('/users/sendvalidation',checkUserJWT,sendMailValidation);
UserRouter.post('/users/sendpassword',sendMailPassword);
UserRouter.post('/users/edit',checkUserUpdate,userUpdate);
UserRouter.get( '/users/validar/:token',checkUserJWTEmail,loginJWTCheckemail);


UserRouter.use(session({secret: process.env.SESSION_SEED,resave: false,saveUninitialized: false}))
UserRouter.get('/logingoogle',passport.authenticate("google"));
UserRouter.get('/loginfacebook',passport.authenticate("facebook",{scope:["email"]}));
UserRouter.get('/auth/:medio/redirect', receiptTokens,loginTokensPassport);


module.exports=UserRouter