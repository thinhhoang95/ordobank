import moment from 'moment-timezone';
import { database } from './db'

export const newPendingBalanceAdjustment = async (iban, amount, description) => {
    try {
        // convert amount to number
        amount = parseFloat(amount);
        // console.log("Preparing to adjust balance of account with IBAN ", iban)
        let adjustment = await database.collection('pentransactions').insertOne({ iban: iban, amount: amount, description: description, date: moment().toDate()});
        return adjustment;
    } catch (err) {
        console.log(err.stack);
    }
}

export const getPendingTransactions = async (iban, fromDate, toDate) => {
    try {
        // Convert fromDate and toDate to Date objects
        fromDate = moment(fromDate).toDate();
        toDate = moment(toDate).toDate();
        // console.log("Getting pending transactions for account with IBAN ", iban)
        let transactions = await database.collection('pentransactions').find({ iban: iban, date: { $gte: fromDate, $lte: toDate } }).toArray();
        return transactions;
    } catch (err) {
        console.log(err.stack);
    }
}