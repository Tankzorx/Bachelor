angular
  .module('app')
  .factory('AuthService', ['Client', '$q', '$rootScope',
    function (Client, $q, $rootScope) {

      function login(email, password) {
        return Client
          .login({
            email: email,
            password: password
          })
          .$promise
          .then(function (response) {
            $rootScope.currentClient = {
              id: response.user.id,
              tokenId: response.id,
              email: email
            };
          });
      }

      function logout() {
        return Client
          .logout()
          .$promise
          .then(function () {
            $rootScope.currentClient = null;
          });
      }

      return {
        login: login,
        logout: logout,
      };
  }]);