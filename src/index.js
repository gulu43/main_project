// require('dotenv').config({path: './env'})
import { app } from './app.js';
import dotenv from 'dotenv';

import connectDB from "./db/index.js";

dotenv.config({
    path: './env'
 })
connectDB()
.then(()=>{
    app.listen(process.env.PORT_NUMBER || 5210, ()=>{
        console.log(`Server is running ${process.env.PORT_NUMBER}`);
    })
    .on('error',()=>{
        console.error(` error in connection `);
        
    })
})
.catch((error) => console.log('mongo connection fails',error) )