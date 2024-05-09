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
        this.app.use('/api',require('../routes/routers.js'));
        this.app.use(express.static('public'));
    }


    async listen(){
        const port = process.env.PORT
        this.server.listen(port, () => {console.log(`App listening on port ${port}`)});
    }

}


module.exports={Server}