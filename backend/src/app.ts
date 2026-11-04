import express from "express";
import cors from "cors";
import { frontendOrigin } from "./config.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFound } from "./middlewares/notFound.js";
import { originGuard } from "./middlewares/originGuard.js";
import { routes } from "./routes/index.js";
export const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: frontendOrigin, credentials: true }));
app.use(originGuard);
app.use(express.json({ limit: "1mb" }));
app.use((_request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  next();
});
app.use(routes);
app.use(notFound);
app.use(errorHandler);
