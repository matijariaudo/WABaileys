const axios = require('axios');


const sendWebhook=(data,url)=>{
    axios.post(url, data,{
    headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(r => {
    console.log("Sent okay");
    })
    .catch(e => {
    console.error('Error al hacer la solicitud:', e.message);
    });
    return "ok"
}

module.exports={sendWebhook}
