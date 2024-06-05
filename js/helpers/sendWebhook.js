const axios = require('axios');


const sendWebhook=(data,url)=>{
    console.log("Enviando ",url,data)
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
}

module.exports={sendWebhook}
