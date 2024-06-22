const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeInMemoryStore } = require("@whiskeysockets/baileys");
const { eliminarCarpetaAsync } = require("../helpers/deleteFolder");
const { Instance } = require("../database/models");
const { msgFormat } = require("../helpers/msgFormat");
const { checkMedia } = require("../helpers/checkMedia");
const { checkFolder } = require("../helpers/checkFolder");
const {sendWebhook}=require("../helpers/sendWebhook")
const { default: axios } = require("axios");
const path = require("path");

class Instances {
    constructor(id) {
        this.id = id;
        this.data = { qr: "", me: {} };
        this.path = `auth_wp/session_${this.id}`;
        this.memory = `cache_wp/baileys_${this.id}.json`;
        this.status = "initializing";
        this.restart = 0;
        this.QrBlock = false;
        checkFolder('./media_wp/' + this.id);
        
        
    }

    async init({ QrBlock }) {
        this.QrBlock = QrBlock ? QrBlock : false;
        const t1 = this.QrBlock ? "100" : 60000;
        console.log("INSTANCE ID",this.id, this.QrBlock, t1);
        const { state, saveCreds } = await useMultiFileAuthState(this.path);
        const { version, isLatest } = await fetchLatestBaileysVersion();

        return new Promise(async (resolve, reject) => {
            try {
                this.store = makeInMemoryStore({});
                const memory = `cache_wp/baileys_${this.id}.json`;
                this.store.readFromFile(memory);

                setInterval(() => {
                    this.store.writeToFile(memory);
                    this.cleanOldMessages()
                }, 10_000);
                setInterval(() => {
                    this.cleanOldMessages()
                }, 3600_000);
                
                this.sock = await makeWASocket({
                    auth: state,
                    version,
                    qrTimeout: t1,
                    retryRequestDelayMs: t1,
                    browser: ["WspPlus", "Ubuntu", null]
                });

                this.sock.ev.on("creds.update", saveCreds); //IMPORTANT: It saves connection and session data.
                this.sock.ev.on("connection.update", (update) => this.admConnection(update, resolve, reject)); //IMPORTANT: It admin the Connection changes
                this.sock.ev.on('messages.upsert', (message) =>this.receiveMessages(message));

                this.store.bind(this.sock.ev);

                this.sock.ev.on("contacts.upsert",(e) =>{
                    console.log("CONTACTS",e)
                    this.updateContact(e) 
                })
                this.sock.ev.on("messaging-history.set",(e)=>{
                    const contacts=e.contacts
                    console.log(contacts.splice(0,10))
                    console.log("Es la ultima? ",isLatest)
                })
                
                setTimeout(() => {
                    reject("TimeOut: 5000ms");
                }, 5000);

                this.firstTime = false;
            } catch (error) {
                reject("It has happened an issue while sock was initializing: " + error);
            }
        });
    }

    async updateContact(dat){
        dat.forEach(async e =>{
           console.log("Añadiendo ",dat[e])
           this.store.contacts[e]=dat[e]; 
        });     
        this.store.writeToFile(memory);  
    }

    // Función para limpiar mensajes viejos
    async cleanOldMessages() {
        const now =  Math.floor(Date.now()/ 1000);
        const expirationTime = 7* 24 * 60 * 60 * 1000; // 7 x 24 horas en milisegundos
        for (const key in this.store.messages) {
            this.store.messages[key]=this.store?.messages[key]?.filter(a=> {if((now-a.messageTimestamp)<=expirationTime){return true;}});
        }
        this.store.writeToFile(this.memory);   
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
        sendWebhook(msgFormat(m),db.webhook)
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
        console.log(contactId)
        const data = await this.store;
        this.n = 0;
        try {
            const myChats = await data.toJSON();
            const rta = await myChats.messages[contactId]?.toJSON();
            console.log(await myChats.messages[contactId])
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
        const data = await this.store;
        try {
            const myContactsInfo = data.contacts;
            const myContactsArray=[]
            Object.keys(myContactsInfo).forEach(e => {
                myContactsArray.push(myContactsInfo[e])
            });
            const myContacts=myContactsArray.filter(a=> a.name || a.notify);
            return myContacts;
        } catch (error) {
            // Manejo de errores si es necesario
        }
    }

    async getMedia(jid, id) {
        const data = await this.store;
        const message = await data.loadMessage(jid, id);

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
        }, 60_000);
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