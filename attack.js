const axios = require('axios');
const TIMES = 10;

for (let i = 1; i <= TIMES; i++) {
  axios
    .get('http://localhost:4000/SWL')
    .then((res) => {
      console.log(res.data, i);
    })
    .catch((error) => {
      console.log('too much req', i);
    });
}
