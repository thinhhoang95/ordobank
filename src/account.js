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

const getCurrentWeekDateRange = () => {
    let startOfWeek = moment().startOf('week').toDate();
    let endOfWeek = moment().endOf('week').toDate();
    return { startOfWeek, endOfWeek };
}

const getCurrentMonthDateRange = () => {
    let startOfMonth = moment().startOf('month').toDate();
    let endOfMonth = moment().endOf('month').toDate();
    return { startOfMonth, endOfMonth };
}

const getLastWeekDateRange = () => {
    let startOfWeek = moment().subtract(1, 'weeks').startOf('week').toDate();
    let endOfWeek = moment().subtract(1, 'weeks').endOf('week').toDate();
    return { startOfWeek, endOfWeek };
}

const getLastMonthDateRange = () => {
    let startOfMonth = moment().subtract(1, 'months').startOf('month').toDate();
    let endOfMonth = moment().subtract(1, 'months').endOf('month').toDate();
    return { startOfMonth, endOfMonth };
}

export const summarizeAccount = async (iban) => {
    try {
        // console.log("Summarizing account with IBAN ", iban)
        let account = await getAccount(iban);

        let { startOfWeek, endOfWeek } = getCurrentWeekDateRange();
        let { startOfLastWeek, endOfLastWeek } = getLastWeekDateRange();
        let { startOfMonth, endOfMonth } = getCurrentMonthDateRange();
        let { startOfLastMonth, endOfLastMonth } = getLastMonthDateRange();

        let aggRules = [
            {
                $match: {
                    // Convert date field to the beginning of the day for easier grouping
                    iban: iban
                }
            },
            {
                $addFields: {
                    // Convert date field to the beginning of the day for easier grouping
                    dateStartOfDay: { $dateTrunc: { date: "$date", unit: "day" } }
                }
            },
            {
                $facet: {
                    "currentWeek": [
                        {
                            $match: {
                                dateStartOfDay: {
                                    $gte: new Date(startOfWeek),
                                    $lt: new Date(endOfWeek)
                                }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                deposit: { $sum: { $cond: [{ $gt: ["$amount", 0] }, "$amount", 0] } },
                                withdrawal: { $sum: { $cond: [{ $lt: ["$amount", 0] }, "$amount", 0] } }
                            }
                        }
                    ],
                    "lastWeek": [
                        {
                            $match: {
                                dateStartOfDay: {
                                    $gte: new Date(startOfLastWeek),
                                    $lt: new Date(endOfLastWeek)
                                }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                deposit: { $sum: { $cond: [{ $gt: ["$amount", 0] }, "$amount", 0] } },
                                withdrawal: { $sum: { $cond: [{ $lt: ["$amount", 0] }, "$amount", 0] } }
                            }
                        }
                    ],
                    "currentMonth": [
                        {
                            $match: {
                                dateStartOfDay: {
                                    $gte: new Date(startOfMonth),
                                    $lt: new Date(endOfMonth)
                                }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                deposit: { $sum: { $cond: [{ $gt: ["$amount", 0] }, "$amount", 0] } },
                                withdrawal: { $sum: { $cond: [{ $lt: ["$amount", 0] }, "$amount", 0] } }
                            }
                        }
                    ],
                    "lastMonth": [
                        {
                            $match: {
                                dateStartOfDay: {
                                    $gte: new Date(startOfLastMonth),
                                    $lt: new Date(endOfLastMonth)
                                }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                deposit: { $sum: { $cond: [{ $gt: ["$amount", 0] }, "$amount", 0] } },
                                withdrawal: { $sum: { $cond: [{ $lt: ["$amount", 0] }, "$amount", 0] } }
                            }
                        }
                    ]
                }
            }
        ]

        let transactionSummary = await database.collection('transactions').aggregate(aggRules).toArray();
        let last5Transactions = await database.collection('transactions').find({ iban: iban }).sort({ date: -1 }).limit(5).toArray();

        let summary = {
            account: account,
            currentWeek: {
                deposit: 0,
                withdrawal: 0
            },
            lastWeek: {
                deposit: 0,
                withdrawal: 0
            },
            currentMonth: {
                deposit: 0,
                withdrawal: 0
            },
            lastMonth: {
                deposit: 0,
                withdrawal: 0
            },
            transactions: []
        }

        if (transactionSummary[0].currentWeek.length > 0) {
            summary.currentWeek = transactionSummary[0].currentWeek[0];
        }
        if (transactionSummary[0].lastWeek.length > 0) {
            summary.lastWeek = transactionSummary[0].lastWeek[0];
        }
        if (transactionSummary[0].currentMonth.length > 0) {
            summary.currentMonth = transactionSummary[0].currentMonth[0];
        }
        if (transactionSummary[0].lastMonth.length > 0) {
            summary.lastMonth = transactionSummary[0].lastMonth[0];
        }
        summary.transactions = last5Transactions;
        return summary;
    } catch (err) {
        console.log(err.stack);
    }
<<<<<<< HEAD
}

export const queryAccountName = async (iban) => {
    const collection = database.collection('accounts');
    const result = await collection.findOne({ iban: iban });
    // console.log(result)
    return {
        name: result.name
    }
=======
>>>>>>> 5e127696e68927e9b23b26209bc14c06ca816ad1
}