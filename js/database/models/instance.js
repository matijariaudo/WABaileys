const {Schema,model} = require('mongoose')

const instanceSchema=Schema({
    name:{type:String,default:"-",require:[true,"Name is required."]},
    user:{type:Schema.Types.ObjectId,ref:'usuario'},
    session:{type:String,default:"close"},
    number:{type:Number},
    webhook:{type:String},
    plan:{type:Number},
    app:{type:String,default:"whatsapp",enum:["whatsapp","instagram","live"]},
    type:{type:String,default:"full",enum:["trial","free","full"]},
    status:{type:String,default:"active"},
    start:{type:Number},
    end:{type:Number}
});

instanceSchema.methods.toJSON= function(){
    const {__v,_id,... instance}=this.toObject();
    instance.instanceId=_id;
    return instance;
}

module.exports=model('Instance',instanceSchema)