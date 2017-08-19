import React from 'react';
import Auth from './auth';
require('./jwt-decode.min');

class Account extends React.Component {
  constructor() {
    super();
    this.state = {
      loggedin: false,
      loggingin: false,
      errormsg: '',
      email: ''
    };
    // At start, decode already existing JWT, and if not expired,
    // set state to logged in.
    if (Auth.isUserAuthenticated()) {
      var decoded = jwt_decode(Auth.getToken());
      var expired = decoded.exp < (new Date().getTime()/1000);
      if (!expired) {
        this.state.loggedin = true;
        this.state.email = decoded.email;
      }
    }
    this.handleLogin = this.handleLogin.bind(this)
    this.handleLogout = this.handleLogout.bind(this)
  }

  handleLogin(event) {
    this.setState({loggingin: true});

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/login', true);
    xhr.setRequestHeader("Content-type", "application/json");

    var accountObj = this;
    xhr.onreadystatechange = function () {
      if (this.readyState == 4) {
        accountObj.setState({loggingin: false});

        if (this.status == 200) {
          var json = JSON.parse(xhr.responseText);
          Auth.authenticateUser(json.Token);
          accountObj.setState({loggedin: true, email: json.Email});

        } else {
          accountObj.setState({
            state: SubmitState.INPUT,
            errormsg: xhr.status.toString()+" "+xhr.statusText
          });
          try {
            var json = JSON.parse(xhr.responseText);
            accountObj.setState({errormsg: submitObj.state.errormsg+" - "+json.Message});
          } catch(e) {
          }
        }
      }
    };

    // TODO: textareas to specify email and password.
    var fd = new FormData();
    xhr.send(JSON.stringify({
      email: "a",
      password: "b"
    }));
  }

  handleLogout(event) {
    Auth.deauthenticateUser();
    this.setState({loggedin: false});
  }

  render() {
    if (this.state.loggingin) {
      return (
        <div id="account">
          Logging in...
        </div>
      )
    }

    if (this.state.loggedin) {
      return (
        <div id="account">
          {this.state.email}
          <form>
            <input type="submit" value="Log out" onClick={this.handleLogout}/>
          </form>
        </div>
      )
    } else {
      return (
        <div id="account">
          <input type="submit" value="Log in" onClick={this.handleLogin}/>
        </div>
      )
    }
  }
}

export default Account;
