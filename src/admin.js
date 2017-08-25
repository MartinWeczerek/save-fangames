import React from 'react';
import Auth from './auth';

class Admin extends React.Component {
  constructor() {
    super();
    this.state = {
      loading:false,
      authenticated:false,
      errormsg:'',

      reports:[],
      order:'DESC',
      type:'all',
      answered:0,
      reportsuccessmsg:'',
      reporterrormsg:'',
    };

    if (Auth.isUserAuthenticated()) {
      this.state.loading = true;
      this.filter(null);
    }

    this.filter = this.filter.bind(this);
    this.filterChange = this.filterChange.bind(this);
  }

  filter(event) {
    if (event) {
      event.preventDefault();
    }

    var component = this;
    Auth.sendAuthedPost('/admin',
      {order:this.state.order,type:this.state.type,answered:this.state.answered},
      function(xhr){
      component.setState({loading:false});
      if (xhr.status == 200) {
        component.setState({authenticated:true,
          reports:JSON.parse(xhr.responseText)});
      } else {
        component.setState({errormsg: Auth.parseErrorMessage(xhr)});
      }
    });
  }

  filterChange(event) {
    const name = event.target.name;
    const value = event.target.value;
    this.setState({[name]:value,loading:true},function(){
      this.filter(null);
    });
  }

  sendAdminCommand(url, data, successmsg, reportindex) {
    var component = this;
    Auth.sendAuthedPost(url, data, function(xhr){
      if (xhr.status == 200) {
        var newReports = component.state.reports.slice();
        //newReports.splice(reportindex, 1);
        component.setState({reportsuccessmsg:successmsg,
          reporterrormsg:'',
          reports:newReports});
      } else {
        component.setState({reportsuccessmsg:'',
          reporterrormsg:Auth.parseErrorMessage(xhr)});
      }
    });
  }

  rejectGame(gameid, reportindex) {
    if (window.confirm('Are you sure you want to reject the game?')) {
      this.sendAdminCommand('/admin/rejectgame', {gameid:gameid},
        `Game #${gameid} rejected.`, reportindex);
    }
  }

  banUser(userid, reportindex) {
    if (window.confirm('Are you sure you want to ban this user?')) {
      this.sendAdminCommand('/admin/banuser', {userid:userid},
        `User #${userid} banned.`, reportindex);
    }
  }

  reportJSX(r, i) {
    var actionButton = '';
    if (r.type == 'game_submit') {
      actionButton = <span><br/><br/>
        <input type="submit" onClick={() => this.rejectGame(r.target_id, i)}
        value="Reject Game" /></span>;
    } else if (r.type == 'user_verify') {
      actionButton = <span><br/><br/>
        <input type="submit" onClick={() => this.banUser(r.target_id, i)}
        value="Ban User" /></span>;
    }
    return (
    <div className="report" key={r.id}>
      <div className="reportid">{r.id}</div>
      <div className="reportcontents">
        {r.created_at}<br/>{r.type}<br/><br/>{r.report}
        {actionButton}
      </div>
    </div>
    );
  }

  render() {
    if (this.state.loading) {
      return (<div><p>Loading...</p></div>);
    } else if (this.state.errormsg) {
      return (<div className="error"><p>{this.state.errormsg}</p></div>);
    } else if (!this.state.authenticated) {
      return (<div><p>Not logged in.</p></div>);
    } else {
      return (<div id="adminpanel">
          <form onSubmit={this.filter}>
            <label>Type: </label>
            <select name="type" value={this.state.type} onChange={this.filterChange}>
              <option value="all">All</option>
              <option value="game_submit">game_submit</option>
              <option value="user_verify">user_verify</option>
              <option value="admin">admin</option>
            </select>
            <br/>
            <label>Order: </label>
            <select name="order" value={this.state.order} onChange={this.filterChange}>
              <option value="DESC">Newest</option>
              <option value="ASC">Oldest</option>
            </select>
          </form>
          <span>{this.state.reportsuccessmsg}</span>
          <span className="error">{this.state.reporterrormsg}</span>
          <p></p>
          {this.state.reports.map((r, i) => this.reportJSX(r, i))}
        </div>);
    }
  }
}

export default Admin;
