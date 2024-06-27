
const bcryptjs=require('bcrypt')
var jwt = require('jsonwebtoken');
const { User } = require('../database/models');
const { jsonAnswer } = require('../helpers/apiFormat');
const { sendEmail } = require('../helpers/sendEmail');
const { link } = require('../routes/routers');
require('dotenv').config()

const userCreate=async(req,res)=>{
    const {name,email,password,plan=0}=req.body;
    try {
        const user=await User.findOne({correo:email});
        console.log(user,email)
        if(user){return res.status(200).json(await jsonAnswer(400,"The operation has failed","The email is already used.",null));}
        const salt=await bcryptjs.genSalt(10);
        const claveEncrypt=await bcryptjs.hash(password,salt);
        const newuser=new User({nombre:name,correo:email,clave:claveEncrypt,rol:"USER_ROLE",plan});
        await newuser.save()
        const tokenE=jwt.sign({ uid: newuser.id,email:newuser.correo}, process.env.SEED,{expiresIn:'12h'})
        sendEmail({email:newuser.correo,subject:"Verify your email",typeNro:2,button:{frase:"Verify email",link:`http://${req.headers.host}/login/users/validar/${tokenE}`}})
        return res.status(200).json(await jsonAnswer(200,null,`The user has been created`,{user:newuser}));
    } catch (error) {
        return res.status(200).json(await jsonAnswer(400,"The operation has failed","Your chat has not correctly found.",null));
    }
}

const userSetPassword=async(req,res)=>{
    const {password,newPassword}=req.body;
    const {id}=req.body.user_jwt;
    console.log("IDDDDDDDDD",id,password)
    try {
        const user=await User.findById(id)
        if(!user){return res.status(200).json(await jsonAnswer(400,"The operation has failed","The user could not be found.",null));}
        let rta=true;
        if(user.clave!="-"){
            rta=await bcryptjs.compare(password || '',user.clave);

        }
        console.log("RTA",rta,user.clave)
        if(rta){
        const salt=await bcryptjs.genSalt(10);
        const claveEncrypt=await bcryptjs.hash(newPassword,salt);
        user.clave=claveEncrypt;
        user.save()
        return res.status(200).json(await jsonAnswer(200,null,`The password has been modified`,{user:user}));
        }else{
            let msg;
            password?msg="Your current password is not correct":msg="We cannot set your password because one has already been set before. If you want to change it, click 'Forgot my password' to reset a new one from your email.";
            return res.status(200).json(await jsonAnswer(400,"The operation has failed",msg,null));
        }
    } catch (error) {
        return res.status(200).json(await jsonAnswer(400,"The operation has failed","Your chat has not correctly found.",error.message));
    }
}

const userUpdate=async(req,res)=>{
    const {name,email,clave,estado,uid,plan}=req.body;
    const user_jwt=req.body.user_jwt;
    if(user_jwt.id!=uid && user_jwt.rol!='ADMIN_ROLE'){return res.status(200).json(await jsonAnswer(400,"The operation has failed","Your account is not allowed to do this action.",null));}
    
    const user=await User.findById(uid)
    if(!user){return res.status(200).json(await jsonAnswer(400,"The operation has failed","The user could not be found.",null));}
    
    const userCorreo=await User.findOne({correo:email,estado:true,});
    if(userCorreo && userCorreo?.id!=uid){return res.status(200).json(await jsonAnswer(400,"The operation has failed","The email is already used.",null));}
    
    if(name){user.nombre=name;}
    if(email){user.correo=email;}
    if(estado){user.estado=estado;}
    if(plan){user.plan=plan;}
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
    console.log(`Verify email http://${req.headers.host}/login/users/validar/${token}`)
    sendEmail({email:user.correo,subject:"Verify your email",typeNro:2,button:{frase:"Verify email",link:`http://${req.headers.host}/login/users/validar/${token}`}})
    return res.status(200).json(await jsonAnswer(200,null,`We have sent an email to validate your direction`,{user,token}));
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
        return res.redirect(`../../../app.html?accion=EMAIL_VALID&token=${token}`);
    }
    return res.redirect(`../../../app.html?accion=EMAIL_VALID&token=ERROR`);   
}

const createApiToken=async(req,res)=>{
    try {
        const {name,user_jwt}=req.body;
        const user=await User.findById(user_jwt.id);
        if(!user){return res.status(200).json(await jsonAnswer(400,"The operation has failed","The user could not be found.",null));}
        user.apiPass.push({name});
        user.save();
        const newPassword = user.apiPass[user.apiPass.length - 1].password;
        const token=jwt.sign({ apiPass:newPassword}, process.env.SEED)
        return res.status(200).json(await jsonAnswer(200,null,`Created successfuly:We have created your API token.`,{token}));
    } catch (error) {
        return res.status(200).json(await jsonAnswer(400,"The operation has failed","-",null));
    }
}

const editApiToken=async(req,res)=>{
    try {
        const {status,tokenId,user_jwt}=req.body;
        console.log(req.body)
        const user=await User.findById(user_jwt.id);
        if(!user){return res.status(200).json(await jsonAnswer(400,"The operation has failed","The user could not be found.",null));}
        const reg=user.apiPass.find(a=>a.id==tokenId);
        console.log(reg)
        reg.status=status;
        user.save();
        console.log(user)
        return res.status(200).json(await jsonAnswer(200,null,`Modified successfuly: We have modified your API token.`));
    } catch (error) {
        return res.status(200).json(await jsonAnswer(400,"The operation has failed","-",null));
    }
}

const getApiToken=async(req,res)=>{
    try {
        const {user_jwt}=req.body;
        const user=await User.findById(user_jwt.id);
        if(!user){return res.status(200).json(await jsonAnswer(400,"The operation has failed","The user could not be found.",null));}
        const apiPass=user.apiPass.map( a=> {return {name:a.name,status:a.status,id:a.id}}).filter(a=>a.status=='active' || a.status=='paused')
        return res.status(200).json(await jsonAnswer(200,null,`Successful Operation: We have found your API tokens.`,{tokens:apiPass}));
    } catch (error) {
        return res.status(200).json(await jsonAnswer(400,"The operation has failed","-",null));
    }
}

module.exports={userCreate,userLogin,userUpdate,loginJWT,loginJWTCheckemail,sendMailValidation,createApiToken,getApiToken,editApiToken,userSetPassword}