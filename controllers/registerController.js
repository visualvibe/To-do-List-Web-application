var mongoose = require('mongoose');
var bodyParser = require('body-parser');
const webpush = require('web-push');
var urlencondedParser = bodyParser.urlencoded({extended: false});
require('dotenv').config();

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
const todoSchema = new mongoose.Schema({
    item: String,
    day: String,
    time: String
    
});

const subscriberSchema = new mongoose.Schema({
    endpoint: String,
    expirationTime: Date,
    keys: mongoose.Schema.Types.Mixed,
    createDate: {
        type: Date,
        default: Date.now
    }
});

const userSchema = new mongoose.Schema({
    username: {type: String, unique: true},
    password: {type: String},
    firstname: String,
    lastname: String,
    list: [todoSchema],
    subs: [subscriberSchema],
    hasEvents: {type: Boolean, default: false}
});



const Todo = mongoose.model('todo', todoSchema);
const User = mongoose.model('myuser', userSchema);
const Subs = mongoose.model('subscribers', subscriberSchema);
const publicVapidKey = 'BJgvS400qhBCKFjWuwzE-GkU1stRIypVHCwdriwm998Wv8GwvFjQlQgXt2CtFsAab-otubMKwNW-SS46BMcWNcE';
const privateVapidKey = 'oU6CuK0WyJcYofzgvce2YlQVjETx_JGscCXMaM1b7gc';
webpush.setVapidDetails('mailto:bjornedale@gmail.com', publicVapidKey, privateVapidKey);

var today = new Date();
var curHr = today.getHours();
var curMin = today.getMinutes();
var curDa = today.getDay();
const weekday = [];
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

    
    const sendNotification = (subscription, dataToSend) => {
        webpush.sendNotification(subscription, dataToSend).catch(error => {
            console.error(error.stack);
        });
    };

    app.post('/save', urlencondedParser, async (req, res) => {
        const subscription = req.body;
        const { user } = res.locals;
        await saveToDatabase(subscription, user); //Method to save the subscription to Database
        res.json({ message: 'success' });
    });

    //Function to make notification send to local 
    const makeNotification = async (user) =>{

        const x = { 
            endpoint: user.subs.endpoint,
            expirationTime: null,
            keys: {
                p256dh: user.subs.keys.p256dh,
                auth: user.subs.keys.auth
            }
        };

        const message = {
            title: "hello",
            message: "Hello " + user.name + ", you have to " + user.list.item + " at " + user.list.time,
            icon: "/assets/icon.png",
            vibrate: [100, 100, 100]
        };
        const pushPayload = JSON.stringify(message);
        sendNotification(x, pushPayload);
    }

    //Automatic function that runs every 5 seconds
    //Sends notifications to users with Subscriptions 
    setInterval(async function(){     
       var e = [];
       e = await User.find({}, (err, data) =>{
           //console.log(data);
           return data;
       });

       var newTime, newMinute;
       var upcomingEvents = [];

       //Adds to upcomingEvents array if any upcoming events in database for User
       for(var x = 0; x < e.length; x++){
        for(var i=0; i < e[x].list.length; i++){
            newTime = e[x].list[i].time.substring(0,2);
            var y = parseInt(newTime);
            if(curDay === e[x].list[i].day){
                if(curHr === y && curMin < yy){
                    upcomingEvents.push({name: e[x].username, list: {item: e[x].list[i].item, day: e[x].list[i].day, time: e[x].list[i].time}, 
                        subs: {endpoint: e[x].subs[0].endpoint, keys: {p256dh: e[x].subs[0].keys.p256dh, auth: e[x].subs[0].keys.auth}}});
                    break;
                }
                if(curHr+1 === y || curHr+2 === y){
                    upcomingEvents.push({name: e[x].username, list: {item: e[x].list[i].item, day: e[x].list[i].day, time: e[x].list[i].time}, 
                        subs: {endpoint: e[x].subs[0].endpoint, keys: {p256dh: e[x].subs[0].keys.p256dh, auth: e[x].subs[0].keys.auth}}});
                    //console.log(e[x].subs[0])
                    }
                }
            }
        }

        for(var i = 0; i < upcomingEvents.length; i++){
            makeNotification(upcomingEvents[i]);
        }

    }, 30000); //30 seconds
    

   

    const saveToDatabase = async (subscription, user) => {
        //Saves subscription to matching user id into database
        //Using $set so only one sub can exist at one time for any given user
        await User.findOneAndUpdate({_id: user[0]._id}, {$set: {subs: {endpoint: subscription.endpoint, expirationTime: null, keys: {p256dh: subscription.keys.p256dh, auth: subscription.keys.auth}}}}, (err, data) =>{
            if(err) throw err;
      
        });
    };

    
    app.get('/', redirectHome, (req,res) =>{
        const userID  = req.session.userID;
        console.log(userID);
        res.render('s', {data: userID });
    });
    
    app.get('/home', redirectLogin, async (req, res) =>{
        const { user } = res.locals;

        //Always sets hasEvents field for user to false
        await User.findOneAndUpdate({_id: user[0]._id}, {$set: {hasEvents: false}}, (err, data) => {
            if(err) throw err;
        });

        //Retrieves the user's subscription info from database
        const subscription = await User.findOne({_id: user[0]._id}, (err, data) =>{
            return data;
        });

        var newTime, newMinute;
        var upcomingEvents = [];
 
        //Adds to upcomingEvents array if any upcoming events in database for User
        for(var i=0; i < user[0].list.length; i++){
            newTime = user[0].list[i].time.substring(0,2);
            newMinute = user[0].list[i].time.split(":").pop().substring(0,2);
            var y = parseInt(newTime);
            var yy = parseInt(newMinute);
            if(curDay === user[0].list[i].day){ //Checks if list day is matching current day
                if(curHr === y && curMin < yy){
                    upcomingEvents.push(user[0].list[i]);
                    break;
                }
                if((curHr+1 === y || curHr+2 === y) ){ // Checks if current hour is within two hours of list time & if the current minute is less than list minute
                    upcomingEvents.push(user[0].list[i]);
                }
            }
        }

        //If any upcoming events, trigger pusher notification
        if(upcomingEvents === undefined || upcomingEvents.length === 0){
            console.log("empty");
     
        } else { 
            await User.findOneAndUpdate({_id: user[0]._id}, {$set: {hasEvents: true}}, (err, data) => {
                if(err) throw err;
            });

            //Places the subscription data into proper format in x variable
            const x = { 
                endpoint: subscription.subs[0].endpoint,
                expirationTime: null,
                keys: {
                    p256dh: subscription.subs[0].keys.p256dh,
                    auth: subscription.subs[0].keys.auth
                }
            };
            
          
            //Payload of the push message
            for(var i = 0; i < upcomingEvents.length; i++){
            const message = {
                title: "hello",
                message: "Hello " + user[0].username + ", you have to " + upcomingEvents[i].item + " at " + upcomingEvents[i].time,
                icon: "/assets/icon.png"
            };
            const pushPayload = JSON.stringify(message);
            sendNotification(x, pushPayload);
            }
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

        res.send('');
        //res.end();
    });

};