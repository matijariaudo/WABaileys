const {Schema,model} = require('mongoose');

const chatSchema=Schema({
    instanceId:{
        type:Schema.Types.ObjectId,
        ref:'instance',
        require:[true,"instanceId is requiered."]
    },
    remoteJid:{
        type:String,
        default:"-",
        require:[true,"remoteJid is requiered."]
    },
    conversationTimestamp:{
        type:Number,
        default: Date.now
    }
});

//quita el password de la rta
chatSchema.methods.toJSON= function(){
    const {__v,_id,... chat}=this.toObject();
    chat.uid=_id;
    return chat;
}

module.exports=model('Chat',chatSchema)

