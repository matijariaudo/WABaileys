const { writeFile } =require('fs/promises')
const { downloadMediaMessage } =require('@whiskeysockets/baileys');
const { comprimirImagen } = require('./comprimirImg');


const checkMedia=async(m,t)=>{
    const logger = {
        // Función para registrar mensajes de información
        info: (...args) => console.log('[INFO]', ...args),
        // Función para registrar mensajes de error
        error: (...args) => console.error('[ERROR]', ...args),
        // Función para registrar mensajes de depuración (opcional)
        debug: (...args) => console.debug('[DEBUG]', ...args)
    };
    if(!m?.message){return {};}
    const messageTypeArray = Object.keys (m.message);
    const messageType=messageTypeArray.find(a=> a === 'imageMessage' || a==='audioMessage' || a==='stickerMessage') || null;
    if(!messageType){ throw new Error('We can not find media files in the message.')}
    const messageCont=m.message[messageType];
    const {mimetype}=messageCont
    if (messageType === 'imageMessage' || messageType==='audioMessage' || messageType==='stickerMessage') {
        const buffer = await downloadMediaMessage(m,'buffer',{ },{logger,reuploadRequest: t.sock.updateMediaMessage})
        //await writeFile('./media_wp/'+t.id+'/my-download.'+mimetype.split("/")[1], buffer)
        let bufferEnviar=buffer;
        if(messageType === 'imageMessage'){bufferEnviar=await comprimirImagen(buffer);}
        return {data:bufferEnviar,mimetype}
    }else{
        return {};
    }
}

module.exports={checkMedia}