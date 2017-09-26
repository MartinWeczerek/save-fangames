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
    // TODO: somehow use a text box instead of popup
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
      status1 = <span>Online</span>;
      status1class = "mygamegreen";
    } else {
      status1 = <span>{_("Pending")} ({g.timeLeftApprove})</span>;
      status1class = "mygameyellow";
    }

    var status2 = "";
    var status2class = "mygameempty";
    if (g.approved && g.linkUpdate) {
      if (!g.linkUpdateApproved) {
        status2 = <span>
          <a href={g.linkUpdate}>{_("Link Update Pending")}</a> ({g.timeLeftUpdate})
        </span>;
        status2class = "mygameyellow";
      }
    }

    return (
    <div key={g.id} className="mygame">
      {g.name}
      <br/>
      <span className={status1class}>
        {status1}
      </span>
      <span className={status2class}>
        {status2}
      </span>
      <br/>
      {g.authors}
      <br/>
      <a href={g.link}>{g.link}</a>
      <br/>
      <button onClick={() => this.updateLink(g)}>{_("Update Link")}</button>
    </div>);
  }

  render() {
    var nav =
      <nav id="submitnav">
        <a href="/mygames">
          <div className="navItem submitNavHighlight">{_("My Games")}</div>
        </a>
        <a href="/submit">
          <div className="navItem">{_("Submit a new game")}</div>
        </a>
      </nav>;
    var nogames = "";
    if (this.state.games.length == 0) {
      nogames = <p>No games submitted yet!</p>;
    }
    if (this.state.loading) {
      return (<div>{nav}<p>{_("Loading...")}</p></div>);

    } else if (this.state.errormsg) {
      return (<div>{nav}<div className="error">{this.state.errormsg}</div></div>);

    } else if (!this.state.auth) {
      return (<div>{nav}<p>{_("You must register an account to submit a game.")}</p></div>);

    } else {
      return (
      <div>
        {nav}
        <div className="success"><p>{this.state.actionsuccessmsg}</p></div>
        <div className="error"><p>{this.state.actionerrormsg}</p></div>
        <div className="mygames">
          {this.state.games.map((g,i) => this.gameJSX(g,i))}
        </div>
        {nogames}
        <p>To change your game&#39;s title or creators, or for any other issues, <a href="/contactadmin">contact the admins</a>.</p>
      </div>);
    }
  }
}

export default MyGames;
