const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeInMemoryStore } = require("@whiskeysockets/baileys");
const { eliminarCarpetaAsync } = require("../helpers/deleteFolder");
const { Instance } = require("../database/models");
const { msgFormat } = require("../helpers/msgFormat");
const { checkMedia } = require("../helpers/checkMedia");
const { checkFolder } = require("../helpers/checkFolder");
const { default: axios } = require("axios");
const path = require("path");

class Instances {
    constructor(id) {
        this.id = id;
        this.data = { qr: "", me: {} };
        this.path = `auth_wp/session_${this.id}`;
        this.status = "initializing";
        this.restart = 0;
        this.QrBlock = false;
        checkFolder('./media_wp/' + this.id);
    }

    async init({ QrBlock }) {
        this.QrBlock = QrBlock ? QrBlock : false;
        const t1 = this.QrBlock ? "100" : 60000;
        console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAA", this.QrBlock, t1);
        const { state, saveCreds } = await useMultiFileAuthState(this.path);
        const { version, isLatest } = await fetchLatestBaileysVersion();

        return new Promise(async (resolve, reject) => {
            try {
                this.store = makeInMemoryStore({});
                const memory = `cache_wp/baileys_${this.id}.json`;
                this.store.readFromFile(memory);
                setInterval(() => {
                    this.store.writeToFile(memory);
                }, 10_000);

                this.sock = await makeWASocket({
                    auth: state,
                    version,
                    qrTimeout: t1,
                    retryRequestDelayMs: t1,
                    browser: ["WspPlus", "Ubuntu", null]
                });

                this.sock.ev.on("creds.update", saveCreds); //IMPORTANT: It saves connection and session data.
                this.sock.ev.on("connection.update", (update) => this.admConnection(update, resolve, reject)); //IMPORTANT: It admin the Connection changes
                this.sock.ev.on('messages.upsert', this.receiveMessages);

                this.store.bind(this.sock.ev);

                this.sock.ev.on("chats.set", () => {
                    console.log("got chats", this.store.chats.all());
                });

                this.sock.ev.on("contacts.set", () => {
                    console.log("got contacts", Object.values(this.store.contacts));
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
                        console.log("BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",lastDisconnect)
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
        const { remoteJid, fromMe } = m.key;

        if (!fromMe) {
            if (!m.message) return; // if there is no text or media message
            console.log(`Nuevo mensaje recibido en ${this.id}: "${remoteJid.split("@")[0]}(${remoteJid})":${message.messages[0].message?.conversation}`);
        }
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

    async sendMedia({ remoteJid, caption, fileUrl, type = "document", ptt = false }) {
        try {
            const a = await this.sock.sendMessage(remoteJid, {
                [type]: { url: fileUrl }, // [type] permite transformar una variable en título de objeto
                caption,
                ptt
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
        const data = await this.store;
        try {
            const myContacts = data.contacts;
            console.log(data.contacts);
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
