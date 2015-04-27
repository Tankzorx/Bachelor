var async = require('async');
var sslCert = require('../private/ssl_cert');

module.exports = function (app) {

  var postgresql = app.dataSources.postgresql;
  var Client = app.models.Client;
  var Reservation = app.models.Reservation;
  var Computer = app.models.Computer;
  var Frontend = app.models.Frontend;

  async.parallel({
    clients: async.apply(createClients),
    computers: async.apply(createComputers),
  }, function (err, results) {
    if (err) {
      throw err;
    }
    registerFrontend(results.clients, function (err, registration) {
      console.log('> models created ');
    });
    createReservations(results.clients, results.computers, function (err, reservations) {
      console.log('> models created sucessfully');
    });

  });

function registerFrontend(clients, cb) {
  //some hack --- loook old file for good config. 
    Frontend.beforeSave = function(next) {
      this.id = 'frontend';
      this.restApiKey = 'secret';
      next();
    };
  
    Frontend.register(
      clients[0].id,
      'dev-frontend',
      {
        publicKey: sslCert.certificate
      },
      function(err, frontend) {
        if (err) {
          console.error(err);
        } else {
          console.log('Client application registered: id=%s key=%s',
            frontend.id, frontend.restApiKey);
        }
      }
    );
}


  function createClients(cb) {
    postgresql.automigrate('Client', function (err) {
      if (err) {
        return cb(err);
      }
      Client.create([
        {
          email: 'magnus@magnus.com',
          password: 'swag'
        },
        {
          email: 'gusse@gusse.com',
          password: 'swag'
        },
        {
          email: 'martin@martin.com',
          password: 'swag'
        },
      ], cb);
    });
  }

  function createComputers(cb) {
    postgresql.automigrate('Computer', function (err) {
      if (err) {
        return cb(err);
      }
      Computer.create([
        {
          ip: '192.168.13.1'
        },
        {
          ip: '192.168.13.2'
        },
        {
          ip: '192.168.13.3'
        },
      ], cb);
    });
  }

  function createReservations(clients, computers, cb) {
    postgresql.automigrate('Reservation', function (err) {
      if (err) {
        return cb(err);
      }
      var startDate = new Date(new Date().getTime() + 00000 + 7*1000)
      console.log(startDate)
      Reservation.create([
        {
          description: '1',
          computerId: computers[0].id,
          startDate: startDate,
          finishDate: new Date(2018, 1, 1, 11),
          clientId: clients[0].id
        }//,
        // {
        //   description: '2',
        //   computerId: computers[1].id,
        //   startDate: new Date(2014, 2, 2, 11),
        //   finishDate: new Date(2020, 4, 4, 11),
        //   clientId: clients[1].id
        // },
        // {
        //   description: '3',
        //   computerId: computers[2].id,
        //   startDate: new Date(2017, 3, 3, 11),
        //   finishDate: new Date(2017, 3, 3, 11),
        //   clientId: clients[2].id
        // },
        // {
        //   description: '4',
        //   computerId: computers[2].id,
        //   startDate: new Date(2017, 4, 4, 11),
        //   finishDate: new Date(2017, 4, 4, 11),
        //   clientId: clients[0].id
        // },
        // {
        //   description: '5',
        //   computerId: computers[2].id,
        //   startDate: new Date(2017, 5, 5, 11),
        //   finishDate: new Date(2017, 5, 5, 11),
        //   clientId: clients[1].id
        // },
        // {
        //   description: '6',
        //   computerId: computers[2].id,
        //   startDate: new Date(2017, 6, 6, 11),
        //   finishDate: new Date(2017, 6, 6, 11),
        //   clientId: clients[2].id
        // }
      ], cb);
    });
  }

};