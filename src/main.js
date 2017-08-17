console.log('Hello World!');
import React from 'react';
import ReactDOM from 'react-dom';
import Counter from './Counter';
import Submit from './Submit';

document.addEventListener('DOMContentLoaded', function() {
  ReactDOM.render(
    <div>
      <Counter/>
      <Submit/>
    </div>,
    document.getElementById('mount')
  );
});
