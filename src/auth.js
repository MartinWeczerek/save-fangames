// https://vladimirponomarev.com/blog/authentication-in-react-apps-jwt
class Auth {
  static authenticateUser(token) {
    localStorage.setItem('jwtToken', token);

    if (Auth.authenticateUser.callback) {
      Auth.authenticateUser.callback();
    }
  }

  static isUserAuthenticated() {
    return localStorage.getItem('jwtToken') !== null;
  }

  static deauthenticateUser() {
    localStorage.removeItem('jwtToken');

    if (Auth.deauthenticateUser.callback) {
      Auth.deauthenticateUser.callback();
    }
  }

  static getToken() {
    return localStorage.getItem('jwtToken');
  }
}

export default Auth;
