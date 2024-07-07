const { Instance } = require("./js/database/models");
const { checkFolder } = require("./js/helpers/checkFolder");
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
    const instancesActive=instances.filter(a=>a.session=='connected');
    instancesActive.forEach(async e => {await wsp.createInstance(e.id,{});});
    instancesActive.forEach(async e => {await wsp.createInstance(e.id+"_2",{});});
    const instancesNonActive=instances.filter(a=>a.session!='connected');
    for (let x = 0; x < instancesNonActive.length; x++) {
        const e=instancesNonActive[x];
        try {
            await wsp.createInstance(e.id,{QrBlock:true});
        } catch (error) {
            await wsp.deleteInstance(e.id);
            console.log(error)   
        }
        await delayTime(333);
    };
}

init()




