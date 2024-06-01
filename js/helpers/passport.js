require('dotenv').config();
const passport=require('passport');
const passportGoogle=require('passport-google-oauth20') 
const passportFacebook=require('passport-facebook')
const { User } = require('../database/models');
var jwt = require('jsonwebtoken');
const { sendEmail } = require('./sendEmail');

const GOOGLE_ID=process.env.GOOGLE_ID||"";
const GOOGLE_SECRET=process.env.GOOGLE_SECRET||"";
const FACE_ID=process.env.FACE_ID||"";
const FACE_SECRET=process.env.FACE_SECRET||"";
const GoogleStrategy = passportGoogle.Strategy;
const FacebookStrategy = passportFacebook.Strategy;

function baseProcess(medio){
    return function (accessToken, refreshToken, profile, done){
        let data={};
        data.name=profile._json.name;
        data.email=profile._json.email;
        data.medio=medio
        data.id=profile._json.id||profile._json.sub;
        done(null,data)
    }
}

const GoogleInstance=new GoogleStrategy(
    {
      clientID: GOOGLE_ID,
      clientSecret: GOOGLE_SECRET,
      callbackURL: "/login/auth/google/redirect",
      scope: [ 'profile','email' ]
    },
    baseProcess("google")
)

const FacebookInstance=  new FacebookStrategy(
    {
        clientID: FACE_ID,
        clientSecret: FACE_SECRET,
        callbackURL: "/login/auth/facebook/redirect",
        profileFields: ['id', 'displayName', 'photos', 'email']
    },
    baseProcess("facebook")
  )


passport.serializeUser((user, done) => {done(null, user);});
passport.deserializeUser((user, done) => {done(null, user);});
passport.use(FacebookInstance);
passport.use(GoogleInstance);

const receiptTokens=(req, res, next) => {
    const medio = req.params.medio;
    const medios = ["facebook","google"];
    if(medios.indexOf(medio)<0){return res.send("No encontrado")}
    passport.authenticate(medio, {failureRedirect: '/login-failed' })(req, res, next);

}

const loginTokensPassport=async(req, res) => {
    const {name,email,id,medio} = req.user;
    let user;
    user=await User.findOne({correo:email,status:"active"});
    if(!user){
        user=await new User({nombre:name,correo:email,clave:"--",rol:"USER_ROLE",google:true,email_valid:true});
        console.log("ENVIAR CORREO A : ",email)
        sendEmail({email,subject:"Welcome to WSPPlus :)",typeNro:1})
        await user.save();
    }
    const token=jwt.sign({ uid: user.id }, process.env.SEED,{expiresIn:'12h'})
    return res.redirect(`../../../app.html?name=${name}&email=${email}&id=${user.id}&medio=${medio}&token=${token}`);
};
module.exports={passport,receiptTokens,loginTokensPassport}