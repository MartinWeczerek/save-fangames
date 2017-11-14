import React from 'react';
import Auth from './auth';
import { _ } from './localize';

class AdminList extends React.Component {
  constructor() {
    super();
    this.state = {
      loading:true,
      errormsg:'',

      games:[],
      users:[],
      ipbans:[],
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
    Auth.sendAuthedPost('/admin/users',{},function(xhr) {
      component.setState({loading:false});
      if (xhr.status == 200) {
        component.setState({users:JSON.parse(xhr.responseText)});
      } else {
        component.setState({errormsg: Auth.parseErrorMessage(xhr)});
      }
    });
    Auth.sendAuthedPost('/admin/ipbans',{},function(xhr) {
      component.setState({loading:false});
      if (xhr.status == 200) {
        component.setState({ipbans:JSON.parse(xhr.responseText)});
      } else {
        component.setState({errormsg: Auth.parseErrorMessage(xhr)});
      }
    });
  }

  rejectGame(g) {
    var admin_msg = window.prompt('Are you sure you want to reject game '+g.name+'? '+
      'Add a message to send to the creator, or leave blank to send no message.');
    if (admin_msg != null) {
      this.setState({actionsuccessmsg:'', actionerrormsg:''});
      var component = this;
      Auth.sendAuthedPost('/admin/rejectgame', {gameid:g.id,msg:admin_msg}, function(xhr) {
        if (xhr.status == 200) {
          component.setState({
              actionsuccessmsg:'Success. Reload the page to see changes.'});
        } else {
          component.setState({actionerrormsg:Auth.parseErrorMessage(xhr)});
        }
      });
    }
  }

  approveGame(g) {
    if (window.confirm('Are you sure you want to approve game '+g.name+'?')) {
      this.setState({actionsuccessmsg:'', actionerrormsg:''});
      var component = this;
      Auth.sendAuthedPost('/admin/approvegame', {gameid:g.id}, function(xhr) {
        if (xhr.status == 200) {
          component.setState({
              actionsuccessmsg:'Success. Reload the page to see changes.'});
        } else {
          component.setState({actionerrormsg:Auth.parseErrorMessage(xhr)});
        }
      });
    }
  }

  banUser(u) {
    if (window.confirm('Are you sure you want to ban user '+u.email+'?')) {
      this.setState({actionsuccessmsg:'', actionerrormsg:''});
      var component = this;
      Auth.sendAuthedPost('/admin/banuser', {userid:u.id}, function(xhr) {
        if (xhr.status == 200) {
          component.setState({
              actionsuccessmsg:'Success. Reload the page to see changes.'});
        } else {
          component.setState({actionerrormsg:Auth.parseErrorMessage(xhr)});
        }
      });
    }
  }

  banIP() {
    var ip = document.getElementById('ipbantextarea').value;
    if (!ip) return;
    if (window.confirm('Are you sure you want to ban IP '+ip+'?')) {
      this.setState({actionsuccessmsg:'', actionerrormsg:''});
      var component = this;
      Auth.sendAuthedPost('/admin/ipban', {ip:ip}, function(xhr) {
        if (xhr.status == 200) {
          component.setState({
              actionsuccessmsg:'Success. Reload the page to see changes.'});
        } else {
          component.setState({actionerrormsg:Auth.parseErrorMessage(xhr)});
        }
      });
    }
  }

  unbanIP(ip) {
    if (window.confirm('Are you sure you want to unban IP '+ip+'?')) {
      this.setState({actionsuccessmsg:'', actionerrormsg:''});
      var component = this;
      Auth.sendAuthedPost('/admin/ipunban', {ip:ip}, function(xhr) {
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
    var btnReject = null;
    var btnApprove = null;
    if (!g.rejected) btnReject= <button onClick={() => this.rejectGame(g)}>Reject</button>;
    if (!g.approved) btnApprove = <button onClick={() => this.approveGame(g)}>Approve</button>;

    return <tr key={g.id}>
      <td>{g.id}</td>
      <td><a href={g.link}>{g.name}</a></td>
      <td>{g.approved ? 'App':''}</td>
      <td>{g.rejected ? 'Rej':''}</td>
      <td>{g.private  ? 'Pri':''}</td>
      <td>{g.createdAt}</td>
      <td>{g.approvedAt}</td>
      <td>{g.rejectedAt}</td>
      <td>
        {btnReject}
        {btnApprove}
      </td>
    </tr>;
  }

  userJSX(u, i) {
    return <tr key={u.id}>
      <td>{u.id}</td>
      <td>{u.email}</td>
      <td>{u.createdAt}</td>
      <td>{u.active ? 'Act':''}</td>
      <td>{u.admin ? 'Adm':''}</td>
      <td>{u.banned ? 'Ban':''}</td>
      <td>{u.lastip}</td>
      <td>
        <button onClick={() => this.banUser(u)}>Ban</button>
      </td>
    </tr>;
  }

  ipbanJSX(b, i) {
    return <tr key={b.id}>
      <td>{b.id}</td>
      <td>{b.ip}</td>
      <td>{b.created_at}</td>
      <td>
        <button onClick={() => this.unbanIP(b.ip)}>Unban</button>
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
        <div className="success">{this.state.actionsuccessmsg}</div>
        <div className="error">{this.state.actionerrormsg}</div>
        <a href="#adminGames">Games</a>
        &nbsp;
        <a href="#adminUsers">Users</a>
        &nbsp;
        <a href="#adminIPBans">IP Bans</a>
        <h3 id="adminGames">Games</h3>
        <table>
          <thead>
          <tr>
            <th>ID</th>
            <th>Game</th>
            <th>Approved</th>
            <th>Rejected</th>
            <th>Private</th>
            <th>CreatedAt</th>
            <th>ApprovedAt</th>
            <th>RejectedAt</th>
            <th>Actions</th>
          </tr>
          </thead>
          <tbody>
            {this.state.games.map((g,i) => this.gameJSX(g,i))}
          </tbody>
        </table>
        <h3 id="adminUsers">Users</h3>
        <table>
          <thead>
          <tr>
            <th>ID</th>
            <th>Email</th>
            <th>CreatedAt</th>
            <th>Active</th>
            <th>Admin</th>
            <th>Banned</th>
            <th>Last IP</th>
            <th>Actions</th>
          </tr>
          </thead>
          <tbody>
            {this.state.users.map((u,i) => this.userJSX(u,i))}
          </tbody>
        </table>
        <h3 id="adminIPBans">IP Bans</h3>
        <table>
          <thead>
          <tr>
            <th>ID</th>
            <th>IP</th>
            <th>CreatedAt</th>
          </tr>
          </thead>
          <tbody>
            {this.state.ipbans.map((b,i) => this.ipbanJSX(b,i))}
          </tbody>
        </table>
        <textarea id="ipbantextarea"></textarea>
        <button onClick={() => this.banIP()}>Ban IP</button>
        </div>);
    }
  }
}

export default AdminList;
