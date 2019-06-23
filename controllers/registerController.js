var mongoose = require('mongoose');
var bodyParser = require('body-parser');
const webpush = require('web-push');
var urlencondedParser = bodyParser.urlencoded({extended: false});
require('dotenv').config();
var Pusher = require('pusher');

var pusher = new Pusher({
    appId: '809187',
    key: '476638bb1e08a818596f',
    secret: '960d5d2552f235f80f27',
    cluster: 'us3',
    encrypted: true
  });




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
mongoose.set('useCreateIndex', true);

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
const publicVapidKey = 'BNZdm5dNfM83gRZsBNDxCloXHjEcsXWydw47hLHkdXvEVGAzin7YatXzboNHYTzQSRscv9FmXFa3zfTRW4yMSm4';
const privateVapidKey = 'QFYvf8iP7lXIx67tcu62ZKPj22zH1vFONYUmqZ9UDwg';

webpush.setVapidDetails('mailto:test@test.com', publicVapidKey, privateVapidKey);


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
        saveUninitialized: false,
        secret: SESS_SECRET,
        cookie:{
            maxAge: SESS_LIFETIME,
            sameSite: true,
            secure: IN_PROD
        }
    }));

    /*
    app.post('/home', urlencondedParser, (req, res) =>{
       
        const subscription = req.body;
        // Send 201 - resource created
        res.status(201).json({});

        //Create payload
        const payload = JSON.stringify({ title: 'Push Test'});

        //Pass Object into SendNotification
        webpush.sendNotification(subscription, payload).catch(error => {
            console.error(error.stack);
        });
    
    });
    */

    app.get('/', redirectHome, (req,res) =>{
        const userID  = req.session.userID;
        console.log(userID);
        res.render('s', {data: userID });
    });

    app.use(async(req, res, next) => {
        const userID = req.session.userID;
        
        //Populate userData with matching _id from Mongodb and attaches to res.locals.user to be used as session id
        if(userID){
            var userData = [];     
            res.locals.user = await User.find({_id: userID}, (err, data) =>{
                data.forEach((value)=>{
                    userData.push(value);
                });
                return userData;
            });
        }
        next();
    });

    app.get('/home', redirectLogin, (req, res) =>{
        const { user } = res.locals;

        var today = new Date();
        var curHr = today.getHours();
        var curDa = today.getDay();
        var newTime;
        var upcomingEvents = [];
        var weekday = [];
            weekday[0] =  "Sunday";
            weekday[1] = "Monday";
            weekday[2] = "Tuesday";
            weekday[3] = "Wednesday";
            weekday[4] = "Thursday";
            weekday[5] = "Friday";
            weekday[6] = "Saturday";
        var curDay = weekday[curDa];

        if(curHr >= 12){
            curHr = curHr-12;
        }
        if(curHr === 0){
            curHr = 12;
        }

        for(var i=0; i < user[0].list.length; i++){
            newTime = user[0].list[i].time.substring(0,2);
            var y = parseInt(newTime);
            if(curDay === user[0].list[i].day){
                if(curHr+1 === y || curHr+2 === y){
                    upcomingEvents.push(user[0].list[i]);

                }
            }
        }

        if(upcomingEvents === undefined || upcomingEvents.length === 0){
            console.log("empty");
            //res.render('home', {data: user});
        } else { 
            console.log(upcomingEvents[0]);
            pusher.trigger(`os-${user[0]._id}`, 'ox', {title: "test", message: "hello world"});
            //res.render('home2', {data: user, event: upcomingEvents});
        }
        
       res.render('home', {data: user, event: upcomingEvents});
    });

    //Renders registration page
    app.get('/register', redirectHome, (req, res) =>{
        //Get data from mongodb and pass to view
        User.find({}, function(err, data){
            if(err) throw err;
            res.render('register', {users: data});
        });
        
    });

    //Renders login page
    app.get('/login', redirectHome, urlencondedParser, function(req, res){
        res.render('login');
    });

    //POST method when user click register button
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
    
    //POST method when user clicks login button
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
        var hour = parseInt(req.body.time.substring(0,2));
        var minutes = req.body.time.split(":").pop();
        var isAM = true;
        var time;

        //Adjusts 24 hour time to 12 hour time
        if(hour > 12){
            hour = hour-12;
            isAM = false;
        }
        if(hour === 12){
            isAM = false;
        }
        if(hour === 0){
            hour = 12;
        }
        
        //If isAM = true, then concanete the variables to display AM time and vice versa for PM
        if(isAM === true){
            time = hour + ":" + minutes + " AM";
        } else { time = hour + ":" + minutes + " PM"}
        
    

        User.findOneAndUpdate(condition, {$push: {list: {item: req.body.item, day: req.body.day, time: time}} } , {upsert: true, safe: true, new: true}, (err, data)=>{
            if(err) throw err;
        });

        res.end();
    });

    app.delete('/todo/:item', (req, res) => {
        var userID = req.session.userID;

        console.log(req.params.item);
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
      

        pusher.trigger('my-channel', 'my-event', {"message": "hello"}, req.headers['X-Socket-Id']);

        res.send('');
        //res.end();
    });

};