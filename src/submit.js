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
          setTimeout(function(){
            location.reload();
          }, 1000);
        } else {
          component.setState({state: SubmitState.INPUT,
            errormsg: Auth.parseErrorMessage(xhr)});
        }
    });
  }

  render(){
    var button = <input type="submit" value="Submit" />;
    if (this.state.state != SubmitState.INPUT) {
      button = '';
    }
    var form = (
      <form onSubmit={this.handleSubmit}>
        <label>{_("Name of your fangame:")}</label>
        <input type="text" autoFocus value={this.state.gamename} onChange={this.handleChange} spellCheck="false" />
        <br/>
        <label>{_("Creator name(s) separated by commas:")}</label>
        <input type="text" value={this.state.gameauthors} onChange={this.handleChange2} spellCheck="false" />
        <br/>
        <label>{_("Link to your fangame:")}</label>
        <input type="text" value={this.state.gamelink} onChange={this.handleChange3} spellCheck="false" />
        <br/>
        <br/>
        {button}
      </form>);
    if (this.state.state == SubmitState.INPUT) {
      return (
        <div id="gamesubmit">
          {form}
          <div className="error"><p>{this.state.errormsg}</p></div>
        </div>
      );

    } else if (this.state.state == SubmitState.SENDING) {
      return (
        <div id="gamesubmit">
          {form}
          <p>{_("Submitting...")}</p>
        </div>
      );

    } else if (this.state.state == SubmitState.SUCCESS) {
      return ( 
        <div id="gamesubmit">
          {form}
          <p>{_("Game submitted!")}</p>
        </div>
      );
    } else if (this.state.state == SubmitState.NOAUTH) {
      return (
        <div id="gamesubmit">
          <p>{_("You must register an account to submit a game.")}</p>
        </div>
      );
    }
  }
}

export default Submit;
