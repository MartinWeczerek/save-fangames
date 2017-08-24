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
      sentverification: false,
      errormsg: '',
      email: '',
      typedemail: '',
      typedpassword: '',
      typedpassword2: ''
    };
    // At start, decode already existing JWT, and if not expired,
    // set state to logged in.
    if (Auth.isUserAuthenticated()) {
      try {
        var decoded = jwt_decode(Auth.getToken());
        var expired = decoded.exp < (new Date().getTime()/1000);
        if (!expired) {
          this.state.loggedin = true;
          this.state.email = decoded.email;
        }
      } catch(e) {
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

    var component = this;
    Auth.sendAuthedPost('/login',
      {email: this.state.typedemail,
      password: this.state.typedpassword},
      function(xhr){
        component.setState({loggingin: false});
        if (xhr.status == 200) {
          var json = JSON.parse(xhr.responseText);
          Auth.authenticateUser(json.Token);
          component.setState({loggedin: true, loginbox: false, email: json.Email});
        } else {
          component.setState({errormsg: Auth.parseErrorMessage(xhr)});
        }
    });
  }

  handleRegister(event) {
    if (this.state.typedpassword != this.state.typedpassword2) {
      this.setState({errormsg:'Passwords do not match.'});
      return;
    }

    this.setState({registering:true, errormsg:''});

    var component = this;
    Auth.sendAuthedPost('/register',
      {email: this.state.typedemail,
      password: this.state.typedpassword},
      function(xhr){
        component.setState({registering: false});
        if (xhr.status == 200) {
          var json = JSON.parse(xhr.responseText);
          component.setState({sentverification: true});
        } else {
          component.setState({errormsg: Auth.parseErrorMessage(xhr)});
        }
    });
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

  handleNameClicked(event) {
    window.location.href = '/account';
  }
  handleAdminClicked(event) {
    window.location.href = '/admin';
  }

  render() {
    if (this.state.sentverification) {
      return (<span id="account">
          Verification email sent to {this.state.typedemail}. Click the link in the email.
        </span>);
    }

    if (this.state.loggingin) {
      return (<span id="account">Logging in...</span>);
    }

    if (this.state.registering) {
      return (<span id="account">Registering...</span>);
    }

    if (this.state.loggedin) {
      var adminButton = "";
      if (Auth.isAdmin()) {
        adminButton = (<a onClick={this.handleAdminClicked}>
          <span className="navItem navAdmin">Admin panel</span></a>);
      }
      return (
        <span id="account">
          &nbsp;
          <a onClick={this.handleNameClicked}>
            <span className="navItem navAccount">Account</span></a>
          {adminButton}
          <span className="email">{this.state.email}</span>
          <input type="submit" value="Log out" onClick={this.handleLogout}/>
        </span>);
    }

    if (this.state.loginbox || this.state.registerbox) {
      var divStyle = {position:'absolute', width:'0', height:'0'}
      var extraBox = "";
      var submitFunc = this.handleLogin;
      var buttonText = "Log in";
      if (this.state.registerbox) {
        extraBox = (<span><br/><label>Re-enter password: </label>
          <input type="password" value={this.state.typedpassword2}
            onChange={this.handleText3Change} spellCheck="false" /></span>);
        submitFunc = this.handleRegister;
        buttonText = "Register";
      }
      return (
        <span id="account">
          &nbsp;
          <span className="error">{this.state.errormsg}</span>
          <input type="submit" value="X" onClick={this.handleCloseBox}/>
          <span style={divStyle}>
            <div id="account-inputbox">
              <form onSubmit={submitFunc}>
                <label>Email: </label>
                <input type="text" autoFocus value={this.state.typedemail} onChange={this.handleText1Change} spellCheck="false" />
                <br/>
                <label>Password: </label>
                <input type="password" value={this.state.typedpassword} onChange={this.handleText2Change} spellCheck="false" />
                {extraBox}
                <br/>
                <br/>
                <input type="submit" value={buttonText}/>
              </form>
            </div>
          </span>
        </span>
      )

    } else {
      return (
        <span id="account">
          &nbsp;
          <input type="submit" value="Log in" onClick={this.handleOpenLoginBox}/>
          <input type="submit" value="Register" onClick={this.handleOpenRegisterBox}/>
          <span style={{clear:'both'}} />
        </span>);
    }
  }
}

export default Account;
