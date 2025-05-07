import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';


let app = express();
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

// form
app.use(express.json({limit: '16kb'}))
// url
app.use(express.urlencoded({extended: true, limit: '16kb'}))
// for files and folder
app.use(express.static('public'))
//cookie 
app.use(cookieParser())    

// routes import
import userRouter from "./routes/user.routes.js";

app.use("/api/v1/users/",userRouter)

export {app};