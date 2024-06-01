const sharp = require('sharp');

async function comprimirImagen(buffer) {
    try {
        // Comprimir la imagen en memoria
        const imagenComprimida = await sharp(buffer).resize(300).jpeg({ quality: 25 }).toBuffer();
        // Devolver la imagen comprimida como un nuevo buffer
        return imagenComprimida;
    } catch (error) {
        console.error('Error al comprimir la imagen:', error);
        throw error; // Reenviar el error para manejarlo fuera de la función si es necesario
    }
}

module.exports={comprimirImagen}