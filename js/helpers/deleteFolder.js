const fs = require('fs-extra');

async function eliminarCarpetaAsync(id) {
    const ruta="auth_wp/session_"+id;
    const rutaFile="cache_wp/baileys_"+id+".json";
    console.log(ruta,rutaFile)
    try {
        console.log("Eliminar directorios.")
        const file=true;const directory=true; 
        if (!fs.existsSync(ruta)){console.log('La carpeta NO existe.');}else{await fs.remove(ruta);}
        if (!fs.existsSync(rutaFile)){console.log('El archivo NO existe.');}else{await fs.unlink(rutaFile);}
        if (!fs.existsSync(ruta)){console.log("El directorio asociado a "+id+" no existe.")}
        if (!fs.existsSync(rutaFile)){console.log("El archivo asociado a "+id+" no existe.")}
        return true;
    } catch (error) {
        console.log("Error carpeta")
        return false
    }
}

module.exports={eliminarCarpetaAsync}



