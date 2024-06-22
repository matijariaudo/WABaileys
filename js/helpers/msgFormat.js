


const msgFormat=(a)=>{
    const { key, message, messageTimestamp,pushName,participant} = a;
    const timestamp=messageTimestamp || 0;
    let { conversation } = message || {};
    let replyTo;let media;let deleted=undefined;let edited=undefined;let empty=true;let json=undefined;
    if(!conversation){
        kind=Object.keys(message||{"":""})
        indice=kind.indexOf('extendedTextMessage');
        indiceMultimedia=kind.findIndex(a=> a=='imageMessage' || a=='audioMessage' || a=='videoMessage' || a=='stickerMessage' || a=='documentMessage' || a=='documentWithCaptionMessage');
        indiceProtocol=kind.findIndex(a=> a=='protocolMessage')
        indiceEdit=kind.findIndex(a=> a=='editedMessage')
        conversation=undefined;
        if(indice>-1){
            const {text,contextInfo}=message[kind[indice]];
            conversation=text;
            if(contextInfo){
            const {stanzaId:messageId,participant:senderId}=contextInfo;
            replyTo={messageId,senderId};
            }
        }
        if(indiceMultimedia>-1){
            let caption;
            let typeMedia=kind[indiceMultimedia];
            if(kind[indiceMultimedia]=='imageMessage'){caption=message[kind[indiceMultimedia]]?.caption || "";}
            if(kind[indiceMultimedia]=='videoMessage'){caption=message[kind[indiceMultimedia]]?.caption || "";}
            if(kind[indiceMultimedia]=='documentWithCaptionMessage'){caption=message[kind[indiceMultimedia]]?.message?.documentMessage?.caption || "";typeMedia="documentMessage"}
            media={media:typeMedia,caption};
        }
        if(indiceProtocol>-1){
            const {key}=message[kind[indiceProtocol]];
            const {id}=key || {};
            deleted={messageId:id};
            //console.log(a)
        }
        if(indiceEdit>-1){
            const em=message[kind[indiceEdit]];
            const datem=em.message?.protocolMessage;
            const {key,editedMessage,timestampMs}=datem || {}
            //console.log(key,editedMessage,timestampMs)
            const {conversation}=editedMessage || {};
            const {id}={key} || {};
            edited={messageId:id,conversation}
        }
    }
    let {reactionMessage } = message || {};
    let reaction=undefined
    if(reactionMessage){
        const {text,key}=reactionMessage;
        const {fromMe,id}=key || {};
        reaction={text,fromMe,messageId:id};
    }
    if(conversation || replyTo || media || deleted || edited){
        empty=false;
    }
    if(media){
        json=JSON.stringify(a);
    }
    if(message){
        return {remoteJid:key.remoteJid,participant,fromMe:key.fromMe,messageId:key.id,timestamp,conversation,pushName,replyTo,media,json,deleted,reaction,edited,empty};
    }
    return null;
}


module.exports={msgFormat}