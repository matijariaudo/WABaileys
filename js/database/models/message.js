const {Schema,model} = require('mongoose');

const messageSchema=Schema({
    remoteJid: {type:String},
    participant: {type:String},
    fromMe: Boolean,
    messageId: String,
    timestamp: Number,
    conversation: String,
    pushName: String,
    media: { media: String, caption: String },
    json:String,
    deleted: {messageId:String},
    edited: {messageId:String,conversation:String},
    replyTo: {messageId: String,senderId: String},
    reaction: {text:String,fromMe:Boolean,messageId:String},
    instanceId:{
        type:Schema.Types.ObjectId,
        ref:'instance',
        require:[true,"instanceId is requiered."]
    }
});

//quita el password de la rta
messageSchema.methods.toJSON= function(){
    const {__v,_id,... chat}=this.toObject();
    chat.uid=_id;
    return chat;
}

module.exports=model('Message',messageSchema)

