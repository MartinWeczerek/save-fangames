import React from 'react';
import Auth from './auth';
require('./jwt-decode.min');

class Account extends React.Component {
  constructor() {
    super();
    this.state = {
      loggedin: false,
      loggingin: false,
      registering: false,
      loginbox: false,
      registerbox: false,
      errormsg: '',
      email: '',
      typedemail: '',
      typedpassword: '',
      typedpassword2: ''
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
    this.handleRegister = this.handleRegister.bind(this)
    this.handleLogout = this.handleLogout.bind(this)
    this.handleOpenLoginBox = this.handleOpenLoginBox.bind(this)
    this.handleCloseBox = this.handleCloseBox.bind(this)
    this.handleOpenLoginBox = this.handleOpenLoginBox.bind(this)
    this.handleOpenRegisterBox = this.handleOpenRegisterBox.bind(this)
    this.handleText1Change = this.handleText1Change.bind(this)
    this.handleText2Change = this.handleText2Change.bind(this)
    this.handleText3Change = this.handleText3Change.bind(this)
  }

  handleLogin(event) {
    this.setState({loggingin:true, errormsg:''});

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
          accountObj.setState({loggedin: true, loginbox: false, email: json.Email});

        } else {
          accountObj.setState({
            errormsg: xhr.status.toString()+" "+xhr.statusText
          });
          try {
            var json = JSON.parse(xhr.responseText);
            accountObj.setState({errormsg: accountObj.state.errormsg+" - "+json.Message});
          } catch(e) {
          }
        }
      }
    };

    var fd = new FormData();
    xhr.send(JSON.stringify({
      email: this.state.typedemail,
      password: this.state.typedpassword
    }));
  }

  handleRegister(event) {
    if (this.state.typedpassword != this.state.typedpassword2) {
      this.setState({errormsg:'Passwords do not match.'});
      return;
    }

    this.setState({registering:true, errormsg:''});

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/register', true);
    xhr.setRequestHeader("Content-type", "application/json");

    var accountObj = this;
    xhr.onreadystatechange = function () {
      if (this.readyState == 4) {
        accountObj.setState({registering: false});

        if (this.status == 200) {
          var json = JSON.parse(xhr.responseText);
          Auth.authenticateUser(json.Token);
          accountObj.setState({loggedin: true, registerbox: false, email: json.Email});

        } else {
          accountObj.setState({
            errormsg: xhr.status.toString()+" "+xhr.statusText
          });
          try {
            var json = JSON.parse(xhr.responseText);
            accountObj.setState({errormsg: accountObj.state.errormsg+" - "+json.Message});
          } catch(e) {
          }
        }
      }
    };

    var fd = new FormData();
    xhr.send(JSON.stringify({
      email: this.state.typedemail,
      password: this.state.typedpassword
    }));
  }

  handleOpenLoginBox(event) {
    this.setState({loginbox: true});
  }

  handleOpenRegisterBox(event) {
    this.setState({registerbox: true});
  }

  handleCloseBox(event) {
    this.setState({loginbox: false, registerbox: false, errormsg: ''});
  }

  handleText1Change(event) {
    this.setState({typedemail: event.target.value});
  }

  handleText2Change(event) {
    this.setState({typedpassword: event.target.value});
  }

  handleText3Change(event) {
    this.setState({typedpassword2: event.target.value});
  }

  handleLogout(event) {
    Auth.deauthenticateUser();
    this.setState({loggedin: false, typedemail: '', typedpassword: '', typedpassword2: ''});
  }

  render() {
    if (this.state.loggingin) {
      return (
        <div id="account">
          Logging in...
        </div>
      )
    }

    if (this.state.registering) {
      return (
        <div id="account">
          Registering...
        </div>
      )
    }

    if (this.state.loggedin) {
      return (
        <div id="account">
          {this.state.email}&nbsp;&nbsp;
          <input type="submit" value="Log out" onClick={this.handleLogout}/>
        </div>
      )

    }

    // TODO: get rid of tabs when improving the CSS.
    if (this.state.loginbox) {
      // this dummy positioning div is kinda messy
      var divStyle = {position:'relative', width:'0', height:'0', top:'100%', float:'right'}
      return (
        <div id="account">
          {this.state.errormsg}
          &nbsp;
          <input type="submit" value="X" onClick={this.handleCloseBox}/>
          <div style={divStyle}>
            <div id="account-inputbox">
              <p>
              <label>Email: </label>
              <textarea value={this.state.typedemail} onChange={this.handleText1Change} spellCheck="false" />
              </p>
              <p>
              <label>Password: </label>
              <input type="password" value={this.state.typedpassword} onChange={this.handleText2Change} spellCheck="false" />
              </p>
              <p>
              <input type="submit" value="Log in" onClick={this.handleLogin}/>
              </p>
            </div>
          </div>
        </div>
      )

    } else if (this.state.registerbox) {
      // this dummy positioning div is kinda messy
      var divStyle = {position:'relative', width:'0', height:'0', top:'100%', float:'right'}
      return (
        <div id="account">
          {this.state.errormsg}
          &nbsp;
          <input type="submit" value="X" onClick={this.handleCloseBox}/>
          <div style={divStyle}>
            <div id="account-inputbox">
              <p>
              <label>Email: </label>
              <textarea value={this.state.typedemail} onChange={this.handleText1Change} spellCheck="false" />
              </p>
              <p>
              <label>Password: </label>
              <input type="password" value={this.state.typedpassword} onChange={this.handleText2Change} spellCheck="false" />
              </p>
              <p>
              <label>Re-enter password: </label>
              <input type="password" value={this.state.typedpassword2} onChange={this.handleText3Change} spellCheck="false" />
              </p>
              <p>
              <input type="submit" value="Register" onClick={this.handleRegister}/>
              </p>
            </div>
          </div>
        </div>
      )
    } else {
      return (
        <div id="account">
          {this.state.errormsg}
          <input type="submit" value="Log in" onClick={this.handleOpenLoginBox}/>
          &nbsp;&nbsp;
          <input type="submit" value="Register" onClick={this.handleOpenRegisterBox}/>
        </div>
      )
    }
  }
}

export default Account;
