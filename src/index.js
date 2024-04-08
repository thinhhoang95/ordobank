var express = require('express');
var app = express();
const http = require('http');

import { client } from './db';
import { newAccount, getAccount, balanceChange, deleteAccount, summarizeAccount,
queryAccountName } from './account';
import { newBalanceAdjustment, getTransactions, getTransactionsCustom, getTransactionsCustomStats, 
getTransactionsSummaryByDay } from './transactions';
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
import { getSwearCertificatePdf } from './swear';

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
      res.status(500).json({ error: err.message });
   }
});

// ------------------- Account -------------------
app.post('/newaccount', async (req, res) => {
   try {
      const { name, password } = req.body;
      const account = await newAccount(name, password);
      res.send(account);
   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});

app.get('/account', async (req, res) => {
   try {
      const account = await getAccount(req.account.iban);
      res.send(account);
   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});

app.get('/accountsummary', async (req, res) => {
   try {
      const summary = await summarizeAccount(req.account.iban);
      res.json(summary);
   } catch (err) {
      res.status(500).json({ error: err.message });
   }
})

app.post('/deleteaccount', async (req, res) => {
   try {
      const account = await deleteAccount(req.account.iban);
      res.send(account);
   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});

app.get('/queryIbanName', async (req, res) => {
   try {
      const ibanName = await queryAccountName(req.query.iban)
      res.send(ibanName)
   } catch (err) {
      res.status(500).json({ error: err.message })
   }
})

// ------------------- Transactions -------------------
app.get('/transactions', async (req, res) => {
   try {
      const transactions = await getTransactions(req.account.iban, req.query.fromDate, req.query.toDate);
      res.send(transactions);
   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});

app.get('/transactionsCustom', async (req, res) => {
   try {
      let offRecord = req.query.offRecord || '1'; // include off-record records by default
      if (offRecord === '0')
      {
         offRecord = false
      } else {
         offRecord = true
      }
      const transactions = await getTransactionsCustom(req.account.iban, req.query.fromDate, req.query.toDate, req.query.searchTerms, offRecord, req.query.page);
      res.send(transactions);
   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});

app.get('/transactionsCustomStats', async (req, res) => {
   try {
      let offRecord = req.query.offRecord || '1'; // include off-record records by default
      if (offRecord === '0')
      {
         offRecord = false
      } else {
         offRecord = true
      }
      const stats = await getTransactionsCustomStats(req.account.iban, req.query.fromDate, req.query.toDate, req.query.searchTerms, offRecord);
      res.send(stats);
   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});

app.get('/transactionsSummary', async (req, res) => {
   try {
      const transactions = await getTransactions(req.account.iban, req.query.fromDate, req.query.toDate);
      const summary = groupTransactionsByCategory(transactions);
      res.send(summary);
   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});

app.get('/transactionsByDay', async (req, res) => {
   try {
      const summary = await getTransactionsSummaryByDay(req.account.iban, req.query.fromDate, req.query.toDate, req.query.searchTerms);
      res.send(summary);
   } catch (err) {
      res.status(500).json({ error: err.message });
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
      res.status(500).json({ error: err.message });
   }
});

// ------------------- Transfer -------------------
app.post('/transfer', async (req, res) => {
   try {
      const { toIban, amount, description } = req.body;
      let offRecord = req.body.offRecord || '0';
      if (offRecord === '1')
      {
         offRecord = true
      } else {
         offRecord = false
      }
      const fromAccount = await getAccount(req.account.iban);
      const toAccount = await getAccount(toIban);
      if (!toAccount) {
         res.status(500).json({ error: "Recipient account not found" });
         return;
      }
      if (parseFloat(amount) <= 0) {
         res.status(500).json({ error: "Invalid amount" });
         return;
      }
      const fromAdjustment = await newBalanceAdjustment(fromAccount.iban, -amount, description, offRecord);
      const toAdjustment = await newBalanceAdjustment(toAccount.iban, amount, description, false); // offRecord = false: deposit is always on record
      const fromBalance = await balanceChange(fromAccount.iban, -amount);
      const toBalance = await balanceChange(toAccount.iban, amount);
      res.send(fromAdjustment);
   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});

app.post('/transferFromORD', async (req, res) => {
   try {
      const { toIban, amount, description } = req.body;
      const fromAccount = await getAccount(req.account.iban);
      const toAccount = await getAccount(toIban);
      if (!toAccount) {
         res.status(500).json({ error: "Recipient account not found" });
         return;
      }
      if (parseFloat(amount) <= 0) {
         res.status(500).json({ error: "Invalid amount" });
         return;
      }
      // Convert amount in ORD to KVND
      const exchangeRate = 7.292;
      let mAmount = amount * exchangeRate;
      const fromAdjustment = await newBalanceAdjustment(fromAccount.iban, -mAmount, description);
      const toAdjustment = await newBalanceAdjustment(toAccount.iban, mAmount, description);
      const fromBalance = await balanceChange(fromAccount.iban, -mAmount);
      const toBalance = await balanceChange(toAccount.iban, mAmount);
      res.send(fromAdjustment);
   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});

// ------------------- Pending Transactions -------------------
app.post('/pendingbalanceadjustment', async (req, res) => {
   try {
      const { amount, description } = req.body;
      const adjustment = await newPendingBalanceAdjustment(req.account.iban, amount, description);
      res.status(500).send(adjustment);
   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});

app.get('/pendingtransactions', async (req, res) => {
   try {
      const transactions = await getPendingTransactions(req.account.iban);
      res.send(transactions);
   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});

app.get('/transactionsByDay', async (req, res) => {
   try {
      const summary = await getTransactionsSummaryByDay(req.account.iban, req.query.fromDate, req.query.toDate, req.query.searchTerms);
      res.send(summary);
   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});

// ------------------- Swearing -------------------
app.get('/swear', async (req, res) => {
   // return swear.html file
   res.sendFile(__dirname + '/swear.html');
});

app.post('/swearprint', async (req, res) => {
   const { swear1, swear2 } = req.body;
   // replace urlEncoded characters
   let swear1Decoded = decodeURIComponent(swear1);
   let swear2Decoded = decodeURIComponent(swear2);
   let pdf = await getSwearCertificatePdf(swear1Decoded, swear2Decoded);
   res.contentType("application/pdf");
   res.send(pdf);
});

app.get('/transactionsByDay', async (req, res) => {
   try {
      const summary = await getTransactionsSummaryByDay(req.account.iban, req.query.fromDate, req.query.toDate, req.query.searchTerms);
      res.send(summary);
   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});

// ------------------- Swearing -------------------
app.get('/swear', async (req, res) => {
   // return swear.html file
   res.sendFile(__dirname + '/swear.html');
});

app.post('/swearprint', async (req, res) => {
   const { swear1, swear2 } = req.body;
   // replace urlEncoded characters
   let swear1Decoded = decodeURIComponent(swear1);
   let swear2Decoded = decodeURIComponent(swear2);
   let pdf = await getSwearCertificatePdf(swear1Decoded, swear2Decoded);
   res.contentType("application/pdf");
   res.send(pdf);
});