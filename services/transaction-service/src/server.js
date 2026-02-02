import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT || 4002;

app.listen(PORT, () => {
  console.log(`Transaction Service running on port ${PORT}`);
});