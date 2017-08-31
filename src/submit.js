import React from 'react';
import fs from 'fs';
import Auth from './auth';
import { _ } from './localize';

var SubmitState = {
  INPUT: 1,
  SENDING: 2,
  SUCCESS: 3,
  NOAUTH: 4,
}

class Submit extends React.Component {

  constructor() {
    super();
    this.state = {
        gamename: '',
        gameauthors: '',
        gamelink: '',
        state: SubmitState.INPUT,
        errormsg: ''
    };
    this.handleChange = this.handleNameChange.bind(this);
    this.handleChange2 = this.handleAuthorsChange.bind(this);
    this.handleChange3 = this.handleLinkChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    Auth.authenticateUser.callback = this.handleOnAuth.bind(this);
    Auth.deauthenticateUser.callback = this.handleOnDeauth.bind(this);
    if (!Auth.isUserAuthenticated()) {
      this.state.state = SubmitState.NOAUTH;
    }
  }

  handleOnAuth() {
    this.setState({state: SubmitState.INPUT, errormsg: ''});
  }

  handleOnDeauth() {
    if (this.state.state != SubmitState.SUCCESS) {
      this.setState({state: SubmitState.NOAUTH});
    }
  }

  handleNameChange(event) {
      this.setState({gamename: event.target.value});
  }

  handleAuthorsChange(event) {
      this.setState({gameauthors: event.target.value});
  }

  handleLinkChange(event) {
      this.setState({gamelink: event.target.value});
  }

  handleSubmit(event) {
    event.preventDefault();

    if (!Auth.isUserAuthenticated()) {
      this.setState({errormsg: 'Must be logged in to submit games.'});
      return;
    }

    this.setState({state: SubmitState.SENDING});
    var component = this;
    Auth.sendAuthedPost('/submitgame',
      {gamename: this.state.gamename,
      gameauthors: this.state.gameauthors,
      gamelink: this.state.gamelink},
      function(xhr){
        if (xhr.status == 200) {
          component.setState({state: SubmitState.SUCCESS});
        } else {
          component.setState({state: SubmitState.INPUT,
            errormsg: Auth.parseErrorMessage(xhr)});
        }
    });
  }

render(){
  var inner = "";
  if (this.state.state == SubmitState.INPUT) {
    inner = (
      <form onSubmit={this.handleSubmit}>
        <label>Name of your fangame: </label>
        <input type="text" autoFocus value={this.state.gamename} onChange={this.handleChange} spellCheck="false" />
        <br/>
        <label>Creator name(s): </label>
        <input type="text" value={this.state.gameauthors} onChange={this.handleChange2} spellCheck="false" />
        <br/>
        <label>Link to your fangame: </label>
        <input type="text" value={this.state.gamelink} onChange={this.handleChange3} spellCheck="false" />
        <br/>
        <br/>
        <input type="submit" value="Submit" />
        <div className="error"><p>{this.state.errormsg}</p></div>
        </form>
      )

    } else if (this.state.state == SubmitState.SENDING) {
      inner = (
        <div>
          <p>Submitting...</p>
        </div>
      );

    } else if (this.state.state == SubmitState.SUCCESS) {
      inner = (
        <div>
          <p>Your game {this.state.gamename} by {this.state.gameauthors} with link {this.state.gamelink} has been successfully submitted!</p>
          <p>Visit <a href="/account">your account page</a> to check its status.</p>
        </div>
      );
    } else if (this.state.state == SubmitState.NOAUTH) {
      inner = (
        <p>{_("You must register an account and log in to submit a game.")}</p>
      )
    }

    return(
      <div>
        <div id="gamesubmit">
          {inner}
        </div>
      </div>
    )
  }
}

export default Submit;
