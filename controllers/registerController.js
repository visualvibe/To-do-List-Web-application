var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var urlencondedParser = bodyParser.urlencoded({extended: false});

//Redirects to login if session ID is not found
const redirectLogin = (req, res, next) =>{
    if (!req.session.userID){
        res.redirect('/login');
    } else{
        next();
    }
};

//Redirects to home if session ID is found
const redirectHome = (req, res, next) =>{
    if (req.session.userID){
        res.redirect('/home');
    } else{
        next();
    }
};



//Connect to the database
mongoose.connect('mongodb+srv://test:test@cluster0-qejii.mongodb.net/test?retryWrites=true&w=majority', {useNewUrlParser: true });

//Create schemas
var todoSchema = new mongoose.Schema({
    item: String,
    day: String,
    time: String
    
});

var userSchema = new mongoose.Schema({
    username: {type: String, unique: true},
    password: {type: String},
    firstname: String,
    lastname: String,
    list: [todoSchema]
});

var Todo = mongoose.model('todo', todoSchema);
var User = mongoose.model('myuser', userSchema);

module.exports = function(app){
    const TWO_HOURS = 1000 * 60 * 60 * 2;
    const {
        PORT = 3000,
        NODE_ENV = 'development',
        SESS_NAME = 'sid',
        SESS_SECRET = 'xde',
        SESS_LIFETIME= TWO_HOURS
    }   =     process.env
    const IN_PROD = NODE_ENV === 'production'
    const session = require('express-session');

    app.use(session({
        name: SESS_NAME,
        resave: false,
        savedUnitialized: false,
        secret: SESS_SECRET,
        cookie:{
            maxAge: SESS_LIFETIME,
            sameSite: true,
            secure: IN_PROD
        }
    }));

    app.get('/', redirectHome, (req,res) =>{
        const userID  = req.session.userID;
        console.log(userID);
        res.render('s', {data: userID });
    });

    app.use(async(req, res, next) => {
        const userID = req.session.userID;
        
        ;
        //Populate userData with matching _id from Mongodb and attaches to res.locals.user to be used as session id
        if(userID){   
            var userData = []         
            await User.find({_id: userID}, (err, data) =>{
                data.forEach((value)=>{
                    userData.push(value);
                    });
            });
            res.locals.user = userData;
        }
        next();
    });

    app.get('/home', redirectLogin, (req, res) =>{
        const { user } = res.locals;
        res.render('home', {data: user});
    });

    app.get('/register', redirectHome, (req, res) =>{
        //Get data from mongodb and pass to view
        User.find({}, function(err, data){
            if(err) throw err;
            res.render('register', {users: data});
        });
        
    });

    app.get('/login', redirectHome, urlencondedParser, function(req, res){
        res.render('login');
    });

    app.post('/register', redirectHome, urlencondedParser, function(req, res){
        var username = req.body.username;
        var password = req.body.password;
        var firstname = req.body.firstname;
        var lastname = req.body.lastname;

        var newUser = new User();
        newUser.username = username;
        newUser.password = password;
        newUser.firstname = firstname;
        newUser.lastname = lastname;
        newUser.save(function(err, savedUser){
            if(err) throw err;
            res.redirect('/login');
 
            return res.status(200).send();
            res.json(savedUser);
            res.redirect();
        });
    });
    
    
    app.post('/login', redirectHome, urlencondedParser, (req,res) =>{
        
        var username = req.body.username;
        var password = req.body.password;
        
        
        //Finds user with matching password in MongoDB 
        User.findOne({username: username, password: password}, (err, user) => {
            
            if(user){
                console.log("success");
                console.log(user.id);
                req.session.userID = user.id;
                return res.redirect('/home');
               
            }

            console.log("invalid input");
            res.redirect('/login');
            

        });
        
    });

    app.post('/logout', redirectLogin, (req, res) =>{
        console.log("log out pressed")
        req.session.destroy(err => {
            if(err){
                return res.redirect('/home');
            }
            
            console.log("log out pressed");
            res.clearCookie(SESS_NAME);
            res.redirect('/login');
        });
    });


    app.post('/todo', urlencondedParser, (req, res) =>{
        //Get data from view and add to mongodb
        
        var userID = req.session.userID;
        var condition = { _id: userID};
        console.log(req.body.time);
        User.findOneAndUpdate(condition, {$push: {list: {item: req.body.item, day: req.body.day, time: req.body.time}} } , {upsert: true, safe: true, new: true}, (err, data)=>{
            if(err) throw err;
        });

        res.end();
    });

    app.delete('/todo/:item', (req, res) => {
        var userID = req.session.userID;
        //Deletes requested item
        var item = req.params.item;
        var newItem = item.replace(/-/g, " ");

        //Retrieves string after "Time: "
        var newTime = newItem.split("Time: ").pop();

        //Retrieves string before "Time: "
        var finalItem = newItem.substring(0, newItem.indexOf("Time:"));
        finalItem = finalItem.trim(); //Trims white spaces before/after string
        
        /* Turns strings to objects
        var x = JSON.parse(JSON.stringify({
            item: finalItem
        }));

        var y = JSON.parse(JSON.stringify({
            time: newTime
        }));
        */

        User.findOneAndUpdate({_id: userID}, {$pull: {list: {item: finalItem, time: newTime}} }, (err, data) =>{
            if(err) throw err;
        });
        res.end();
    });

};