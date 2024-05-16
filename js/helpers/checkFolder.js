const fs = require('fs');

async function checkFolder(ruta) {
    try {
        // Verificar si la carpeta existe
        const existeCarpeta = await fs.promises.stat(ruta).then(stats => stats.isDirectory()).catch(() => false);

        if (!existeCarpeta) {
            // Si la carpeta no existe, crearla
            await fs.promises.mkdir(ruta, { recursive: true });
            console.log(`Carpeta "${ruta}" creada correctamente.`);
        } else {
            console.log(`La carpeta "${ruta}" ya existe.`);
        }
    } catch (error) {
        console.error(`Error al verificar o crear la carpeta "${ruta}":`, error);
    }
}

module.exports={checkFolder}