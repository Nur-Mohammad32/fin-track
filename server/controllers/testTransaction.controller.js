import Transaction from "../models/transaction.model.js";

const generateTransactionId = () => {
    return (
        "TXN" +
        Date.now().toString(36).toUpperCase() +
        Math.random().toString(36).substring(2, 10).toUpperCase()
    );
};

export const createTestTransactions = async (req, res, next) => {
    try {
        const transactions = req.body;

        if (!Array.isArray(transactions) || transactions.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Request body must be a non-empty array"
            });
        }

        const transactionData = transactions.map((transaction) => ({
            transactionId: generateTransactionId(),
            from: transaction.from,
            to: transaction.to,
            amount: transaction.amount,
            status: transaction.status || "success",
            failReason: transaction.failReason || null,
            transactionType: transaction.transactionType,
            category: transaction.category || "other",
            reference: transaction.reference,
            transactionDate: transaction.transactionDate
        }));

        const createdTransactions =
            await Transaction.insertMany(transactionData);

        return res.status(201).json({
            success: true,
            message: `${createdTransactions.length} test transactions created successfully`,
            transactions: createdTransactions
        });

    } catch (error) {
        next(error);
    }
};