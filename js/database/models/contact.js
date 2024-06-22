const {Schema,model} = require('mongoose');

const contactSchema=Schema({
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
    name:{
        type:String,
        default: "-"
    }
});

//quita el password de la rta
contactSchema.methods.toJSON= function(){
    const {__v,_id,... contact}=this.toObject();
    contact.uid=_id;
    return contact;
}

module.exports=model('Contact',contactSchema)

