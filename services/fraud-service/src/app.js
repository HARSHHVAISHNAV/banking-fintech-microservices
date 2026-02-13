import express from 'express';
import fraudRoutes from './routes/fraud.routes.js';

const app = express();
app.use(express.json());

app.use("/api/fraud", fraudRoutes);

app.get('/health',(req,res)=>{
    res.json({ service: "fraud-service", status: "UP" });
})
export default app;