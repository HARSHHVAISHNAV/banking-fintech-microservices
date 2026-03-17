import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT || 4004;

app.listen(PORT,() =>{
    console.log(`Notification Service running on port ${PORT}`);
});