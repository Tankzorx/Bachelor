angular
  .module('app')
  .controller('MyReservationsController', ['$scope', 'Client', 'Reservation', '$rootScope',
      function ($scope, Client, Reservation, $rootScope) {
      Client.reservations({
          id: $rootScope.currentClient.id
        })
        .$promise
        .then(function (results) {
          console.log(results);
          $scope.reservations = results;
        });
        
      $scope.checkAvailability = function () {
        Reservation.available($scope.dates)
        .$promise
        .then(function (results) {
          $scope.unoccupied = results.available;
          console.log($scope.unoccupied);
        })
      };
  //THIS IS BUGGED THO YOU CAN BOOK FOR OTHERS AND STUFF
      $scope.reserve = function (computerId) {
        $scope.newReservation = {
            "description": "test",
            "startDate":  $scope.startDate,
            "finishDate": $scope.finishDate,
            "clientId": $rootScope.currentClient.id,
            "computerId": computerId
        }
        Reservation.create($scope.newReservation)
        .$promise
        .then(function(reservation) {
          $scope.reservations.push(reservation);
          $scope.unoccupied = null;
          console.log(reservation);
        });
        
      }

      $scope.dateOptions = {
        format: "MM/dd/yyyy HH:mm",
        parseFormats: ["MM/dd/yyyy", "HH:mm"],
        timeFormat: "HH:mm"
      };
  }]);