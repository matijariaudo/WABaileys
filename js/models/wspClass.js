const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion,makeInMemoryStore} = require("@whiskeysockets/baileys");
const path = require('path');
const EventEmitter = require('events');
const { eliminarCarpetaAsync } = require("../helpers/deleteFolder");
const axios = require('axios');
const fs = require('fs');
const {Instance} = require("../database/models");
const { msgFormat } = require("../helpers/msgFormat");
const { checkMedia } = require("../helpers/checkMedia");


class Instances{
    constructor(id){
        this.id=id;
        this.data={qr:"",me:{}};
        this.path = `auth_wp/session_${this.id}`;
        this.status="initializing"; 
        checkFolder('./media_wp/'+this.id)
    }
    async init(){
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
                this.sock = await makeWASocket({ auth: state ,version,qrTimeout:10000,retryRequestDelayMs: 10000,browser:["WspPlus","Chrome",null]});
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
                //console.log(`Error ${this.id} (Code:${code})-->`,lastDisconnect?.error?.message)
                if(code==401){this.deleteInstance();db.session='close';}//408:Qr expired | 401: User close session from mobile
                if(code==408 && message=='QR refs attempts ended'){this.deleteInstance();db.session='close';}//408:Qr expired | 401: User close session from mobile
                if(code==515){db.session='connecting';this.init();}//515: Scan / Restart needing
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

    deleteInstance=async()=>{
        console.log("Instance delete",this.id)
        await eliminarCarpetaAsync(this.id);
        const wsp=new Wsp();
        await wsp.deleteIntance(this.id);
    }

    async sendMessage({remoteJid,message=''}){
        try {
            const a=await this.sock.sendMessage(remoteJid,{ text: message});
            const messageSend=await msgFormat(a);
            return messageSend;   
        } catch (error) {
            return {}
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
        const archivo=await checkMedia(message,this);
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
  
    async createInstance(id) {
      if (!this.instancias[id]) {
        console.log("New instance ",id)
        this.instancias[id] =new Instances(id);
        await this.instancias[id].init()
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



async function checkFolder(ruta) {
    try {
        // Verificar si la carpeta existe
        const existeCarpeta = await fs.promises.stat(ruta).then(stats => stats.isDirectory()).catch(() => false);

        if (!existeCarpeta) {
            // Si la carpeta no existe, crearla
            await fs.promises.mkdir(ruta, { recursive: true });
            console.log(`Carpeta "${ruta}" creada correctamente.`);
        } else {
            console.log(`La carpeta "${ruta}" ya existe.`);
        }
    } catch (error) {
        console.error(`Error al verificar o crear la carpeta "${ruta}":`, error);
    }
}

