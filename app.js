const { Instance } = require("./js/database/models");
const { eliminarCarpetaAsync } = require("./js/helpers/deleteFolder");
const { sendEmail } = require("./js/helpers/sendEmail");
const { Server } = require("./js/models/server");
const { Wsp } = require("./js/models/wspClass");

const init=async()=>{
    const app=new Server()
    app.listen()
    const instances=await Instance.find({status:'active'});
    const wsp=new Wsp()
    instances.forEach(async e => {
        if(e.session=='connected'){
            const i1 =await wsp.createInstance(e.id);
            //await i1.getContacts();
        }else{
            console.log(1)
            await eliminarCarpetaAsync(e.id);
        }
    });
}

//var mail = sendEmail({email:'mageaipty@gmail.com',subject:'Holaaa',body:`<h1>Hola Bombon</h1><p>Como estas?</p>`})

init()



