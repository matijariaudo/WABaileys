const express=require('express')
const { dbConnection } = require('../database/DBconfig.js')
require('dotenv').config()
const path=require('path');
const rateLimit = require('express-rate-limit');

class Server{
    constructor(){
        this.app=express();
        this.dbConnect()
        this.middlewares();
        this.server=require('http').createServer(this.app);
        this.routes();
        
    }

    async middlewares(){
        this.app.use(express.json());// Configuración del rate limiter
        this.limiter = rateLimit({
          windowMs: 1 * 60 * 1000, // 1 minuto
          max: 60, // Limita a 20 solicitudes por IP en el intervalo de tiempo establecido
          message: 'Too many requests from this IP, please try again after 1 minute'
        });
        // Aplicar el rate limiter
        this.app.use(this.limiter);
    }
    
    async dbConnect(){
        await dbConnection();
    }

    routes(){
        let id=""
        this.app.use(express.static(path.join(__dirname, "js")));
        this.app.use('/login',require('../routes/routersUser.js'));
        this.app.use('/api',require('../routes/routersInstances.js'));    // Ruta para servir index.html cuando la URL esté vacía
        this.app.use('/payment',require('../routes/routersPayment.js'));    // Ruta para servir index.html cuando la URL esté vacía
        
        //Web Site
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../../public', 'index.html'));
        });
        this.app.get('/app', (req, res) => {
            res.sendFile(path.join(__dirname, '../../public', 'app.html'));
        });
        this.app.get('/password', (req, res) => {
            res.sendFile(path.join(__dirname, '../../public', 'password.html'));
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
        this.app.get((req, res, next) => {
            res.status(404).sendFile(path.join(__dirname, '../../public', 'error.html'));
        });
    }



    async listen(){
        const port = process.env.PORT
        this.server.listen(port, () => {
            console.log(`App listening on port ${port}`);
            //createCharge("665b07474ace87d19fc20fd2",2500,'2024-07',1719879720,'Mensual invoice 4')
            //createCharge("665b07474ace87d19fc20fd2",3200,'2024-07',1719879720,'Mensual invoice 5')
        });
    }

}



module.exports={Server}