const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion,makeInMemoryStore} = require("@whiskeysockets/baileys");
const EventEmitter = require('events');
const { eliminarCarpetaAsync } = require("../helpers/deleteFolder");
const {Instance} = require("../database/models");
const { msgFormat } = require("../helpers/msgFormat");
const { checkMedia } = require("../helpers/checkMedia");
const { checkFolder } = require("../helpers/checkFolder");
const { default: axios } = require("axios");
const path = require("path");


class Instances{
    constructor(id){
        this.id=id;
        this.data={qr:"",me:{}};
        this.path = `auth_wp/session_${this.id}`;
        this.status="initializing"; 
        this.restart=0;
        this.QrBlock=false;
        checkFolder('./media_wp/'+this.id)
    }
    async init({QrBlock}){
        this.QrBlock=QrBlock?QrBlock:false;
        const t1=this.QrBlock?"100":60000;
        console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAA",this.QrBlock,t1)
        const { state, saveCreds } = await useMultiFileAuthState(this.path);
        const { version, isLatest } = await fetchLatestBaileysVersion()
        return new Promise(async(resolve, reject) => {
            try {
                    this.store = makeInMemoryStore({});
                    const memory=`cache_wp/baileys_${this.id}.json`;
                    this.store.readFromFile(memory);
                    setInterval(() => {
                        this.store.writeToFile(memory);
                    }, 10_000);
                    this.sock = await makeWASocket({ 
                        auth: state ,
                        version,
                        qrTimeout:t1,
                        retryRequestDelayMs:t1,
                        browser:["WspPlus","Ubuntu",null]
                    });
            } catch (error) {
                    reject("It has happend an issue while sock was inizializing",error);
            }
            this.sock.ev.on("creds.update", saveCreds);//IMPORTANT: It saves connection and session data.
            this.sock.ev.on("connection.update",this.admConnection)//IMPORTANT: It admin the Connection changes
            this.sock.ev.on('messages.upsert',this.receiveMessages)   

            // will listen from this socket
            // the store can listen from a new socket once the current socket outlives its lifetime
            this.store.bind(this.sock.ev);

            this.sock.ev.on("chats.set", () => {
            // can use "store.chats" however you want, even after the socket dies out
            // "chats" => a KeyedDB instance
            this.console.log("got chats", this.store.chats.all());
            });

            this.sock.ev.on("contacts.set", () => {
            console.log("got contacts", Object.values(this.store.contacts));
            });

            this.on('statusChange',(status)=>{resolve(status)})
            setInterval(()=>{reject("TimeOut: 5000mls")},5000)
            this.firstTime=false;      
        })

    }
    setStatus(status){
        this.status=status;
        this.emit('statusChange',this.status)
    }


    admConnection=async(update)=>{
        const {qr,connection,lastDisconnect}=update||{}
        if(lastDisconnect){
            console.log(`Account ${this.id}-->`,lastDisconnect?.error)
            if(lastDisconnect?.error){
                const code=lastDisconnect?.error?.output?.statusCode;
                const {message}=lastDisconnect?.error?.output?.payload;
                const db=await Instance.findById(this.id)
                console.log(`Error ${this.id} (Code:${code})-->`,lastDisconnect?.error?.message)
                let accError=false;
                if(code==401 || (code==408 && message=='QR refs attempts ended')){  //408:Qr expired | 401: User close session from mobile
                    console.log(code==408?"Client QR die":"Client ends session");
                    accError=true;db.session='close';this.deleteInstance(true);
                }
                //if(code==515){db.session='connecting';this.init();accError=true;}   //515: Scan / Restart needing
                if(!accError){
                    this.restart++;
                    if(this.restart<3){
                        db.session='connecting';this.init({QrBlock:true});
                    }else{
                        db.session='close';this.deleteInstance();
                    }
                }
                this.setStatus(db.session)
                db.save();
            }
        }
        if(qr){ 
            this.data.qr=qr;
            this.setStatus('qr');
            const db=await Instance.findById(this.id)
            db.session='qr';
            db.save();
        }
        if(connection){
            const {me}=this.sock.authState.creds;
            this.data.me=me;
            console.log(`Change Status ${this.id}-->`,connection)
            if(me && connection=='open'){
                console.log(`Account data ${this.id}-->`,this.data.me)
                this.data.qr="";
                this.setStatus('connected')
                this.restart=0;
                const db=await Instance.findById(this.id)
                db.session='connected';
                db.number=this.data.me.id.split(":")[0];
                db.save();
            }
        }
    }

    receiveMessages=async(message)=>{
        const m=message.messages[0];
        const { remoteJid,fromMe} = m.key;
        if(!fromMe){
            if (!m.message) return // if there is no text or media message
            //checkMedia(m,this)
            console.log(`Nuevo mensaje recibido en ${this.id}: "${remoteJid.split("@")[0]}(${remoteJid})":${message.messages[0].message?.conversation}`);
        }
    }

    deleteInstance=async(deleteInst=false)=>{
        console.log("Instance delete",this.id)
        if(deleteInst){await eliminarCarpetaAsync(this.id);}
        const wsp=new Wsp();
        await wsp.deleteIntance(this.id);
    }

    async sendMessage({remoteJid,message=''}){
        try {
            const a=await this.sock.sendMessage(remoteJid,{ text: message});
            const messageSend=await msgFormat(a);
            return messageSend; 
        } catch (error) {
            throw new Error(`The instance has failed. Cause: ${error.cause || '-'}`)
        }        
    }
    async sendMedia({remoteJid,caption,fileUrl,type="document",ptt=false}){
        try {
                const a=await this.sock.sendMessage(remoteJid,{
                    [type]: {url:fileUrl}, //[type] puedo transformar una variable en titulo de objeto
                    caption,
                    ptt
                });                             
                const messageSend=await msgFormat(a);
                return messageSend; 
        } catch (error) {
            throw new Error(`The instance has failed. Cause: ${error.cause || '-'}`)
        }        
    }

    async getChat(contactId,qty=3){
       const data=await this.store;
       this.n=0
       try {
        const myChats=await data.toJSON();
        const rta= myChats.messages[contactId]?.toJSON();
        return rta.slice(-1*qty);
       } catch (error) {
        
       }
    }
    
    
    async getMessage(jid,id){
        const data=await this.store;
        const message =await data.loadMessage(jid,id);
        return msgFormat(message);
    }

    async getContacts(){
        const data=await this.store;
        try {
         const myContacts=data.contacts;
         console.log(data.contacts)
         return myContacts;
        } catch (error) {
         
        }
    }

    async getMedia(jid,id){
        const data=await this.store;
        const message =await data.loadMessage(jid,id);
        if(!message){ throw new Error(`We can not find the message.`)}
        const archivo=await checkMedia(message,this);
        if(!archivo){ throw new Error(`We can not find media files in the message.`)}
        return archivo;
    }
}
Object.assign(Instances.prototype, EventEmitter.prototype);

class Wsp {
    constructor() {
      this.instancias = {};
      if (Wsp.instance) {
        return Wsp.instance;
      }
      Wsp.instance = this;
      return this;
    }
  
    async createInstance(id,options={}) {
      if (!this.instancias[id]) {
        console.log("New instance ",id)
        this.instancias[id] =new Instances(id,options);
        await this.instancias[id].init(options)
      }
      return this.instancias[id];
    }

    async getInstance(id) {
        if (!this.instancias[id]) {
            return null;
        }
        return this.instancias[id];
    }

    async deleteIntance(id){
        delete this.instancias[id]
    }

    async getInfo(){
        const key=Object.keys(this.instancias)
        const rta=[]
        key.forEach(e => {
          rta.push(this.instancias[e])  
        });
        return rta.map(a=>{return {id:a.id,session:a.session}});
    }
}



module.exports = { Wsp };




