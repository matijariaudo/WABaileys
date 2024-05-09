// Connection
const mongoose = require('mongoose');
require('dotenv').config()


const dbConnection=async()=>{
  try {
    mongoose.set('strictQuery', true);  
    await mongoose.connect(process.env.MONGO,{});
    console.log("Base de datos conectada");
  }catch(error){
    console.log("Error en la conexion a Base de datos",error)  
  }
}

module.exports={dbConnection}