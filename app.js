const { Instance } = require("./js/database/models");
const { checkFolder } = require("./js/helpers/checkFolder");
const { eliminarCarpetaAsync } = require("./js/helpers/deleteFolder");
const { sendEmail } = require("./js/helpers/sendEmail");
const { sendWebhook } = require("./js/helpers/sendWebhook");
const { Server } = require("./js/models/server");
const { Wsp } = require("./js/models/wspClass");

function delayTime(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const init=async()=>{
    const app=new Server()
    app.listen()
    const instances=await Instance.find({status:'active'});
    const wsp=new Wsp();
    await checkFolder('./auth_wp');
    await checkFolder('./cache_wp')
    const instancesActive=instances.filter(a=>a.session=='active');
    instancesActive.forEach(async e => {await wsp.createInstance(e.id,{});});
    const instancesNonActive=instances.filter(a=>a.session!='active');
    for (let x = 0; x < instancesNonActive.length; x++) {
        const e=instancesNonActive[x];
        await wsp.createInstance(e.id,{QrBlock:true});
        await delayTime(333);
    };
}

init()




