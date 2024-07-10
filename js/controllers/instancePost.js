const Instance = require("../database/models/instance");
const { jsonAnswer } = require("../helpers/apiFormat");
const { checkCons } = require("../helpers/consumption");
const { msgFormat } = require("../helpers/msgFormat");
const { Wsp } = require("../models/wspClass");


const instanceCreate=async(req,res)=>{
    const {name,webhook,type}=req.body;
    try {
        const instance=new Instance({name,user:req.body.user_jwt._id,webhook,type,start:Math.floor(Date.now() / 1000)});
        await instance.save()
        return res.status(200).json(await jsonAnswer(200,null,'The instance has been created.',{instance}));
    } catch (error) {
        return res.status(400).json(await jsonAnswer(200,'The instance could not be created.','It has happend a problem.',null));
    }
}

const instanceGet=async(req,res)=>{
    const {instanceId,user_jwt}=req.body;
    let instances;
    try {
        if(instanceId){
            instances=await Instance.find({user:user_jwt.id,status:"active",_id:instanceId});
            if(instances.length>=1){
                const wsp=new Wsp();
                const instanceStart=await wsp.getInstance(instanceId);
                instances[0]={...instances[0].toJSON(),qr:instanceStart.data.qr};
                console.log(instances[0],instanceStart.data.qr)
            }
            }else{
            instances=await Instance.find({user:user_jwt.id,status:"active"});
        } 
        return res.status(200).json(await jsonAnswer(200,null,"Instances data sent",{instances}))
    } catch (error) {
        return res.status(400).json(await jsonAnswer(400,"The operation has failed","-",null));
    }
}

const instanceConsumption=async(req,res)=>{
    const {user_jwt,month,year}=req.body;
    let instancesData;
    try {
        instancesData=await checkCons(user_jwt.id,month,year)
        return res.status(200).json(await jsonAnswer(200,null,"Instances data sent",{instancesData}))
    } catch (error) {
        return res.status(400).json(await jsonAnswer(400,"The operation has failed","-",null));
    }
}

const instanceInit=async(req,res)=>{
    const {instanceId}=req.body;
    try {
        const instance=await Instance.findOne({_id:instanceId,user:req.body.user_jwt,status:"active"});
        const wsp=await new Wsp();
        if(!instance){
            return res.status(400).json(await jsonAnswer(400,`Incorrect instance ID","We have not found an active instance with the instance ID: ${instanceId}.`,null));
        }
        const instanceStart=await wsp.createInstance(instanceId);
        return res.status(200).json(await jsonAnswer(200,null,"Your instance has been correctly started.",{instance:instanceStart.data}));
    } catch (error) {
        return res.status(400).json(await jsonAnswer(400,"The operation has failed","Your instance has not been correctly started.",null));
    }
}

const instanceDelete=async(req,res)=>{
    const {instanceId}=req.body;
    try {
        const instance=await Instance.findOne({_id:instanceId,user:req.body.user_jwt,status:"active"});
        if(!instance){
            return res.status(400).json(await jsonAnswer(200,`Incorrect instance ID","We have not found an active instance with the instance ID: ${instanceId}.`,null));
        }const wsp=new Wsp();
        const instanceStart=await wsp.getInstance(instanceId);
        if(instanceStart){await instanceStart.endInstance(true);}
        instance.status='delete';
        instance.end=Math.floor(Date.now() / 1000);
        instance.save();
        return res.status(200).json(await jsonAnswer(200,null,"Your instance has been correctly deleted.",{instance}));
    } catch (error) {
        return res.status(400).json(await jsonAnswer(400,"The operation has failed","Your instance has not been correctly deleted.",error.message));
    }
}

const instanceContacts=async(req,res)=>{
    const {instanceId}=req.body;
    const instance=await Instance.findOne({_id:instanceId,user:req.body.user_jwt,status:"active"});
    try {
        if(!instance){
            return res.status(400).json(await jsonAnswer(400,`Incorrect instance ID","We have not found an active instance with the instance ID: ${instanceId}.`,null));
        }
        const wsp=await new Wsp();
        const instanceStart=await wsp.getInstance(instanceId);
        const contacts=await instanceStart.getContacts();
        return res.status(200).json(await jsonAnswer(200,null,"Contact data sent.",{contacts}));
    } catch (error) {
        return res.status(400).json(await jsonAnswer(400,"The operation has failed","Your instance contact has not correctly found.",null));
    }
    
}

const instanceChat=async(req,res)=>{
    const {instanceId,remoteJid,qty}=req.body;
    try {
        const instance=await Instance.findOne({_id:instanceId,user:req.body.user_jwt,status:"active"});
        if(!instance){
            return res.status(400).json(await jsonAnswer(400,`Incorrect instance ID","We have not found an active instance with the instance ID: ${instanceId}.`,null));
        }
        const wsp=await new Wsp();
        const instanceStart=await wsp.getInstance(instanceId);
        let chats = await instanceStart.getChat(remoteJid,qty);
        chats = chats.map(a => {return msgFormat(a)});
        chats=chats.filter(a=>a!=null);
        return res.status(200).json(await jsonAnswer(200,null,"Chat messages data sent.",{chats}));
    } catch (error) {
        return res.status(400).json(await jsonAnswer(400,"The operation has failed","Your chat has not correctly found.",null));
    }
    
}

const instanceMessage=async(req,res)=>{
    const {instanceId,messageId}=req.body;
    try {
        const instance=await Instance.findOne({_id:instanceId,user:req.body.user_jwt,status:"active"});
        if(!instance){
            return res.status(400).json(await jsonAnswer(400,`Incorrect instance ID","We have not found an active instance with the instance ID: ${instanceId}.`,null));
        }
        const wsp=await new Wsp();
        const instanceStart=await wsp.getInstance(instanceId);
        let chats = await instanceStart.getMessage(messageId)
        return res.status(200).json(await jsonAnswer(200,null,"Message data sent.",{chats:[msgFormat(chats)]}));
    } catch (error) {
        return res.status(400).json(await jsonAnswer(400,"The operation has failed","Your chat has not correctly found.",null));
    }
}

const instanceMedia=async(req,res)=>{
    const {instanceId,messageId}=req.body;
    try {
        const instance=await Instance.findOne({_id:instanceId,user:req.body.user_jwt,status:"active"});
        if(!instance){
            return res.status(400).json(await jsonAnswer(400,`Incorrect instance ID","We have not found an active instance with the instance ID: ${instanceId}.`,null));
        }
        const wsp=await new Wsp();
        const instanceStart=await wsp.getInstance(instanceId);
        const {data,mimetype} = await instanceStart.getMedia(messageId);
        if(!data){
            return res.status(400).json(await jsonAnswer(400,`We could not find you media file.`,`-`,{error:"Media not found"}));
        }
        res.setHeader('Content-Type', mimetype);
        res.send(data);
    } catch (error) {
        return res.status(400).json(await jsonAnswer(400,"The operation has failed","Your chat has not correctly found.",{error:error.message}));
    }
    
}


const instanceEdit=async(req,res)=>{
    const {instanceId,name,webhook,type}=req.body;
    try {
        const instance=await Instance.findOne({_id:instanceId,user:req.body.user_jwt,status:"active"});;
        if(!instance){
            return res.status(400).json(await jsonAnswer(400,`Incorrect instance ID","We have not found an active instance with the instance ID: ${instanceId}.`,null));
        }
        if(name){instance.name=name;}
        if(webhook){instance.webhook=webhook;}
        if(type){instance.type=type}
        instance.save();
        return res.status(200).json(await jsonAnswer(200,null,"Instance has been modified.",{instance}));
    } catch (error) {
        return res.status(400).json(await jsonAnswer(400,"The operation has failed","Your chat has not correctly found.",null));
    }
    
}

const instanceSendText=async(req,res)=>{
    const {instanceId,remoteJid,message}=req.body;
    try {
            const instance = await Instance.findOne({ _id: instanceId, user: req.body.user_jwt, status: "active" });
            if (!instance) {
                return res.status(400).json(await jsonAnswer(400, `Incorrect instance ID. We have not found an active instance with the instance ID: ${instanceId}.`, null));
            }
            const wsp = await new Wsp();
            const instanceStart = await wsp.getInstance(instanceId);
            const messageSent = await instanceStart.sendMessage({ remoteJid, message });
            return res.status(200).json(await jsonAnswer(200, null, `Your message has been sent (${remoteJid})`, { message: messageSent }));        
    } catch (error) {
        return res.status(400).json(await jsonAnswer(400,"The operation has failed","Your chat has not correctly found.",{error:error?.message}));
    }
}

const instanceSendMedia=async(req,res)=>{
    const {instanceId,remoteJid,fileUrl,type,caption,ptt,document,mimetype,fileName}=req.body;
    try {
        const instance=await Instance.findOne({_id:instanceId,user:req.body.user_jwt,status:"active"});
        if(!instance){
            return res.status(400).json(await jsonAnswer(400,`Incorrect instance ID","We have not found an active instance with the instance ID: ${instanceId}.`,null));
        }
        const wsp=await new Wsp();
        const instanceStart=await wsp.getInstance(instanceId);
        const messageSent=await instanceStart.sendMedia({remoteJid,fileUrl,type,caption,ptt,document,mimetype,fileName});
        return res.status(200).json(await jsonAnswer(200,null,`Your message has been sent (${remoteJid})`,{message:messageSent}));
    } catch (error) {
        return res.status(400).json(await jsonAnswer(400,"The operation has failed","Your chat has not correctly found.",{error:error?.message}));
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
    instanceMedia,
    instanceConsumption
}