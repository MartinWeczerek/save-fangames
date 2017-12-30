import React from 'react';
import Auth from './auth';
import { _ } from './localize';

class ContactAdmin extends React.Component {
  constructor() {
    super();
    this.state = {
      sending:false,
      done:false,
      errormsg:'',
      message:'',
    }
    this.handleTextChange = this.handleTextChange.bind(this);
    this.submit = this.submit.bind(this);
  }

  handleTextChange(event) {
    this.setState({message:event.target.value});
  }

  submit(event) {
    event.preventDefault();
    this.setState({sending:true, errormsg:''});
    var component = this;
    Auth.sendAuthedPost('/contactadmin', {message:this.state.message},
    function(xhr) {
      component.setState({sending:false});
      if (xhr.status == 200) {
        component.setState({done:true});
      } else {
        component.setState({errormsg: Auth.parseErrorMessage(xhr)});
      }
    });
  }

  render() {
    if (this.state.done) {
      return <div className="success">Message sent! A reply will be sent to your email.</div>;
    } else if (this.state.sending) {
      return <div>{_("Loading...")}</div>;
    } else {
      return <div>
        <h3>Contact Admins</h3>
        <div className="error">{this.state.errormsg}</div>
        <p>
        1. You must be logged in to contact administrators.
        <br/><br/>
        2. Valid reasons to contact admins include: Asking questions about the site, changing your game&#39;s title or authors, reporting an abusive game.
        </p>
        <form onSubmit={this.submit}>
          <label>Message:</label>
          <input type="text" value={this.state.message} onChange={this.handleTextChange}/>
          <input type="submit" value="Submit"/>
        </form>
      </div>;
    }
  }
}

export default ContactAdmin;
