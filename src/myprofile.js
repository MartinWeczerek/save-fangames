import React from 'react';
import Auth from './auth';

class MyProfile extends React.Component {
  constructor() {
    super();
    this.state = {
      authenticated:false,
      errormsg:'',
      loading:true,
      content:'',
    };

    // Request profile data on startup if authenticated.
    if (Auth.isUserAuthenticated()) {
      var component = this;
      Auth.sendAuthedPost('/myprofile',{},function(xhr){
        component.setState({loading:false});
        if (xhr.status == 200) {
          component.setState({content:xhr.responseText,
            authenticated:true});
        } else {
          component.setState({
            errormsg: Auth.parseErrorMsg(xhr)
          });
        }
      });
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
