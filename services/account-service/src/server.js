import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT || 4001;

app.listen(PORT, () => {
  console.log(`Account Service running on port ${PORT}`);
});