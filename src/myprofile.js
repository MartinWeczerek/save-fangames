import React from 'react';
import Auth from './auth';

class MyProfile extends React.Component {
  constructor() {
    super();
    this.state = {
      loading:false,
      authenticated:false,
      errormsg:'',
      content:'',
    };

    if (Auth.isUserAuthenticated()) {
      var component = this;
      this.state.loading = true;
      Auth.sendAuthedPost('/myprofile',{},function(xhr){
        component.setState({loading:false});
        if (xhr.status == 200) {
          component.setState({content:xhr.responseText,
            authenticated:true});
        } else {
          component.setState({errormsg: Auth.parseErrorMessage(xhr)});
        }
      });
    }
  }

  render() {
    if (this.state.loading) {
      return (<div><p>Loading...</p></div>);
    } else if (this.state.errormsg) {
      return (<div className="error"><p>{this.state.errormsg}</p></div>);
    } else if (!this.state.authenticated) {
      return (<div><p>Not logged in.</p></div>);
    } else {
      return (
        <div>
          <div dangerouslySetInnerHTML={{__html: this.state.content}}></div>
        </div>);
    }
  }
}

export default MyProfile;
