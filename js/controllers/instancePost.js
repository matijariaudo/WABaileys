const Instance = require("../database/models/instance");
const { jsonAnswer } = require("../helpers/apiFormat");
const { msgFormat } = require("../helpers/msgFormat");
const { Wsp } = require("../models/wspClass");


const instanceCreate=async(req,res)=>{
    const {name,webhook}=req.body;
    try {
        const instance=new Instance({name,user:req.body.user_jwt._id,webhook});
        await instance.save()
        return res.status(200).json(await jsonAnswer(200,null,'The instance has been created.',{instance}));
    } catch (error) {
        return res.status(200).json(await jsonAnswer(200,'The instance could not be created.','It has happend a problem.',null));
    }
}

const instanceGet=async(req,res)=>{
    const {instanceId}=req.body;
    let instances;
    try {
        if(instanceId){
            instances=await Instance.find({user:req.body.user_jwt._id,status:"active",_id:instanceId}).lean();
            }else{
            instances=await Instance.find({user:req.body.user_jwt._id,status:"active"}).lean();
        }
        instances = await Promise.all(instances.map(async a => {
            const wsp=await new Wsp();
            const inst =await  wsp.getInstance(a._id);
            const dataInst= await inst?.data ; // Devolver el objeto modificado
            const rta={...a,uid:a._id,sessionStatus:dataInst};
            delete rta._id;
            delete rta.__v;
            return rta;            
        }));    
        return res.status(200).json(await jsonAnswer(200,null,"Instances data sent",{instances}))
    } catch (error) {
        return res.status(200).json(await jsonAnswer(400,"The operation has failed","-",null));
    }
    
    
}

const instanceInit=async(req,res)=>{
    const {instanceId}=req.body;
    try {
        const instance=await Instance.findOne({_id:instanceId,user:req.body.user_jwt,status:"active"});
        const wsp=await new Wsp();
        if(!instance){
            return res.status(200).json(await jsonAnswer(400,`Incorrect instance ID","We have not found an active instance with the instance ID: ${instanceId}.`,null));
        }
        const instanceStart=await wsp.createInstance(instanceId);
        return res.status(200).json(await jsonAnswer(200,null,"Your instance has been correctly started.",{instance:instanceStart.data}));
    } catch (error) {
        return res.status(200).json(await jsonAnswer(400,"The operation has failed","Your instance has not been correctly started.",null));
    }
}

const instanceDelete=async(req,res)=>{
    const {instanceId}=req.body;
    try {
        const instance=await Instance.findOne({_id:instanceId,user:req.body.user_jwt,status:"active"});
        if(!instance){
            return res.status(200).json(await jsonAnswer(200,`Incorrect instance ID","We have not found an active instance with the instance ID: ${instanceId}.`,null));
        }const wsp=new Wsp();
        const instanceStart=await wsp.getInstance(instanceId);
        if(instanceStart){await wsp.deleteIntance(instanceId);}
        instance.status='delete';
        instance.save();
        return res.status(200).json(await jsonAnswer(200,null,"Your instance has been correctly deleted.",{instance}));
    } catch (error) {
        return res.status(200).json(await jsonAnswer(400,"The operation has failed","Your instance has not been correctly deleted.",null));
    }
}

const instanceContacts=async(req,res)=>{
    const {instanceId}=req.body;
    const instance=await Instance.findOne({_id:instanceId,user:req.body.user_jwt,status:"active"});
    try {
        if(!instance){
            return res.status(200).json(await jsonAnswer(400,`Incorrect instance ID","We have not found an active instance with the instance ID: ${instanceId}.`,null));
        }
        const wsp=await new Wsp();
        const instanceStart=await wsp.getInstance(instanceId);
        const contacts=await instanceStart.getContacts();
        return res.status(200).json(await jsonAnswer(200,null,"Contact data sent.",{contacts}));
    } catch (error) {
        return res.status(200).json(await jsonAnswer(400,"The operation has failed","Your instance contact has not correctly found.",null));
    }
    
}

const instanceChat=async(req,res)=>{
    const {instanceId,remoteJid,qty}=req.body;
    try {
        const instance=await Instance.findOne({_id:instanceId,user:req.body.user_jwt,status:"active"});
        if(!instance){
            return res.status(200).json(await jsonAnswer(400,`Incorrect instance ID","We have not found an active instance with the instance ID: ${instanceId}.`,null));
        }
        const wsp=await new Wsp();
        const instanceStart=await wsp.getInstance(instanceId);
        let chats = await instanceStart.getChat(remoteJid,qty);
        chats = chats.map(a => {
            return msgFormat(a)
        });
        chats=chats.filter(a=>a!=null);
        return res.status(200).json(await jsonAnswer(200,null,"Chat messages data sent.",{chats}));
    } catch (error) {
        return res.status(200).json(await jsonAnswer(400,"The operation has failed","Your chat has not correctly found.",null));
    }
    
}

const instanceMessage=async(req,res)=>{
    const {instanceId,remoteJid,messageId}=req.body;
    try {
        const instance=await Instance.findOne({_id:instanceId,user:req.body.user_jwt,status:"active"});
        if(!instance){
            return res.status(200).json(await jsonAnswer(400,`Incorrect instance ID","We have not found an active instance with the instance ID: ${instanceId}.`,null));
        }
        const wsp=await new Wsp();
        const instanceStart=await wsp.getInstance(instanceId);
        let chats = await instanceStart.getMessage(remoteJid,messageId)
        return res.status(200).json(await jsonAnswer(200,null,"Message data sent.",{chats}));
    } catch (error) {
        return res.status(200).json(await jsonAnswer(400,"The operation has failed","Your chat has not correctly found.",null));
    }
}

const instanceMedia=async(req,res)=>{
    const {instanceId,remoteJid,messageId}=req.body;
    try {
        const instance=await Instance.findOne({_id:instanceId,user:req.body.user_jwt,status:"active"});
        if(!instance){
            return res.status(200).json(await jsonAnswer(400,`Incorrect instance ID","We have not found an active instance with the instance ID: ${instanceId}.`,null));
        }
        const wsp=await new Wsp();
        const instanceStart=await wsp.getInstance(instanceId);
        const {data,mimetype} = await instanceStart.getMedia(remoteJid,messageId);
        if(!data){
            return res.status(200).json(await jsonAnswer(400,`We could not find you media file.`,null));
        }
        res.setHeader('Content-Type', mimetype);
        res.send(data);
    } catch (error) {
        return res.status(200).json(await jsonAnswer(400,"The operation has failed","Your chat has not correctly found.",{error:error.message}));
    }
    
}


const instanceEdit=async(req,res)=>{
    const {instanceId,name,webhook}=req.body;
    try {
        const instance=await Instance.findOne({_id:instanceId,user:req.body.user_jwt,status:"active"});;
        if(!instance){
            return res.status(200).json(await jsonAnswer(400,`Incorrect instance ID","We have not found an active instance with the instance ID: ${instanceId}.`,null));
        }
        if(name){instance.name=name;}
        if(webhook){instance.webhook=webhook;}
        instance.save();
        return res.status(200).json(await jsonAnswer(200,null,"Instance has been modified.",{instance}));
    } catch (error) {
        return res.status(200).json(await jsonAnswer(400,"The operation has failed","Your chat has not correctly found.",null));
    }
    
}

const instanceSendText=async(req,res)=>{
    const {instanceId,remoteJid,message}=req.body;
    try {
            const instance = await Instance.findOne({ _id: instanceId, user: req.body.user_jwt, status: "active" });
            if (!instance) {
                return res.status(200).json(await jsonAnswer(400, `Incorrect instance ID. We have not found an active instance with the instance ID: ${instanceId}.`, null));
            }
            const wsp = await new Wsp();
            const instanceStart = await wsp.getInstance(instanceId);
            const messageSent = await instanceStart.sendMessage({ remoteJid, message });
            return res.status(200).json(await jsonAnswer(200, null, `Your message has been sent (${remoteJid})`, { message: messageSent }));        
    } catch (error) {
        console.log(error?.message)
        return res.status(200).json(await jsonAnswer(400,"The operation has failed","Your chat has not correctly found.",{error:error?.message}));
    }
}

const instanceSendMedia=async(req,res)=>{
    const {instanceId,remoteJid,fileUrl,type,caption,ptt,document,mimetype,fileName}=req.body;
    try {
        const instance=await Instance.findOne({_id:instanceId,user:req.body.user_jwt,status:"active"});
        if(!instance){
            return res.status(200).json(await jsonAnswer(400,`Incorrect instance ID","We have not found an active instance with the instance ID: ${instanceId}.`,null));
        }
        const wsp=await new Wsp();
        const instanceStart=await wsp.getInstance(instanceId);
        const messageSent=await instanceStart.sendMedia({remoteJid,fileUrl,type,caption,ptt,document,mimetype,fileName});
        return res.status(200).json(await jsonAnswer(200,null,`Your message has been sent (${remoteJid})`,{message:messageSent}));
    } catch (error) {
        console.log("error",error?.message)
        return res.status(200).json(await jsonAnswer(400,"The operation has failed","Your chat has not correctly found.",{error:error?.message}));
    }
}

module.exports={
    instanceCreate,
    instanceGet,
    instanceInit,
    instanceContacts,
    instanceDelete,
    instanceEdit,
    instanceSendText,
    instanceSendMedia,
    instanceChat,
    instanceMessage,
    instanceMedia
}