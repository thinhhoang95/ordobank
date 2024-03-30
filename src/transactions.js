import moment from 'moment-timezone';
import { database } from './db'

export const newBalanceAdjustment = async (iban, amount, description) => {
    try {
        // convert amount to number
        amount = parseFloat(amount);
        // console.log("Adjusting balance of account with IBAN ", iban)
        let adjustment = await database.collection('transactions').insertOne({ iban: iban, amount: amount, description: description, date: moment().toDate()});
        return adjustment;
    } catch (err) {
        console.log(err.stack);
    }
}

export const getTransactions = async (iban) => {
    try {
        // Convert fromDate and toDate to Date objects
        fromDate = moment(fromDate).toDate();
        toDate = moment(toDate).toDate();
        // console.log("Getting transactions for account with IBAN ", iban)
        let transactions = await database.collection('transactions').find({ iban: iban }).toArray();
        return transactions;
    } catch (err) {
        console.log(err.stack);
    }
}