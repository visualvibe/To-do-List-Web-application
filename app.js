var express = require('express');
var todoController = require('./controllers/todoController');
var registerController = require('./controllers/registerController');
var cookieParser = require('cookie-parser');
var app = express();



//Sets up template engine
app.set('view engine', 'ejs');

//Static files
app.use(express.static('./public'));
app.use(cookieParser());


//Start controllers
todoController(app);
registerController(app);



//Listen to port
app.listen(3000);
console.log('Your are listing to port 3000');