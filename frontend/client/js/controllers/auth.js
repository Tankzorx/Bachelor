angular
  .module('app')
  .controller('AuthLoginController', ['$scope', 'AuthService', '$state',
      function ($scope, AuthService, $state) {
      $scope.client = {
        email: 'magnus@magnus.com',
        password: 'swag'
      };

      $scope.login = function () {
        AuthService.login($scope.client.email, $scope.client.password)
          .then(function () {
            $state.go('my-reservations');
          });
      };
  }])
  .controller('AuthLogoutController', ['$scope', 'AuthService', '$state',
      function ($scope, AuthService, $state) {
      AuthService.logout()
        .then(function () {
          $state.go('sign-out-success');
        });
  }]);