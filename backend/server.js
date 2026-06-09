const express = require("express");
const cors = require("cors");
require("dotenv").config();

const segmentRoutes = require("./routes/segmentRoutes");
const aiRoutes = require("./routes/aiRoutes");
const statsRoutes = require("./routes/statsRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api", segmentRoutes);
app.use("/api", aiRoutes);
app.use("/api", statsRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`RailGuard backend running on port ${PORT}`);
});
