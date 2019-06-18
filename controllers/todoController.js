var bodyParser = require('body-parser');
var urlencondedParser = bodyParser.urlencoded({extended: false});
var mongoose = require('mongoose');

//Connect to the database
mongoose.connect('mongodb+srv://test:test@cluster0-qejii.mongodb.net/test?retryWrites=true&w=majority', {useNewUrlParser: true });

/*
//Create schema 
var todoSchema = new mongoose.Schema({
    item: String
});

var Todo = mongoose.model('Todo', todoSchema);
*/

module.exports = function(app){

    /*
    app.get('/todo', (req, res) =>{
        //Get data from mongodb and pass to view
        
        Todo.find({}, function(err, data){
            if(err) throw err;
            res.render('todo', {todos: data});
        });
       
        
    });

    app.post('/todo', urlencondedParser, (req, res) =>{
        //Get data from view and add to mongodb
        var newTodo = Todo(req.body).save(function(err, data){
            if(err) throw err;
            res.json(data);
        });

    });

    app.delete('/todo/:item', (req, res) => {
        //Deletes requested item
        Todo.find({item: req.params.item.replace(/\-/g, " ")}).remove(function(err, data){
            if(err) throw err;
            res.json(data);
        });

    });
    */

};