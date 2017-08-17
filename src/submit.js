import React from 'react';
import fs from 'fs';

class Submit extends React.Component {

  constructor() {
    super();
    this.state = {
        value: 'Name of your Fangame',
        value2: 'Link to your Fangame'
    };
    this.handleChange = this.handleChange.bind(this);
    this.handleChange2 = this.handleChange2.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);


  }

  handleChange(event) {
      this.setState({value: event.target.value});
  }

  handleChange2(event) {
      this.setState({value2: event.target.value2});
  }

  handleSubmit(event) {
    let test = 0
    alert('An essay was submitted: ' + this.state.value);
    event.preventDefault();
    console.log("Im doing something")
    fs.writeFile('mynewfile3.txt', 'Hello content!', function (err) {
      if (err) throw err;
      console.log('Saved!');
    });
  }



  render(){
      return(
        <div>
            <form onSubmit={this.handleSubmit}>
                <label>
                Name:
                    <textarea value={this.state.value} onChange={this.handleChange} />
                </label>
                <label>
                    <textarea value={this.state.value2} onChange={this.handleChange2} />
                </label>
                <input type="submit" value="Submit" />
            </form>
        </div>
      )
  }
}

export default Submit;
