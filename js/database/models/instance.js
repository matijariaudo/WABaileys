const {Schema,model} = require('mongoose')

const instanceSchema=Schema({
    name:{type:String,default:"-",require:[true,"Name is required."]},
    user:{type:Schema.Types.ObjectId,ref:'usuario'},
    session:{type:String,default:"close"},
    number:{type:Number},
    webhook:{type:String},
    plan:{type:Number},
    status:{type:String,default:"active"},
    start:{type:Number},
    end:{type:Number}
});
instanceSchema.methods.toJSON= function(){
    const {__v,_id,... campain}=this.toObject();
    campain.uid=_id;
    return campain;
}

module.exports=model('Instance',instanceSchema)