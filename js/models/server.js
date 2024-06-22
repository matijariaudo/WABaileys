const express=require('express')
const { dbConnection } = require('../database/DBconfig.js')
require('dotenv').config()
const path=require('path');

class Server{
    constructor(){
        this.app=express();
        this.dbConnect()
        this.middlewares();
        this.server=require('http').createServer(this.app);
        this.path={
            base:'/api'
        }
        this.routes();
    }

    middlewares(){
        this.app.use(express.json());
    }
    
    async dbConnect(){
        await dbConnection();
    }

    routes(){
        this.app.use(express.static(path.join(__dirname, "js")));
        this.app.use('/login',require('../routes/routersUser.js'));
        this.app.use('/api',require('../routes/routers.js'));    // Ruta para servir index.html cuando la URL esté vacía
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../../public', 'index.html'));
        });
        this.app.get('/app', (req, res) => {
            res.sendFile(path.join(__dirname, '../../public', 'app.html'));
        });
        this.app.get('/documentation', (req, res) => {
            res.sendFile(path.join(__dirname, '../../public', 'documentation.html'));
        });
        this.app.use(express.static('public'));
            // Ruta para capturar todas las demás y servir index.html (para aplicaciones SPA)
        this.app.get('/*', (req, res) => {
            res.sendFile(path.join(__dirname, '../../public', 'index.html'));
        });

        // Middleware para manejar rutas no encontradas y mostrar página de error
        this.app.use((req, res, next) => {
            res.status(404).sendFile(path.join(__dirname, '../../public', 'error.html'));
        });
    }


    async listen(){
        const port = process.env.PORT
        this.server.listen(port, () => {console.log(`App listening on port ${port}`)});
    }

}


module.exports={Server}