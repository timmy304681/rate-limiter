const express = require('express');
const { fixedWindowCounter, slidingWindowCounter, slidingWindowLogs } = require('./rate-limiter');

const app = express();
//
app.get('/FWC', fixedWindowCounter, (req, res, next) => {
  return res.status(200).send('Hi, good response');
});

app.get('/SWC', slidingWindowCounter, (req, res, next) => {
  res.status(200).send('Hi, good response');
});

app.get('/SWL', slidingWindowLogs, (req, res, next) => {
  res.status(200).send('Hi, good response');
});

// Handle 404
app.use(function (req, res, next) {
  // console.log('req.query: ', req.query);
  console.log('404', req.url);
  return res.status(404).json({ error: 'error: 404' });
});

//Handle 500
app.use(function (err, req, res, next) {
  console.log('error handler: ', err);
  return res.status(500).render('error', { msg: 'error: 500' });
});

app.listen('4000', () => {
  console.log('Server started on port 4000!');
});
