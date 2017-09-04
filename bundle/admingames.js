import React from 'react';
import Auth from './auth';

class AdminGames extends React.Component {
  constructor() {
    super();
    this.state = {
      loading:false,
      errormsg:'',

      games:[],
      actionsuccessmsg:'',
      actionerrormsg:'',
    };

    var component = this;
    Auth.sendAuthedPost('/admin/games',{},function(xhr) {
      component.setState({loading:false});
      if (xhr.status == 200) {
        component.setState({games:JSON.parse(xhr.responseText)});
      } else {
        component.setState({errormsg: Auth.parseErrorMessage(xhr)});
      }
    });
  }

  rejectGame(g) {
    if (window.confirm('Are you sure you want to reject game '+g.name+'?')) {
      this.setState({actionsuccessmsg:'', actionerrormsg:''});
      var component = this;
      Auth.sendAuthedPost('/admin/rejectgame', {gameid:g.id}, function(xhr) {
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
    return <tr key={g.id}>
      <td>{g.id}</td>
      <td><a href="{g.link}">{g.name}</a></td>
      <td>{g.approved ? 'App':''}</td>
      <td>{g.rejected ? 'Rej':''}</td>
      <td>{g.private  ? 'Pri':''}</td>
      <td>{g.approvedAt}</td>
      <td>{g.rejectedAt}</td>
      <td>
        <button onClick={() => this.rejectGame(g)}>Reject</button>
      </td>
    </tr>;
  }

  render() {
    if (this.state.loading) {
      return <div>{_("Loading...")}</div>;

    } else if (this.state.errormsg) {
      return <div className="error">{this.state.errormsg}</div>;

    } else {
      return (<div>
        <div>{this.state.actionsuccessmsg}</div>
        <div className="error">{this.state.actionerrormsg}</div>
        <table>
          <thead>
          <tr>
            <th>ID</th>
            <th>Game</th>
            <th>Approved</th>
            <th>Rejected</th>
            <th>Private</th>
            <th>ApprovedAt</th>
            <th>RejectedAt</th>
            <th>Actions</th>
          </tr>
          </thead>
          <tbody>
            {this.state.games.map((g, i) => this.gameJSX(g, i))}
          </tbody>
        </table>
        </div>);
    }
  }
}

export default AdminGames;
