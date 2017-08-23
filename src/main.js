import React from 'react';
import ReactDOM from 'react-dom';
import Counter from './counter';
import Submit from './submit';
import Account from './account';
import MyProfile from './myprofile';

document.addEventListener('DOMContentLoaded', function() {
  // TODO: there's gotta be a better way to do this
  var submitroot = document.getElementById('submitroot')
  if (submitroot) {
    ReactDOM.render(
      <Submit/>,
      submitroot
    );
  }
  var accountroot = document.getElementById('accountroot')
  if (accountroot) {
    ReactDOM.render(
      <Account/>,
      accountroot
    );
  }
  var myprofileroot = document.getElementById('myprofileroot')
  if (myprofileroot) {
    ReactDOM.render(
      <MyProfile/>,
      myprofileroot
    );
  }
});
