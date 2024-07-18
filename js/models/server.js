const express=require('express')
const { dbConnection } = require('../database/DBconfig.js')
require('dotenv').config()
const path=require('path');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
class Server{
    constructor(){
        this.app=express();
        this.dbConnect()
        this.middlewares();
        this.server=require('http').createServer(this.app);
        this.routes();
        
    }

    async middlewares(){
        this.app.use(cors())
        this.app.use(express.json());// Configuración del rate limiter
        this.limiter = rateLimit({
          windowMs: 1 * 60 * 1000, // 1 minuto
          max: 60, // Limita a 20 solicitudes por IP en el intervalo de tiempo establecido
          message: 'Too many requests from this IP, please try again after 1 minute'
        });
        
        // Aplicar el rate limiter
        this.app.use('/api', this.limiter);
        this.app.use('/login', this.limiter);
        this.app.use('/payment', this.limiter);
        // Middleware para sanitizar todas las entradas
        

    }
    
    async dbConnect(){
        await dbConnection();
    }

    routes(){
        // Rutas de archivos estáticos
        this.staticLimiter = rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minuto
        max: 500, // Limita a 500 solicitudes por IP en el intervalo de tiempo establecido
        message: 'Too many requests for static resources from this IP, please try again after 1 minute'
        });

        // Middleware para aplicar el rate limiter a archivos estáticos
        this.app.use(express.static('public', {
        setHeaders: (res, path, stat) => {
            this.staticLimiter(res.req, res, () => {});
            }
        }));

        

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

        // Ruta para capturar todas las demás y servir index.html (para aplicaciones SPA)
        this.app.get('/*', (req, res) => {
            res.sendFile(path.join(__dirname, '../../public', 'index.html'));
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

