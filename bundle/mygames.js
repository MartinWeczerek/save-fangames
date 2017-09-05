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
    return <tr key={g.id}>
      <td><a href={g.link}>{g.name}</a></td>
      <td>{g.authors}</td>
      <td>{g.createdAt}</td>
      <td>{approvedAt}</td>
      <td><a href={g.linkUpdate}>{g.linkUpdateAt}</a></td>
      <td>{g.linkUpdateApprovedAt}</td>
      <td>
        <button onClick={() => this.updateLink(g)}>{_("Update Link")}</button>
      </td>
    </tr>;
    /*
      <td>{{? value.approvedAt}}{{=value.approvedAt}}
          {{?? value.rejected}}Rejected
          {{??}}in progress
          {{?}}</td>
      <td>{{? value.rejected}}Rejected{{?}}</td>
      <td>{{? value.approved}}<a href="/update/{{=value.id}}">Update (not implemented)</a>{{?}}</td>
    */
  }

  render() {
    if (this.state.loading) {
      return <div>{_("Loading...")}</div>;

    } else if (this.state.errormsg) {
      return <div className="error">{this.state.errormsg}</div>;

    } else if (!this.state.auth || this.state.games.length == 0) {
      return <div></div>;

    } else {
      return (<div>
          <div className="success"><p>{this.state.actionsuccessmsg}</p></div>
          <div className="error"><p>{this.state.actionerrormsg}</p></div>
          <table>
            <thead>
              <tr>
                <th>{_("Game")}</th>
                <th>{_("Creator(s)")}</th>
                <th>{_("Submitted Date")}</th>
                <th>{_("Approved Date")}</th>
                <th>{_("Update Link")}</th>
                <th>{_("Update Approved")}</th>
              </tr>
            </thead>
            <tbody>
              {this.state.games.map((g,i) => this.gameJSX(g,i))}
            </tbody>
          </table>
        </div>);
    }
  }
}

export default MyGames;
