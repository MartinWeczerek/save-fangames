import React from 'react';
import ReactDOM from 'react-dom';
import Counter from './counter';
import Submit from './submit';
import Account from './account';
import MyProfile from './myprofile';
import Admin from './admin';

function addComponent(elt, component) {
  var root = document.getElementById(elt)
  if (root) {
    ReactDOM.render(component, root);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  addComponent('submitroot', <Submit/>);
  addComponent('accountroot', <Account/>);
  addComponent('myprofileroot', <MyProfile/>);
  addComponent('adminroot', <Admin/>);
});
