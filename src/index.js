var express = require('express');
var app = express();
const http = require('http');

import { client } from './db';
import { newAccount, getAccount, balanceChange, deleteAccount } from './account';
import { newBalanceAdjustment, getTransactions } from './transactions';
import { newPendingBalanceAdjustment, getPendingTransactions } from './pentransactions';
import { login } from './auth';

app.use(express.urlencoded());
app.use(authMiddleware); // authentication

app.use(function (req, res, next) {
   res.header('Access-Control-Allow-Origin', '*');
   res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
   res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
   res.header('Access-Control-Expose-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

   //intercepts OPTIONS method
   if ('OPTIONS' === req.method) {
      //respond with 200
      res.sendStatus(200);
   }
   else {
      //move on
      next();
   }
});

// Support OPTIONS
app.options("/*", function (req, res, next) {
   res.header('Access-Control-Allow-Origin', '*');
   res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
   res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
   res.sendStatus(200);
});

const server = http.createServer(app).listen(3006, async () => { // put options, app if https.createServer
   try {
     await client.connect()
     console.log("Connected to database")
   } catch (error) {
     console.log("Error connecting to database")
     console.log(error)
   }
   // await client.connect()
   console.log('Ordobank API is listening on port ' + 3006);
 });

import { authMiddleware } from './auth';

app.get('/', function (req, res) {
   res.send("Ordobank API");
});

// ------------------- Auth -------------------
app.post('/login', async (req, res) => {
   try {
      const { name, password } = req.body;
      const token = await login(name, password);
      if (token) {
         res.send(token);
      } else {
         res.sendStatus(401);
      }
   } catch (err) {
      res.json({ error: err.message });
   }
});

// ------------------- Account -------------------
app.post('/newaccount', async (req, res) => {
   try {
      const { name, password } = req.body;
      const account = await newAccount(name, password);
      res.send(account);
   } catch (err) {
      res.json({ error: err.message });
   }
});

app.get('/account', async (req, res) => {
   try {
      const account = await getAccount(req.account.iban);
      res.send(account);
   } catch (err) {
      res.json({ error: err.message });
   }
});

app.post('/deleteaccount', async (req, res) => {
   try {
      const account = await deleteAccount(req.account.iban);
      res.send(account);
   } catch (err) {
      res.json({ error: err.message });
   }
});

// ------------------- Transactions -------------------
app.get('/transactions', async (req, res) => {
   try {
      const transactions = await getTransactions(req.account.iban, req.query.fromDate, req.query.toDate);
      res.send(transactions);
   } catch (err) {
      res.json({ error: err.message });
   }
});

// ------------------- Balance Adjustment -------------------
app.post('/balanceadjustment', async (req, res) => {
   try {
      const { amount, description } = req.body;
      const adjustment = await newBalanceAdjustment(req.account.iban, amount, description);
      const balance = await balanceChange(req.account.iban, amount);
      res.send(adjustment);
   } catch (err) {
      res.json({ error: err.message });
   }
});

// ------------------- Transfer -------------------
app.post('/transfer', async (req, res) => {
   try {
      const { toIban, amount, description } = req.body;
      const fromAccount = await getAccount(req.account.iban);
      const toAccount = await getAccount(toIban);
      if (!toAccount) {
         res.json({ error: "Recipient account not found" });
         return;
      }
      const fromAdjustment = await newBalanceAdjustment(fromAccount.iban, -amount, description);
      const toAdjustment = await newBalanceAdjustment(toAccount.iban, amount, description);
      const fromBalance = await balanceChange(fromAccount.iban, -amount);
      const toBalance = await balanceChange(toAccount.iban, amount);
      res.send(fromAdjustment);
   } catch (err) {
      res.json({ error: err.message });
   }
});

// ------------------- Pending Transactions -------------------
app.post('/pendingbalanceadjustment', async (req, res) => {
   try {
      const { amount, description } = req.body;
      const adjustment = await newPendingBalanceAdjustment(req.account.iban, amount, description);
      res.send(adjustment);
   } catch (err) {
      res.json({ error: err.message });
   }
});

app.get('/pendingtransactions', async (req, res) => {
   try {
      const transactions = await getPendingTransactions(req.account.iban);
      res.send(transactions);
   } catch (err) {
      res.json({ error: err.message });
   }
});