import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import bodyParser from 'body-parser';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express()
dotenv.config()

app.use(bodyParser.urlencoded({ extended: true }));


mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => console.log("DB Connection Success"))
.catch((err) => console.log(err));

/*Schemas*/

const userSchema = new mongoose.Schema({
  username: String
}, {versionKey: false} );

const exerciseSchema = new mongoose.Schema({
  description: String,
  duration: Number,
  date: Date
}, {versionKey: false} );

const logSchema = new mongoose.Schema({
  userId: String,
  count: Number,
  log: [exerciseSchema]
}, {versionKey: false} );


const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);
const Log = mongoose.model('Log', logSchema);


app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  const newUser = new User({username: req.body.username});
  await newUser.save();

  const newLog = new Log({userId: newUser._id, count: 0});
  await newLog.save();

  res.json({username: newUser.username, _id: newUser._id});
});

app.get('/api/users', async (req, res) => {
  const users = await User.find({});+
  res.json(users);
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const {description, duration, date} = req.body;
  const userId = req.params._id;
  const user = await User
    .findById(userId)
    .select('_id username');

  if (!user) {
    return res.json({error: 'User not found'});
  }

  const newExercise = new Exercise({
    description,
    duration,
    date: date ? new Date(date) : new Date()
  });

  const log = await Log.findOne({userId});
  log.count += 1;
  log.log.push(newExercise);
  await log.save();

  res.json({
    _id: user._id,
    username: user.username,
    date: newExercise.date.toDateString(),
    duration: newExercise.duration,
    description: newExercise.description
  });
  }
);

app.get('/api/users/:_id/logs', async (req, res) => {
  const {from, to, limit} = req.query;
  const userId = req.params._id;

  console.log(from, to , limit, userId);


  const log = await Log.findOne({userId})

  if (!log) {
    return res.status(404).json({ error: 'Logs not found' });
  }

  // create deep copy of log
  const logCopy = JSON.parse(JSON.stringify(log));

  // Filtering by date
  if (from) {
    logCopy.log = logCopy.log.filter((logEntries) => {
      return new Date(logEntries.date) >= new Date(from);
    });
  }

  if (to) {
    logCopy.log = logCopy.log.filter((logEntries) => {
      return new Date(logEntries.date) <= new Date(to);
    });
  }

  // Limiting the number of logs
  if (limit) {
    logCopy.log = logCopy.log.slice(0, limit);
  }

  // Mapping date in log to dateString
  logCopy.log = logCopy.log.map((logEntries) => {
    return {
      description: logEntries.description,
      duration: logEntries.duration,
      date: new Date(logEntries.date).toDateString()
    };
  });

  console.log(logCopy);
  return res.json(logCopy);
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
