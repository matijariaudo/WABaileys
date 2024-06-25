const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeInMemoryStore } = require("@whiskeysockets/baileys");
const { eliminarCarpetaAsync } = require("../helpers/deleteFolder");
const { Instance, Chat, Message, Contact } = require("../database/models");
const { msgFormat } = require("../helpers/msgFormat");
const { checkMedia } = require("../helpers/checkMedia");
const { checkFolder } = require("../helpers/checkFolder");
const {sendWebhook}=require("../helpers/sendWebhook")
const fs = require('fs');
const message = require("../database/models/message");


class Instances {
    constructor(id) {
        this.id = id;
        this.data = { qr: "", me: {} };
        this.path = `auth_wp/session_${this.id}`;
        this.status = "initializing";
        this.restart = 0;
        this.QrBlock = false;
        this.store;
        this.userId;
        checkFolder('./data_wp/' + this.id);
        this.show=true;
        this.shown=0;
    }

    async init({ QrBlock }) {
        this.QrBlock = QrBlock ? QrBlock : false;
        const t1 = this.QrBlock ? "100" : 60000;
        const { state, saveCreds } = await useMultiFileAuthState(this.path);
        const { version, isLatest } = await fetchLatestBaileysVersion();
        return new Promise(async (resolve, reject) => {
            try {
                
                this.sock = await makeWASocket({
                    auth: state,
                    version,
                    qrTimeout: t1,
                    retryRequestDelayMs: t1,
                    browser: ["WspPlus", "Ubuntu", null]
                });
                this.sock.ev.on("creds.update", saveCreds); //IMPORTANT: It saves connection and session data.
                this.sock.ev.on("connection.update", (update) => this.admConnection(update, resolve, reject)); //IMPORTANT: It admin the Connection changes
                //this.sock.ev.on('messages.upsert', (message) =>this.receiveMessages(message));
                this.sock.ev.on("messaging-history.set",(e)=>{
                    const contacts=e.contacts.filter(a=>a.id.indexOf("s.whatsapp")>1).filter(a=> a.name!=undefined && a.name!=null);
                    updateContact(contacts,this.id)
                    const groups=e.contacts.filter(a=>a.id.indexOf("g.us")>1);
                    updateContact(groups,this.id,true)
                    const chats=e.chats.map(a=>{return {id:a.id,conversationTimestamp:a.conversationTimestamp?.low}})
                    updateChats(chats,this.id);
                    const messages=e.messages.map(a=>msgFormat(a)).filter(a=>a!=null);
                    updateMesages(messages,this.id);
                })
                this.sock.ev.on('messages.upsert', (e) =>{
                    const newM=msgFormat(e.messages[0]);
                    const messages=e.messages.map(a=>msgFormat(a)).filter(a=>a!=null);
                    updateMesages(messages,this.id);
                });
                this.sock.ev.on("chats.upsert",(e) =>{
                    updateChats(e,this.id)
                });
                this.sock.ev.on("chats.update",(e) =>{
                    updateChats(e,this.id)
                });
                this.sock.ev.on("contacts.upsert",(e) =>{
                    updateContact(e,this.id)
                })

                this.sock.ev.on("groups.update",(e) =>{
                    //updateContact(e,this.id,true)
                });
                this.sock.ev.on("groups.upsert",(e) =>{
                    updateContact(e,this.id,true)
                });

                setTimeout(() => {
                    reject("TimeOut: 5000ms");
                }, 5000);

                this.firstTime = false;
            } catch (error) {
                reject("It has happened an issue while sock was initializing: " + error);
            }
        });
    }


    async setStatus(status,{number}={}) {
        this.status = status;
        const db = await Instance.findById(this.id);
        db.session = status;
        if(number){db.number=number;}
        db.save();
    }

    async admConnection(update, resolve, reject) {
        const { qr, connection, lastDisconnect } = update || {};

        if (lastDisconnect) {
            console.log(`Account ${this.id}-->`, lastDisconnect?.error);
            if (lastDisconnect?.error) {
                const code = lastDisconnect?.error?.output?.statusCode;
                const { message } = lastDisconnect?.error?.output?.payload;
                console.log(`Error ${this.id} (Code:${code})-->`, lastDisconnect?.error?.message);
                let accError = false;

                if (code == 401 || (code == 408 && message == 'QR refs attempts ended')) {
                    console.log(code == 408 ? "Client QR die" : "Client ends session");
                    accError = true;
                    this.setStatus('close');
                    await this.deleteInstance(true);
                }

                if (!accError) {
                    this.restart++;
                    if (this.restart < 3) {
                        this.setStatus('connecting');
                        await this.init({ QrBlock: true });
                    } else {
                        this.setStatus('close');
                        await this.deleteInstance();
                    }
                }
                reject(lastDisconnect?.error);
            }
        }

        if (qr) {
            this.data.qr = qr;
            this.setStatus('qr');
            resolve('qr')
        }

        if (connection) {
            const { me } = this.sock.authState.creds;
            this.data.me = me;
            console.log(`Change Status ${this.id}-->`, connection);
            if (me && connection == 'open') {
                console.log(`Account data ${this.id}-->`, this.data.me);
                this.data.qr = "";
                this.restart = 0;
                this.setStatus('connected',{number:this.data.me.id.split(":")[0]});
                resolve(connection);
            }
        }
    }

    async receiveMessages(message) {
        const m = message.messages[0];
        const db = await Instance.findById(this.id);
        //sendWebhook(msgFormat(m),db.webhook)
    }

    async deleteInstance(deleteInst = false) {
        console.log("Instance delete", this.id);
        if (deleteInst) {
            await eliminarCarpetaAsync(this.id);
        }
        const wsp = new Wsp();
        await wsp.deleteIntance(this.id);
    }

    async sendMessage({ remoteJid, message = '' }) {
        try {
            const a = await this.sock.sendMessage(remoteJid, { text: message });
            const messageSend = await msgFormat(a);
            return messageSend;
        } catch (error) {
            throw new Error(`The instance has failed. Cause: ${error.cause || '-'}`);
        }
    }

    async sendMedia({ remoteJid, caption, fileUrl, type = "document", ptt = false, mimetype,fileName}) {
        try {
            const a = await this.sock.sendMessage(remoteJid, {
                [type]: { url: fileUrl }, // [type] permite transformar una variable en título de objeto
                caption,
                ptt,
                mimetype,
                fileName
            });
            const messageSend = await msgFormat(a);
            return messageSend;
        } catch (error) {
            throw new Error(`The instance has failed. Cause: ${error.cause || '-'}`);
        }
    }

    async getChat(contactId, qty = 3) {
        const data = await this.store;
        this.n = 0;
        try {
            const myChats = await data.toJSON();
            const rta = myChats.messages[contactId]?.toJSON();
            return rta.slice(-1 * qty);
        } catch (error) {
            // Manejo de errores si es necesario
        }
    }

    async getMessage(jid, id) {
        const data = await this.store;
        const message = await data.loadMessage(jid, id);
        return msgFormat(message);
    }

    async getContacts() {
        try {
            const contacts1=await "B";
            const contacts2=await "A";
            return [...contacts1, ...contacts2];
        } catch (error) {
            console.log(error.message)
        }
    }

    async getMedia(jid, id) {
        const messageB = await Message.findOne({messageId:id,instanceId:this.id})
        const message=JSON.parse(messageB.json) || undefined;
        if (!message) {
            throw new Error(`We cannot find the message.`);
        }
        const archivo = await checkMedia(message, this);
        if (!archivo) {
            throw new Error(`We cannot find media files in the message.`);
        }
        return archivo;
    }
}

class Wsp {
    constructor() {
        this.instancias = {};
        if (Wsp.instance) {
            return Wsp.instance;
        }
        Wsp.instance = this;
        setInterval(() => {
            console.log("Peso: ",sizeOfObject(this.instancias))    
        }, 5000);
        return this;
    }

    async createInstance(id, options = {}) {
        if (!this.instancias[id]) {
            console.log("New instance ", id);
            this.instancias[id] = new Instances(id, options);
            await this.instancias[id].init(options);
        }
        return this.instancias[id];
    }

    async getInstance(id) {
        if (!this.instancias[id]) {
            return null;
        }
        return this.instancias[id];
    }

    async deleteIntance(id) {
        delete this.instancias[id];
    }

    async getInfo() {
        const key = Object.keys(this.instancias);
        const rta = [];
        key.forEach(e => {
            rta.push(this.instancias[e]);
        });
        return rta.map(a => { return { id: a.id, session: a.session }; });
    }
}

module.exports = { Wsp };

function sizeOfObject(obj) {
    const objectList = [];
    const stack = [obj];
    let bytes = 0;

    while (stack.length) {
        const value = stack.pop();

        if (typeof value === 'boolean') {
            bytes += 4;
        } else if (typeof value === 'string') {
            bytes += value.length * 2;
        } else if (typeof value === 'number') {
            bytes += 8;
        } else if (typeof value === 'object' && !objectList.includes(value)) {
            objectList.push(value);

            for (let key in value) {
                stack.push(value[key]);
            }
        }
    }
    return bytes/1000000;
}

async function updateContact(dat,id){
    batch=[]
    dat.forEach(async e =>{
        let contact=await Contact.findOne({instanceId:id,remoteJid:e.id});
        if(contact){
            contact.set(e);
            contact.save()
        }else{
            batch.push({name:e.name,remoteJid:e.id,instanceId:id});
        }
    });
    await Contact.insertMany(batch)        
}

async function updateChats(dat,id){
    batch=[]
    dat.forEach(async e =>{
        let chat=await Chat.findOne({instanceId:id,remoteJid:e.id});
        if(chat){
            chat.conversationTimestamp=e.conversationTimestamp;
            chat.save()
        }else{
            batch.push({remoteJid:e.id,conversationTimestamp:e.conversationTimestamp,instanceId:id});
        }
    });
    await Chat.insertMany(batch)
}

const show=0
async function updateMesages(dat,id){
    batch=[]
    dat.forEach(async e =>{
        if(e.remoteJid.indexOf('@s.whatsapp.net')>-1 || e.remoteJid.indexOf('@g.us')>-1){
            if(!e.empty){
            batch.push({...e,instanceId:id});
            }else{
              console.log(e)
            }        
        }
    });
    await Message.insertMany(batch);
}

