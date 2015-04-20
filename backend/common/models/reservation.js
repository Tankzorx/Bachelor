var async = require('async');
var _ = require('underscore');
var app = require('loopback');
var Computer = app.getModel("Computer");

module.exports = function (Reservation) {
  Reservation.observe('before save', function validateReservation(ctx, next) {
    Reservation.available(ctx.instance, function (err, available) {
      if (err) {
        throw err;
      }
      if (_.contains(available, ctx.instance.computerId)) {
        next();
      } else {
        next(new Error('This SUPER PC is already reserved'));
      }
    });
  });

  Reservation.available = function (dates, cb) {
    async.parallel({
      insideReservations: async.apply(insideReservations, dates),
      allComputers: async.apply(allComputers)
    }, function (err, results) {
      if (err) {
        throw err;
      }
      
      // I DONT NNED DO THIS
      var insideReservations = _.uniq(computerIdsToComputerIds(results.insideReservations));
      var allComputers = _.uniq(idToComputerIds(results.allComputers));
      cb(null, _.difference(allComputers, insideReservations));
    });
  };

        // I DONT NNED DO THIS
  function computerIdsToComputerIds(array) {
    var retval = [];
    array.forEach(function (entry) {
      retval.push(entry.computerId);
    });
    return retval;
  }

        // I DONT NNED DO THIS
  function idToComputerIds(array) {
    var retval = [];
    array.forEach(function (entry) {
      retval.push(entry.id);
    });
    return retval;
  }

  function insideReservations(dates, cb) {
    Reservation.find({
      fields: {
        computerId: true
      },
      where: {
        or: [{
          startDate: {
            between: [dates.startDate, dates.finishDate]
          }
          }, {
          finishDate: {
            between: [dates.startDate, dates.finishDate]
          }
          }, {
          and: [{
            startDate: {
              lte: dates.startDate
            }
          }, {
            finishDate: {
              gte: dates.finishDate
            }
          }]
        }]
      }
    }, cb);
  }

  function allComputers(cb) {
    Computer.find({
      fields: {
        id: true
      }
    }, cb);
  }

  Reservation.remoteMethod(
    'available', {
      accepts: {
        arg: 'dates',
        type: 'Object',
        http: {
          source: 'body'
        }
      },
      returns: {
        arg: 'available',
        type: 'array'
      }
    }
  );

};