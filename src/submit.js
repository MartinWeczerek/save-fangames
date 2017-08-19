import React from 'react';
import fs from 'fs';

var SubmitState = {
  INPUT: 1,
  SENDING: 2,
  SUCCESS: 3,
}

class Submit extends React.Component {

  constructor() {
    super();
    this.state = {
        gamename: '',
        gamelink: '',
        state: SubmitState.INPUT,
        errormsg: ''
    };
    this.handleChange = this.handleNameChange.bind(this);
    this.handleChange2 = this.handleLinkChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleNameChange(event) {
      this.setState({gamename: event.target.value});
  }

  handleLinkChange(event) {
      this.setState({gamelink: event.target.value});
  }

  handleSubmit(event) {
    event.preventDefault();

    this.setState({state: SubmitState.SENDING});

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/submitgame', true);
    xhr.setRequestHeader("Content-type", "application/json");

    var submitObj = this;
    xhr.onreadystatechange = function () {
      if (this.readyState == 4) {
        // Success changes to success state
        if (this.status == 200) {
          submitObj.setState({state: SubmitState.SUCCESS});
        // Failure goes back to input state and displays error message (if any)
        } else {
          submitObj.setState({
            state: SubmitState.INPUT,
            errormsg: xhr.status.toString()+" "+xhr.statusText
          });
          try {
            var json = JSON.parse(xhr.responseText);
            submitObj.setState({errormsg: submitObj.state.errormsg+" - "+json.Message});
          } catch(e) {
          }
        }
      }
    }
    var fd = new FormData();
    xhr.send(JSON.stringify({
      gamename: this.state.gamename,
      gamelink: this.state.gamelink
    }));

    /*console.log("Im doing something")
    fs.writeFile('mynewfile3.txt', 'Hello content!', function (err) {
      if (err) throw err;
      console.log('Saved!');
    });*/
  }

  render(){
    var inner = "";
    if (this.state.state == SubmitState.INPUT) {
      inner = (
        <div>
          <form onSubmit={this.handleSubmit}>
              <p>
              <label>Name of your fangame: </label>
              <textarea value={this.state.gamename} onChange={this.handleChange} spellCheck="false" />
              </p>
              <p>
              <label>Link to your fangame: </label>
              <textarea value={this.state.gamelink} onChange={this.handleChange2} spellCheck="false" />
              </p>
              <p>
              <input type="submit" value="Submit" />
              </p>
              <p>{this.state.errormsg}</p>
          </form>
        </div>
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
          <p>Your game {this.state.gamename} with link {this.state.gamelink} has been successfully submitted!</p>
        </div>
      );
    }

    return(
      <div>
        <p>Submit a game</p>
        <div id="gamesubmit">
          {inner}
        </div>
        <a href="/">Return to home page</a>
      </div>
    )
  }
}

export default Submit;
