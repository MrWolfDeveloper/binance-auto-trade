const Express = require('express');
const Router = Express.Router();

// Load first page
Router.get('/system', (Request, Response) => {
    Response.render('index');
});

module.exports = Router;
