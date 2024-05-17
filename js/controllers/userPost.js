
const bcryptjs=require('bcrypt')
var jwt = require('jsonwebtoken');
const { User } = require('../database/models');
const { jsonAnswer } = require('../helpers/apiFormat');
const { sendEmail } = require('../helpers/sendEmail');
const { link } = require('../routes/routers');
require('dotenv').config()

const userCreate=async(req,res)=>{
    const {name,email,password}=req.body;
    try {
        const user=await User.findOne({correo:email});
        console.log(user,email)
        if(user){return res.status(200).json(await jsonAnswer(400,"The operation has failed","The email is already used.",null));}
        const salt=await bcryptjs.genSalt(10);
        const claveEncrypt=await bcryptjs.hash(password,salt);
        const newuser=new User({nombre:name,correo:email,clave:claveEncrypt,rol:"USER_ROLE"});
        await newuser.save()
        const tokenE=jwt.sign({ uid: newuser.id,email:newuser.correo}, process.env.SEED,{expiresIn:'12h'})
        sendEmail({email:newuser.correo,subject:"Verify your email",typeNro:2,button:{frase:"Verify email",link:`http://${req.headers.host}/login/users/validar/${tokenE}`}})
        return res.status(200).json(await jsonAnswer(200,null,`The user has been created`,{user:newuser}));
    } catch (error) {
        return res.status(200).json(await jsonAnswer(400,"The operation has failed","Your chat has not correctly found.",null));
    }
}

const userUpdate=async(req,res)=>{
    const {name,email,clave,estado,uid}=req.body;
    const user_jwt=req.body.user_jwt;
    if(user_jwt.id!=uid && user_jwt.rol!='ADMIN_ROLE'){return res.status(200).json(await jsonAnswer(400,"The operation has failed","Your account is not allowed to do this action.",null));}
    
    const user=await User.findById(uid)
    if(!user){return res.status(200).json(await jsonAnswer(400,"The operation has failed","The user could not be found.",null));}
    
    const userCorreo=await User.findOne({correo:email,estado:true,});
    if(userCorreo && userCorreo?.id!=uid){return res.status(200).json(await jsonAnswer(400,"The operation has failed","The email is already used.",null));}
    
    if(name){user.nombre=name;}
    if(email){user.correo=email;}
    if(estado){user.estado=estado;}
    if(clave){
        const salt=await bcryptjs.genSalt(10);
        user.clave=await bcryptjs.hash(clave,salt);
    }
    user.save()
    return res.status(200).json(await jsonAnswer(200,null,`The user has been modified`,{user}));
}

const userLogin=async(req,res)=>{
    const {correo,clave}=req.body;
    let error=false;
    const user=await User.findOne({correo});
    if(!user){error=true;}
    const rta=await bcryptjs.compare(clave,user.clave);
    if(!rta){error=true;}
    if(!error){
        const token=jwt.sign({ uid: user.id }, process.env.SEED,{expiresIn:'12h'})
        return res.status(200).json(await jsonAnswer(200,null,`Login success: The user has been correctly loged in`,{user,token}));
    }else{
        return res.status(200).json(await jsonAnswer(400,"The operation has failed","The email or password are incorrect.",null));
    }
}


const loginJWT=async(req,res)=>{
    const user=req.body.user_jwt;
    const token=jwt.sign({ uid: user.id }, process.env.SEED,{expiresIn:'12h'})
    return res.status(200).json(await jsonAnswer(200,null,`Login success: The user has been correctly loged in`,{user,token}));
}

const sendMailValidation=async(req,res)=>{
    console.log(req.headers.host)
    const user=req.body.user_jwt;
    const token=jwt.sign({ uid: user.id,email:user.correo}, process.env.SEED,{expiresIn:'12h'})
    sendEmail({email:user.correo,subject:"Verify your email",typeNro:2,button:{frase:"Verify email",link:`http://${req.headers.host}/login/users/validar/${token}`}})
    return res.status(200).json(await jsonAnswer(200,`Sending success`,`We have sent an email to validate your direction`,{user,token}));
}

const loginJWTCheckemail=async(req,res)=>{
    const user=req.body.user_jwt;
    const tokenData=req.body.data_jwt;
    console.log(tokenData)
    if(tokenData.email==user.correo){
        const checkUser=await User.findById(user.id);
        checkUser.email_valid=true;
        checkUser.save()
        const token=jwt.sign({ uid: user.id }, process.env.SEED,{expiresIn:'12h'})
        return res.redirect(`../../../base.html?accion=EMAIL_VALID&token=${token}`);
    }
    return res.redirect(`../../../base.html?accion=EMAIL_VALID&token=ERROR`);   
}

module.exports={userCreate,userLogin,userUpdate,loginJWT,loginJWTCheckemail,sendMailValidation}