import React from 'react';
import ReactDOM from 'react-dom';
import Counter from './counter';
import Submit from './submit';
import Account from './account';

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
});
