import React from 'react';
import ReactDOM from 'react-dom';
import Auth from './auth';
import Submit from './submit';
import Account from './account';
import MyGames from './mygames';
import Admin from './admin';
import AdminGames from './admingames';

function addComponent(elt, component) {
  var root = document.getElementById(elt)
  if (root) {
    ReactDOM.render(component, root);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  addComponent('submitroot', <Submit/>);
  addComponent('accountroot', <Account/>);
  addComponent('mygamesroot', <MyGames/>);
  addComponent('adminroot', <Admin/>);
  addComponent('admingamesroot', <AdminGames/>);
});

// Let non-bundled client JS can access Auth class.
module.exports = {
  Auth:Auth
}
