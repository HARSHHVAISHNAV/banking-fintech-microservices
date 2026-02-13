import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT || 4003;

app.listen(PORT, () => {
  console.log(`Fraud Service running on port ${PORT}`);
});