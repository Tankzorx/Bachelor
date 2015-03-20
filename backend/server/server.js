var loopback = require('loopback');
var boot = require('loopback-boot');
var https = require('https');
var oauth2 = require('loopback-component-oauth2');
var path = require('path');
var site = require('./site');

/// THIS IS BECAUSE SOME CERT ERROR WTFD?!?!?!?!?!??!
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";




var app = module.exports = loopback();



var sslCert = require('./private/ssl_cert');
var httpsOptions = {
  key: sslCert.privateKey,
  cert: sslCert.certificate
};


app.use( function( req, res, next ) {

    console.log( "world" );
    next();

} );


//SESSION?!?!?
app.middleware('session', loopback.session({ saveUninitialized: true,
  resave: true, secret: 'keyboard cat' }));

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname);

var options = {
  dataSource: app.dataSources.db, // Data source for oAuth2 metadata persistence
  resourceServer: true,
  authorizationServer: true,
  loginPage: '/login', // The login page url
  loginPath: '/login' // The login processing url
};
 
oauth2.oAuth2Provider(
  app, // The app instance
  options // The options
);





app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// Set up login/logout forms
app.get('/login', site.loginForm);
app.get('/logout', site.logout);
app.get('/account', site.account);
app.get('/callback', site.callbackPage);





var auth = oauth2.authenticate({session: false, scope: 'full'}); //var auth = oauth2.authenticate({session: false, scope: 'demo'});
app.use(['/api', '/me'], auth);

app.get('/me', function(req, res) {
  res.json({ 'user_id': req.user.id, name: req.user.username, email: req.user.email,
    accessToken: req.authInfo.accessToken });
});










app.start = function() {
    return https.createServer(httpsOptions, app).listen(app.get('port'), function() {
      var baseUrl = 'https://' + app.get('host') + ':' + app.get('port');
      app.emit('started', baseUrl);
      console.log('LoopBack server listening @ %s%s', baseUrl, '/');
    });
};

// start the server if `$ node server.js`
if (require.main === module) {
  app.start();
}