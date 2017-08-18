import React from 'react';
import ReactDOM from 'react-dom';
import Counter from './counter';
import Submit from './submit';

document.addEventListener('DOMContentLoaded', function() {
  var submitroot = document.getElementById('submitroot')
  if (submitroot) {
    ReactDOM.render(
      <Submit/>,
      submitroot
    );
  }
});
