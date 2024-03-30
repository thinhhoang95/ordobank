import moment from 'moment-timezone';
import { database } from './db'

export const newIban = async (countryCode) => {
    try {
        // console.log("Generating new IBAN")
        let iban = countryCode + Math.floor(Math.random() * 1000000000000000000);
        return iban;
    } catch (err) {
        console.log(err.stack);
    }
}

export const getAccount = async (iban) => {
    try {
        // console.log("Trying to access account with IBAN ", iban)
        let account = await database.collection('accounts').findOne({ iban: iban });
        if (account.hasOwnProperty('password')) {
            delete account.password;
        }
        if (account.hasOwnProperty('_id')) {
            delete account._id;
        }
        return account;
    } catch (err) {
        console.log(err.stack);
    }
}

export const newAccount = async (name, password) => {
    try {
        // console.log("Creating new account...")
        let iban = await newIban("VN");
        let openingDate = moment().toDate();
        name = name.trim().toUpperCase();
        let account = await database.collection('accounts').insertOne({ iban: iban, balance: 0, name: name, password: password, openingDate: openingDate});
        return account;
    } catch (err) {
        console.log(err.stack);
    }
}

export const deleteAccount = async (iban) => {
    try {
        // console.log("Deleting account with IBAN ", iban)
        let account = await database.collection('accounts').deleteOne({ iban: iban });
        return account;
    } catch (err) {
        console.log(err.stack);
    }
}

export const balanceChange = async (iban, amount) => {
    try {
        // convert amount to number
        amount = parseFloat(amount);
        // console.log("Changing balance of account with IBAN ", iban)
        let account = await database.collection('accounts').updateOne({ iban: iban }, { $inc: { balance: amount } });
        return account;
    } catch (err) {
        console.log(err.stack);
    }
}