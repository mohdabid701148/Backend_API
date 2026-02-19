import db_connect from "./config/db_connect.js";
import app from "./app.js";
db_connect()
.then(()=>{
    app.on("error",(error)=>{
        console.log("errr",error);
        throw error;
    })
    app.listen(process.env.PORT||8000,()=>{
        console.log(`server is running at port ${process.env.PORT}`)
    })
})
.catch((err)=>{
    console.log("database connection failed",err);
    process.exit(1);
})
