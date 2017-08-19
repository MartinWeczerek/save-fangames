// https://vladimirponomarev.com/blog/authentication-in-react-apps-jwt
class Auth {
  static authenticateUser(token) {
    localStorage.setItem('jwtToken', token);
  }

  static isUserAuthenticated() {
    return localStorage.getItem('jwtToken') !== null;
  }

  static deauthenticateUser() {
    localStorage.removeItem('jwtToken');
  }

  static getToken() {
    return localStorage.getItem('jwtToken');
  }
}

export default Auth;
