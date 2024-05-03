import moment from 'moment-timezone';
import { database } from './db'

export const newBalanceAdjustment = async (iban, amount, description, offRecord = false) => {
    try {
        // convert amount to number
        amount = parseFloat(amount);
        // console.log("Adjusting balance of account with IBAN ", iban)
        let adjustment = await database.collection('transactions').insertOne({ iban: iban, amount: amount, description: description, date: moment().toDate(), offRecord: offRecord});
        return adjustment;
    } catch (err) {
        console.log(err.stack);
    }
}

export const getTransactions = async (iban, fromDate, toDate) => {
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

const extractCategory = (description) => {
    // Regular expression to match the pattern **Category**
    // It looks for a string that starts and ends with double asterisks
    // and captures the content in between (non-greedy match).
    const regex = /\*\*(.*?)\*\*/;

    // Execute the regex on the description
    const match = description.match(regex);

    // If a match is found, return the first capture group (the category),
    // otherwise return null or an appropriate default value.
    return match ? match[1] : null;
}

const groupTransactionsByCategory = (transactions) => {
    const summary = transactions.reduce((acc, transaction) => {
        // Extract the category from the transaction description
        let category = extractCategory(transaction.description);

        if (category === null) {
            category = 'Uncategorized';
        }

        let amount = transaction.amount;

        // Initialize the category in the accumulator if it doesn't exist
        if (!acc[category]) {
            acc[category] = { deposits: 0, withdrawals: 0 };
        }

        // If the amount is positive, it's a deposit; if negative, it's a withdrawal
        if (amount > 0) {
            acc[category].deposits += amount;
        } else {
            acc[category].withdrawals += Math.abs(amount); // Convert withdrawals to positive numbers for summing
        }

        return acc;
    }, {});

    return summary;
}

export const getTransactionsCustom = async (iban, fromDate = '', toDate = '', searchTerms = '', page = 0) => {
    const pageSize = 10;
    const collection = database.collection('transactions');
    // Calculate the number of documents to skip
    const skips = pageSize * (page - 1);

    // Construct the query: matching iban, date range, and contains search terms
    const aggregate = [
        { $match: { iban: iban, date: { $gte: moment(fromDate).toDate(), $lte: moment(toDate).toDate() }, description: { $regex: searchTerms, $options: 'i' } } },
        { $sort: { date: -1 } },
        { $skip: skips },
        { $limit: pageSize }
    ];

    // Execute the query
    const cursor = collection.aggregate(aggregate);
    const results = await cursor.toArray();

    // Calculate the total number of documents
    const total = await collection.countDocuments({ iban: iban, date: { $gte: moment(fromDate).toDate(), $lte: moment(toDate).toDate() }, description: { $regex: searchTerms, $options: 'i' } });
    return { results, total };
}

export const getTransactionsCustomStats = async (iban, fromDate = '', toDate = '', searchTerms = '') => {
    const collection = database.collection('transactions');

    // Construct the query: matching iban, date range, and contains search terms
    const aggregate = [
        { $match: { iban: iban, date: { $gte: moment(fromDate).toDate(), $lte: moment(toDate).toDate() }, description: { $regex: searchTerms, $options: 'i' } } },
        { $sort: { date: -1 } }
    ];

    // Execute the query
    const cursor = collection.aggregate(aggregate);
    const results = await cursor.toArray();

    const summary = groupTransactionsByCategory(results);

    return summary;
}

export const getTransactionsSummaryByDay = async (iban, fromDate = '', toDate = '', searchTerms = '') => {
    const pipeline = [
        { $match: { iban: iban, date: { $gte: moment(fromDate).toDate(), $lte: moment(toDate).toDate() }, amount: {$lte: 0}, description: { $regex: searchTerms, $options: 'i' } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$date" }
            },
            netAmount: { $sum: "$amount" }
          }
        },
        {
          $sort: { _id: 1 } // Sort by date ascending
        }
      ];

    const collection = database.collection('transactions');
    const cursor = collection.aggregate(pipeline);
    const results = await cursor.toArray();

    return results;
}
