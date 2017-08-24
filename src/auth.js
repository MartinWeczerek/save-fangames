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

  static sendAuthedPost(url, data, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.setRequestHeader("Authorization", `Bearer ${Auth.getToken()}`);

    xhr.onreadystatechange = function(){
      if (this.readyState == 4) {
        callback(this);
      }
    };

    xhr.send(JSON.stringify(data));
  }

  static parseErrorMessage(xhr) {
    var msg = xhr.status.toString()+" "+xhr.statusText;
    try {
      var json = JSON.parse(xhr.responseText);
      msg += " - "+json.Message;
    } catch(e) {
    }
    return msg;
  }
}

export default Auth;
