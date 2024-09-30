import express from 'express';
import path from 'path';
const __dirname = path.resolve();

const app = express();
const port = 3000;

app.get('/', function (req, res, next) {
  return res.sendFile(__dirname + '/ui/index.html');
});
app.get('/*', function (req, res, next) {
  return res.sendFile(__dirname + '/ui/' + req.originalUrl);
});


app.listen(port, () => console.log(`Example app listening on port ${port}!`));