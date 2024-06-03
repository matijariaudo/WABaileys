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
    apiPass:[apiSchema],
    estado:{
        type:Boolean,
        default:true
    }
});

//quita el password de la rta
userSchema.methods.toJSON= function(){
    const {__v,clave,_id,... user}=this.toObject();
    user.uid=_id;
    return user;
}

module.exports=model('User',userSchema)

