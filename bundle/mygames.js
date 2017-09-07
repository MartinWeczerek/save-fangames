import React from 'react';
import Auth from './auth';
import { _ } from './localize';

class MyGames extends React.Component {
  constructor() {
    super();
    this.state = {
      loading:true,
      errormsg:'',
      auth:true,

      games:[],
      actionerrormsg:'',
      actionsuccessmsg:'',
    };

    if (Auth.isUserAuthenticated()) {
      var component = this;
      Auth.sendAuthedPost('/mygames',{},function(xhr){
        component.setState({loading:false});
        if (xhr.status == 200) {
          component.setState({games:JSON.parse(xhr.responseText)});
        } else {
          component.setState({errormsg: Auth.parseErrorMessage(xhr)});
        }
      });
    } else {
      this.state.loading = false;
      this.state.auth = false;
    }
  }

  updateLink(g) {
    var newlink = prompt(_("Link"))
    if (newlink) {
      this.setState({actionsuccessmsg:'', actionerrormsg:''});
      var component = this;
      Auth.sendAuthedPost('/updategame', {game:g, gamelink:newlink},
      function(xhr) {
        if (xhr.status == 200) {
          component.setState({
              actionsuccessmsg:'Success. Reload the page to see changes.'});
        } else {
          component.setState({actionerrormsg:Auth.parseErrorMessage(xhr)});
        }
      });
    }
  }

  gameJSX(g, i) {
    var approvedAt = "";
    if (g.rejected) {
      approvedAt = "Rejected";
    } else if (g.approvedAt) {
      approvedAt = g.approvedAt;
    } else {
      approvedAt = "in progress";
    }
    if (!g.linkUpdateAt) {
      g.linkUpdateAt = "";
    }
    if (!g.linkUpdate) {
      g.linkUpdateApprovedAt = "";
    } else if (!g.linkUpdateApproved) {
      g.linkUpdateApprovedAt = "in progress";
    }

    var status1 = "";
    var status1class = "";
    if (g.rejected) {
      status1 = "Rejected";
      status1class = "mygamered";
    } else if (g.approved) {
      status1 = <span>Approved<br/>{g.approvedAt}</span>;
      status1class = "mygamegreen";
    } else {
      status1 = <span>Pending<br/>{g.createdAt}</span>;
      status1class = "mygameyellow";
    }

    var status2 = "";
    var status2class = "mygameempty";
    if (g.approved && g.linkUpdate) {
      if (g.linkUpdateApproved) {
        status2 = <span>Update Approved<br/>{g.linkUpdateApprovedAt}</span>;
        status2class = "mygamegreen";
      } else {
        status2 = <span>Update Pending<br/>
            <a href={g.linkUpdate}>{g.linkUpdate}</a><br/>{g.linkUpdateApprovedAt}</span>;
        status2class = "mygameyellow";
      }
    }
    return (
    <div key={g.id} className="mygame">
      <span className="mygamemain">
        {g.name}
        <br/>
        <a href={g.link}>{g.link}</a>
        <br/>
        {g.authors}
      </span>
      <span className={status1class}>
        {status1}
      </span>
      <span className={status2class}>
        {status2}
        <br/>
        <button onClick={() => this.updateLink(g)}>{_("Update Link")}</button>
      </span>
    </div>);
  }

  render() {
    if (this.state.loading) {
      return (<div>{_("Loading...")}</div>);

    } else if (this.state.errormsg) {
      return (<div className="error">{this.state.errormsg}</div>);

    } else if (!this.state.auth || this.state.games.length == 0) {
      return (<div></div>);

    } else {
      return (
      <div>
        <div className="success"><p>{this.state.actionsuccessmsg}</p></div>
        <div className="error"><p>{this.state.actionerrormsg}</p></div>
        <div className="mygames">
          {this.state.games.map((g,i) => this.gameJSX(g,i))}
        </div>
      </div>);
    }
  }
}

export default MyGames;
