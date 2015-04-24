var loopback = require('loopback');
var boot = require('loopback-boot');



/// THIS IS BECAUSE SOME CERT ERROR WTFD?!?!?!?!?!??!
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
var app = module.exports = loopback();




// Passport configurators..
var loopbackPassport = require('loopback-component-passport');
var PassportConfigurator = loopbackPassport.PassportConfigurator;
var passportConfigurator = new PassportConfigurator(app);

/*
 * body-parser is a piece of express middleware that
 *   reads a form's input and stores it as a javascript
 *   object accessible through `req.body`
 *
 */
var bodyParser = require('body-parser');

/**
 * Flash messages for passport
 *
 * Setting the failureFlash option to true instructs Passport to flash an
 * error message using the message given by the strategy's verify callback,
 * if any. This is often the best approach, because the verify callback
 * can make the most accurate determination of why authentication failed.
 */
var flash      = require('express-flash');

app.middleware('session', loopback.session({ saveUninitialized: true,
  resave: true, secret: 'secret' }));


// attempt to build the providers/passport config
var config = {};
try {
	config = require('../providers.json');
} catch (err) {
	console.trace(err);
	process.exit(1); // fatal
}

// Set up the /favicon.ico
app.use(loopback.favicon());

// request pre-processing middleware
app.use(loopback.compress());

// -- Add your pre-processing middleware here --

// Setup the view engine (jade)
var path = require('path');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// boot scripts mount components like REST API
boot(app, __dirname);

// to support JSON-encoded bodies
app.use(bodyParser.json());
// to support URL-encoded bodies
app.use(bodyParser.urlencoded({
	extended: true
}));

// The access token is only available after boot
app.use(loopback.token({
  model: app.models.accessToken
}));


passportConfigurator.init();

// We need flash messages to see passport errors
app.use(flash());

passportConfigurator.setupModels({
	userModel: app.models.user,
	userIdentityModel: app.models.userIdentity,
	userCredentialModel: app.models.userCredential
});
for (var s in config) {
	var c = config[s];
	c.session = c.session !== false;
	passportConfigurator.configureProvider(s, c);
}
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;

app.get('/', function (req, res, next) {
  res.render('pages/index', {user:
    req.user,
    url: req.url
  });
});

app.get('/auth/account', ensureLoggedIn('/login.html'), function (req, res, next) {
  res.render('pages/loginProfiles', {
    user: req.user,
    url: req.url
  });
});


app.get('/signup', function (req, res, next){
  res.render('pages/signup', {
    user: req.user,
    url: req.url
  });
});

app.post('/signup', function (req, res, next) {
  var User = app.models.user;
  var newUser = {};
  newUser.email = req.body.email.toLowerCase();
  newUser.username = req.body.username.trim();
  newUser.password = req.body.password;

  User.create(newUser, function (err, user) {
    if (err) {
      req.flash('error', err.message);
      return res.redirect('back');
    } else {
      // Passport exposes a login() function on req (also aliased as logIn())
      // that can be used to establish a login session. This function is
      // primarily used when users sign up, during which req.login() can
      // be invoked to log in the newly registered user.
      req.login(user, function (err) {
        if (err) {
          req.flash('error', err.message);
          return res.redirect('back');
        }
        return res.redirect('/auth/account');
      });
    }
  });
});

app.get('/auth/logout', function (req, res, next) {
  req.logout();
  res.redirect('/');
});


// CALLS TO BACKEND
var request = require("request");
var unirest = require("unirest");
app.get('/reservetime', ensureLoggedIn('/login.html'), function (req, res, next) {
  console.log("MAGNUS LAVER IDIOT DUMME DEBUG BESKEDER.")
  var available_comps = req.query.available.split(",");
  res.render("pages/reservetime",{"available":available_comps,startDate:req.query.startDate,finishDate:req.query.finishDate});
});

app.get("/makereservation", ensureLoggedIn("/login.html"), function(req,res,next) {
  var startDate = req.query.startDate
  var finishDate = req.query.finishDate
  var computerId = req.query.comp
  var clientId = req.user.profiles[0].userId
  console.log(req.user.profiles[0])
  console.log(clientId)
  var token = "?access_token=" + req.user.profiles[0].credentials.accessToken

  unirest.post("https://localhost:3000/api/reservations" + token)
  .header("Content-type", "application/json")
  .send({"startDate":startDate,
         "finishDate": finishDate,
         "clientId": clientId,
         "computerId": computerId,
         "description": "fuckin' a"})
  .end(function(response) {
    console.log("hello")
    console.log(response)
    res.redirect("/auth/account")
  })
})

app.post('/reservetime', ensureLoggedIn('/login.html'), function (req, res, next) {
  console.log("Posted to frontends reservetime")
  var start_date_list = req.body.startDate.split(",")
  var finish_date_list = req.body.finishDate.split(",")
  if (start_date_list.length != 4 || finish_date_list.length != 4) {console.log("User gave us wrong dates")};
  var startDate = new Date(start_date_list[0],start_date_list[1],start_date_list[2],start_date_list[3],0,0,0)
  var finishDate = new Date(finish_date_list[0],finish_date_list[1],finish_date_list[2],finish_date_list[3],0,0,0)

  console.log(req.user.profiles[0].credentials.accessToken)
  var token = "?access_token=" + req.user.profiles[0].credentials.accessToken

  unirest.post('https://localhost:3000/api/reservations/available' + token)
  .header("Content-type", "application/json")
  .send({"startDate":startDate,
         "finishDate":finishDate})
  .end(function (response) {
    console.log(response.body);
    var qstring = "?available=" + response.body.available.join();
    console.log(qstring);
    res.redirect("/reservetime" + qstring + "&startDate=" + startDate + "&finishDate=" + finishDate)
  });


});


// -- Mount static files here--
// All static middleware should be registered at the end, as all requests
// passing the static middleware are hitting the file system
// Example:
var path = require('path');
app.use(loopback.static(path.resolve(__dirname, '../client/public')));

// Requests that get this far won't be handled
// by any middleware. Convert them into a 404 error
// that will be handled later down the chain.
app.use(loopback.urlNotFound());

// The ultimate error handler.
app.use(loopback.errorHandler());

app.start = function() {
	// start the web server
	return app.listen(function() {
		app.emit('started');
		console.log('Web server listening at: %s', app.get('url'));
	});
};

// start the server if `$ node server.js`
if (require.main === module) {
	app.start();
}
