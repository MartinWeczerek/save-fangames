import React from 'react';
import Auth from './auth';

class MyProfile extends React.Component {
  constructor() {
    super();
    this.state = {
      authenticated:true,
      errormsg:'',
      loading:true,
      content:'',
    };
    if (Auth.isUserAuthenticated()) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', '/myprofile', true);
      xhr.setRequestHeader("Content-type", "application/json");
      xhr.setRequestHeader("Authorization", `Bearer ${Auth.getToken()}`);

      var accountObj = this;
      xhr.onreadystatechange = function () {
        if (this.readyState == 4) {
          accountObj.setState({loading:false});
          if (this.status == 200) {
            accountObj.setState({content:xhr.responseText})
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
      xhr.send();

    } else {
      this.state.authenticated = false;
    }
  }

  render() {
    if (!this.state.authenticated) {
      return (<div><p>Not logged in.</p></div>);
    } else if (this.state.errormsg) {
      return (<div className="error"><p>{this.state.errormsg}</p></div>);
    } else if (this.state.loading) {
      return (<div><p>Loading...</p></div>);
    } else {
      return (
        <div>
          <div dangerouslySetInnerHTML={{__html: this.state.content}}></div>
          <p>Games are approved approximately 12 hours after submission.</p>
        </div>);
    }
  }
}

export default MyProfile;
