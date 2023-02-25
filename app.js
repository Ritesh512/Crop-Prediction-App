const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportlocalmongoose = require('passport-local-mongoose');
const request = require('request-promise');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static("public"));

app.use(session({
    secret: 'My secert is you',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());




const connectDatabase = async () => {
    try {      
        await mongoose.connect("mongodb://0.0.0.0:27017/cropApp")
        console.log('Connected to mongodb database successfully!')
    } catch (err) {
        console.log(err)
    }
}
connectDatabase()


const userSchema = new mongoose.Schema({
    name:String,
    username:String,
    password:String,
    crops:Array
});

const userDb = new mongoose.Schema({
    username:String,
    des: Array
});


userSchema.plugin(passportlocalmongoose);
userDb.plugin(passportlocalmongoose);

const User = new mongoose.model("User",userSchema);
const UserDb = new mongoose.model("UserDb",userDb);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
passport.deserializeUser(function(id, done) {
    User.findById(id, function (err, user) {
      done(err, user);
    });
});

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/register",(req, res) => {
    res.render("register");
});

app.get("/login",(req, res) => {
    res.render("login");
});

app.get("/userpage",(req, res)=> {
    User.findById(req.user.id, function(err, foundUser){
        if(!err){
            if(foundUser){
                res.render("userpage",{Crops:foundUser.crops});
            }
        }else{
            console.log(err);
        }
    });
    
});

app.get("/addcrop",(req, res)=> {
    res.render("addcrop");
});

app.post("/addcrop",(req, res)=> {
    console.log(req.user);
    // const item = "rice";
    const Nitrogen = parseFloat(req.body.nt);
    const Phosphorus = parseFloat(req.body.pt);
    const Potassium = parseFloat(req.body.kt);
    const Temperature = parseFloat(req.body.temp);
    const Humadity = parseFloat(req.body.humadity);
    const Ph = parseFloat(req.body.ph);
    const Rainfall = parseFloat(req.body.rain);
    // const Ph = req.body.ph;

    let crop_val = [Nitrogen,Phosphorus,Potassium,Temperature,Humadity,Ph,Rainfall];
    User.findById(req.user.id, function(err, foundUser){
        if(!err){
            if(foundUser){
                
                predictres(crop_val,function(crop){
                    foundUser.crops.push(crop);
                    foundUser.save(function(err){
                        if(err){
                            console.log(err);
                            res.redirect("/userpage");
                        }else{
                            console.log("Successfully");
                        }
                    });
                    console.log("The reslut is: ",crop);
                
                });
                res.redirect("/userpage");

            }
        }else{
            console.log(err);
        }
    });
    
});

app.post("/register", function(req, res) {

    const newUser = new User({
        name:req.body.name,
        username:req.body.username
    });

    User.register(newUser,req.body.password,function(err,user){
        if(!err){
            passport.authenticate("local")(req,res,function(){
                res.redirect("/userpage");
            });
        }else{
            console.log(err)
            res.redirect("/register");
        }
    });
    

});

app.post("/login", function(req, res){
    const email = req.body.username;
    const password = req.body.password;

    const user = new User({
        username: email,
        password: password
    });

    req.login(user,function(err){
        if(!err){
            passport.authenticate("local")(req,res,function(){
                res.redirect("/userpage");
            });
        }else{
            console.log(err);
        }
    });

});

app.get("/userpage/:cropname",function(req,res){

    console.log(req.params.cropname);
    const cropname = (req.params.cropname).toLowerCase();

    User.findById(req.user.id, function(err, foundUser){
        if(!err){
            if(foundUser){
                UserDb.findOne({username:cropname}, function(err,crop){
                    if(!err){
                        console.log("successfully");
                        console.log(crop.username);
                        res.render("cropdetail",{cropname:crop.username,cropdes:crop.des});
                    }else{
                        console.log("error");
                        res.redirect("/userpage");
                    }
                });
            }
        }else{
            console.log("err");
            res.redirect("/userpage");
        }
    });
});

app.get("/compose",function(req, res){
    res.render("admincompose");
});

app.post("/compose",function(req,res){
    var des = [req.body.des1,req.body.des2,req.body.des3];
    const crops = new UserDb({
        username:(req.body.cropName).toLowerCase(),
        des:des
      });
      crops.save(function(err){
        if(!err){
          res.redirect("/");
          console.log("Successfully");
        }else{
            console.log("Error: " + err);
            res.redirect("/");
        }
      });
}); 


app.get("/logout", (req, res) => {
    req.logout(req.user, err => {
      if(err) return next(err);
      res.redirect("/");
    });
  });
  

app.listen(3000, function(){
    console.log('listening on port 3000');
});

async function predictres(arr,plant) { //plant is a function so that we can return value from async function

	var data = {
		array: arr
	}

	var options = {
		method: 'POST',

		// http:flaskserverurl:port/route
		uri: 'http://127.0.0.1:5000/predictres',
		body: data,
		json: true
	};

	var sendrequest = await request(options)
		.then(function (parsedBody) {
			
			crops = ['rice','maize','chickea','kidneybean','pigeonpea','mothbean','mungbean','blackgram','lentil','pomegranate','banana','mango','grapes','watermelon','muskmelon','apple','orange','papaya','coconut','cotton','jute','coffee'];
			let result;
			result = parsedBody['result'];
			console.log("The suggested Plant is: ", crops[result]);
            plant(crops[result]);
		})
		.catch(function (err) {
            console.log("Error:============================================================= ")
			console.log(err);
		});
}
