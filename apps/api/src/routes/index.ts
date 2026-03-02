import { Router } from "express";

import usersRouter from "./v1/users";
import sitesRouter from "./v1/sites";

const v1Router = Router();

v1Router.use('/users', usersRouter);
v1Router.use('/sites', sitesRouter);

export default v1Router;