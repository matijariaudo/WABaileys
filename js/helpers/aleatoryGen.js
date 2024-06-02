
 const generarCodigoAleatorio=(nro=4)=>{
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789°!"#$%&/()=?¡¿@';
    let codigo = '';
  
    for (let i = 0; i < nro; i++) {
      const randomIndex = Math.floor(Math.random() * caracteres.length);
      codigo += caracteres.charAt(randomIndex);
    }
    return codigo;
}

module.exports={generarCodigoAleatorio}