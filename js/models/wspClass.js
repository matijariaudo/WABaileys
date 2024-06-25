const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeInMemoryStore } = require("@whiskeysockets/baileys");
const { eliminarCarpetaAsync } = require("../helpers/deleteFolder");
const { Instance } = require("../database/models");
const { msgFormat } = require("../helpers/msgFormat");
const { checkMedia } = require("../helpers/checkMedia");
const { checkFolder } = require("../helpers/checkFolder");
const {sendWebhook}=require("../helpers/sendWebhook")
const { default: axios } = require("axios");
const path = require("path");
const fs = require('fs');

class Instances {
    constructor(id) {
        this.id = id;
        this.data = { qr: "", me: {} };
        this.path = `auth_wp/session_${this.id}`;
        this.memory = `cache_wp/baileys_${this.id}.json`;
        this.status = "initializing";
        this.restart = 0;
        this.store={messages:[],chats:{},contacts:{}};
        createFile(this.store,this.memory)
}

    async init({QrBlock= false}) {
        const t1 = QrBlock ? 100 : 60_000;
        console.log("INSTANCE ID",this.id, QrBlock, t1);
        const { state, saveCreds } = await useMultiFileAuthState(this.path);
        const { version } = await fetchLatestBaileysVersion();

        return new Promise(async (resolve, reject) => {
            try {
                this.store=await this.readMemory();
                this.sock = await makeWASocket({
                    auth: state,
                    version,
                    qrTimeout: t1,
                    retryRequestDelayMs: t1,
                    browser: ["WspPlus", "Ubuntu", null]
                });

                this.sock.ev.on("creds.update", saveCreds); //IMPORTANT: It saves connection and session data.
                this.sock.ev.on("connection.update", (update) => this.admConnection(update, resolve, reject)); //IMPORTANT: It admin the Connection changes
                this.sock.ev.on('messages.upsert', async (e) =>{
                    const messages=e.messages;
                    messages?.forEach((e) => { this.store.messages.push(JSON.parse(JSON.stringify(e)))});
                    await this.saveMemory()
                    console.log(msgFormat(messages[0]))
                    this.receiveMessages(messages);
                });

                
                this.sock.ev.on("contacts.upsert",(e) =>{
                    //console.log("CONTACTS",e)
                    //this.updateContact(e) 
                })
                this.sock.ev.on("messaging-history.set",async (e)=>{
                    const now =  Math.floor(Date.now()/ 1000);
                    const messages=e.messages.filter(a=>a!=null).filter(a=>{
                        if((now-a.messageTimestamp)<=(1 * 24 * 60 * 60)){return true;}
                    });
                    messages?.forEach((e) => { this.store.messages.push(JSON.parse(JSON.stringify(e)))});
                    
                    const contacts=e.contacts.filter(a=> a.name || a.notify);
                    contacts?.forEach((e) => { this.store.contacts[e.id]=e});
                    
                    const chats=e.chats.map(a=>{return {id:a.id,conversationTimestamp:a.conversationTimestamp?.low}})
                    chats?.forEach((e) => { this.store.chats[e.id]=e});
                    
                    await this.saveMemory();
                })
                this.sock.ev.on("contacts.upsert",async (e) =>{
                    const contacts=e.filter(a=> a.name || a.notify);
                    contacts?.forEach((e) => { this.store.contacts[e.id]=e});
                    await this.saveMemory();
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

    async memoryHistory(e){

    }

    async cleanOldData(){
        const now =  Math.floor(Date.now()/ 1000);
        this.store.messages=await this.store?.messages?.filter(a=>a!=null).filter(a=>{
            if((now-a.messageTimestamp)<=(1 * 24 * 60 * 60)){return true;}
        });
        await this.saveMemory();
    }

    async saveMemory(){
        await writeJsonFile(this.memory,this.store);
    }

    async readMemory(){
        return await readJsonFile(this.memory);
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
                    await this.endInstance(true);
                }

                if (!accError) {
                    this.restart++;
                    if (this.restart < 3) {
                        this.setStatus('connecting');
                        await this.init({ QrBlock: true });
                    } else {
                        this.setStatus('close');
                        await this.endInstance(false);
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

    async receiveMessages(messages) {
        const m = messages[0];
        const db = await Instance.findById(this.id);
        sendWebhook(msgFormat(m),db.webhook)
    }

    async endInstance(cleanMemory=false) {
        console.log("Instance delete", this.id);
        const wsp = new Wsp();
        await wsp.deleteInstance(this.id,cleanMemory);
    }

    async disconnectInstance(){
        if(this.status=='connected'){
        await this.sock.logout();
        }
    }

    async cleanMemoryInstance(){
        this.store={};
        await this.saveMemory()
        await eliminarCarpetaAsync(this.id);
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

    async getChat(contactId, qty = 5) {
        console.log(contactId)
        this.n = 0;
        try {
            const myChats = await this.store.messages.filter(a=>a?.key?.remoteJid==contactId).sort((b, a) => a.messageTimestamp - b.messageTimestamp).slice(0, qty);
            return myChats
        } catch (error) {
            // Manejo de errores si es necesario
        }
    }

    async getMessage(id) {
        const message = await this.store.messages.find(a=>a.key?.id==id);
        return message;
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

    async getMedia(id) {
        const message = await this.getMessage(id);
        console.log(message)
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
            Object.keys(this.instancias).forEach(async e => {
                if(this.instancias[e].status=="connected"){console.log("Clean");await this.instancias[e].cleanOldData()}
                console.log("Peso: ",e,sizeOfObject(this.instancias[e]))
                console.log(sizeOfObject(this.instancias[e].store.messages),`(${this.instancias[e].store.messages.length})`,sizeOfObject(this.instancias[e].store.contacts),sizeOfObject(this.instancias[e].store.chats))  
            });
        }, 360_000);
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

    async deleteInstance(id,cleanMemory=true) {
        if(cleanMemory){ 
            this.instancias[id]?.cleanMemoryInstance();
        }
        await this.instancias[id]?.disconnectInstance();
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

        if (value !== null && typeof value === 'object') {
            if (!objectList.includes(value)) {
                objectList.push(value);

                for (let key in value) {
                    if (Object.prototype.hasOwnProperty.call(value, key)) {
                        stack.push(value[key]);
                    }
                }
            }
        } else if (typeof value === 'string') {
            bytes += value.length * 2;
        } else if (typeof value === 'boolean') {
            bytes += 4;
        } else if (typeof value === 'number') {
            bytes += 8;
        }
    }
    return bytes / 1000000; // Devuelve el tamaño en megabytes
}

async function readJsonFile(filePath) {
    return new Promise((resolve, reject) => {
        const readable = fs.createReadStream(filePath, { encoding: 'utf8' });
        let data = '';

        readable.on('data', chunk => {
            data += chunk;
        });

        readable.on('end', () => {
            try {
                resolve(JSON.parse(data));
            } catch (error) {
                reject(error);
            }
        });

        readable.on('error', error => {
            reject(error);
        });
    });
}

async function writeJsonFile(filePath, jsonData) {
    return new Promise((resolve, reject) => {
        const writable = fs.createWriteStream(filePath, { encoding: 'utf8' });
        const jsonString = JSON.stringify(jsonData);

        writable.write(jsonString, 'utf8', (error) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });

        writable.end();
    });
}

async function createFile(json,dir){
    if(!await fileExists(dir)){
    await writeJsonFile(dir, json);
    }
}



async function fileExists(filePath) {
    try {
        await fs.promises.access(filePath, fs.constants.F_OK);
        return true; // El archivo existe
    } catch (error) {
        if (error.code === 'ENOENT') {
            return false; // El archivo no existe
        } else {
            throw error; // Ocurrió otro error al intentar acceder al archivo
        }
    }
}
