const express = require('express');
const app = express();
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const cors = require('cors');

app.use(express.json());
app.use(morgan('common'));
app.use(cors());

const users = [
  {
    _id: '1',
    username: 'tran',
    password: 'tran',
    isAdmin: true,
  },
  {
    _id: '2',
    username: 'viet',
    password: 'viet',
    isAdmin: false,
  },
];

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      isAdmin: user.isAdmin,
    },
    'mySecretKey',
    {
      expiresIn: '5s',
    }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      isAdmin: user.isAdmin,
    },
    'myRefreshSecretKey'
  );
};

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (user) {
    // generate access token, refresh token
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    refreshTokens.push(refreshToken);
    res.status(200).json({
      _id: user._id,
      username,
      isAdmin: user.isAdmin,
      accessToken,
      refreshToken,
    });
  } else {
    res.status(400).json('Username or password invalid');
  }
});

const verify = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, 'mySecretKey', (err, user) => {
      if (err) {
        return res.status(403).json('Token is not valid');
      }

      req.user = user;
      next();
    });
  } else {
    res.status(401).json('You are not authenticated');
  }
};

let refreshTokens = [];

app.post('/api/refresh', (req, res) => {
  // take the refresh token from the user
  const { token: refreshToken } = req.body;

  // send error if there is no token or it's invalid
  if (!refreshToken) return res.status(401).json('You are not authenticated');
  if (!refreshTokens.includes(refreshToken))
    return res.status(403).json('Refresh token is not valid');

  // if everything is oke, create new access token, refresh token and send it to user
  jwt.verify(refreshToken, 'myRefreshSecretKey', (err, user) => {
    err && console.log(err);

    refreshTokens = refreshTokens.filter((token) => token !== refreshToken);

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    refreshTokens.push(newRefreshToken);

    res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  });
});

app.post('/api/logout', verify, (req, res) => {
  const { refreshToken } = req.body;
  refreshTokens = refreshTokens.filter((token) => token !== refreshToken);
  res.status(200).json('You logged out successfully');
});

app.delete('/api/users/:userId', verify, (req, res) => {
  const { userId } = req.params;
  if (req.user._id === userId || req.user.isAdmin) {
    res.status(200).json('User has been deleted');
  } else {
    res.status(403).json('You can not delete this user');
  }
});

const port = process.env.port || 5000;
app.listen(port, () => {
  console.log(`Backend server is running on port ${port}`);
});
