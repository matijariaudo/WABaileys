


const msgFormat=(a)=>{
    const { key, message, messageTimestamp,pushName,reactions} = a;
    const {low:timestamp}=messageTimestamp || {low:""};
    let { conversation } = message || { conversation:""};
    let replyTo;let media;let deleted=false;
    if(!conversation){
        kind=Object.keys(message||{"":""})
        indice=kind.indexOf('extendedTextMessage');
        indiceMultimedia=kind.findIndex(a=> a=='imageMessage' || a=='audioMessage' || a=='videoMessage' || a=='stickerMessage' || a=='documentMessage' || a=='documentWithCaptionMessage');
        indiceProtocol=kind.findIndex(a=> a=='protocolMessage')
        //console.log(indiceMultimedia,indice,kind)
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
            deleted=true;
            //console.log(a)
        }
    }
    if(message){
        return {key,timestamp,conversation,pushName,replyTo,media,deleted,reactions};
    }
    return null;
}

module.exports={msgFormat}