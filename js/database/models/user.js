const {Schema,model} = require('mongoose');
const { generarCodigoAleatorio } = require('../../helpers/aleatoryGen');

const apiSchema=Schema({
    name:{type:String,require:[true,'You must define a name']},
    password:{type:String,default:generarCodigoAleatorio(25)},
    status:{type:String,default:'active',enum:['active','deleted','paused']}
})

const userSchema=Schema({
    nombre:{
        type:String,
        default:"-",
        require:[true,"El nombre es obligatorio."]
    },
    correo:{
        type:String,
        require:[true,"El correo electrónico es obligatorio"],
        unique:true
    },
    email_valid:{
        type:Boolean,
        default:false
    },
    clave:{
        type:String,
        default:"-",
        require:[true,"La clave es obligatoria"],
    },
    img:{
        type:String,
        default:"-"
    },
    rol:{
        type:String,
        default:"USER_ROLE",
        require:true,
        emun:['USER_ROLE','SELLER_ROLE','ADMIN_ROLE']
    },
    plan:{
        type:Number,
        default:0
    }
    ,
    google:{
        type:Boolean,
        default:false
    },
    payment_session:{
        type:String,
        default:""
    },
    payment_customer:{
        type:String,
        default:""
    },
    payment_subscription:{
        type:String,
        default:""
    },
    apiPass:[apiSchema],
    estado:{
        type:Boolean,
        default:true
    }
});

//quita el password de la rta
userSchema.methods.toJSON= function(){
    const {__v,clave,_id,apiPass,... user}=this.toObject();
    user.uid=_id;
    user.apiPass=apiPass.filter(a=> a.status=='active').map(a=> {return {id:a._id,name:a.name}})
    user.password=clave!="-"?true:false;
    return user;
}

module.exports=model('User',userSchema)

