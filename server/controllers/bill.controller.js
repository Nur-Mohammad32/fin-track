import crypto from "crypto";

import mongoose from "mongoose";

import bcrypt from "bcryptjs";

import Transaction from "../models/transaction.model.js";

import User from "../models/user.model.js";

import { checkTransaction } from "../services/anomaly.service.js";

/*
 * Bill payments are ALWAYS categorized server-side.
 * The category sent from the client is never trusted.
 */
const BILL_CATEGORY = "bills-utilities";

const BILL_TRANSACTION_TYPE = "payment";

export const BILL_PROVIDERS = [
    { id: "desco", name: "DESCO", type: "Electricity" },
    { id: "dpdc", name: "DPDC", type: "Electricity" },
    { id: "nesco", name: "NESCO", type: "Electricity" },
    { id: "dhaka-wasa", name: "Dhaka WASA", type: "Water" },
    { id: "ctg-wasa", name: "Chattogram WASA", type: "Water" },
    { id: "titas-gas", name: "Titas Gas", type: "Gas" },
    { id: "bakhrabad-gas", name: "Bakhrabad Gas", type: "Gas" },
    { id: "btcl", name: "BTCL", type: "Telephone" },
    { id: "link3", name: "Link3", type: "Internet" },
    { id: "amberit", name: "Amber IT", type: "Internet" }
];

class TxnError extends Error {
    constructor(failReason, httpStatus = 422) {
        super(failReason);
        this.failReason = failReason;
        this.httpStatus = httpStatus;
    }
}

const generateTransactionId = () => {
    return (
        "TXN" +
        Date.now().toString(36).toUpperCase() +
        crypto.randomBytes(4).toString("hex").toUpperCase()
    );
};

const getSafeTransactionDate = (transactionDate) => {
    if (!transactionDate) {
        return new Date();
    }

    const date = new Date(transactionDate);

    return Number.isNaN(date.getTime())
        ? new Date()
        : date;
};

const findProvider = (provider) => {
    if (!provider || typeof provider !== "string") {
        return null;
    }

    const id = provider.trim().toLowerCase();

    return (
        BILL_PROVIDERS.find((p) => p.id === id) || null
    );
};

/* ------------------------------------------------------------------ */
/* List Providers                                                      */
/* ------------------------------------------------------------------ */

export const getBillProviders = (req, res) => {
    return res.status(200).json({
        success: true,
        providers: BILL_PROVIDERS
    });
};

/* ------------------------------------------------------------------ */
/* Store Failed Transaction                                            */
/* ------------------------------------------------------------------ */

const recordFailure = async (
    data,
    failReason
) => {
    try {
        await Transaction.create({
            transactionId: data.transactionId,
            from: data.from,
            to: data.to,
            amount:
                Number.isFinite(data.amount) &&
                data.amount >= 0
                    ? data.amount
                    : 0,
            status: "failed",
            failReason,
            transactionType: BILL_TRANSACTION_TYPE,
            category: BILL_CATEGORY,
            reference: data.reference,
            transactionDate: getSafeTransactionDate(
                data.transactionDate
            )
        });
    } catch (error) {
        console.error(
            "Failed to record failed bill payment:",
            error.message
        );
    }
};

/* ------------------------------------------------------------------ */
/* Execute Bill Payment                                                */
/* ------------------------------------------------------------------ */

const executeBillPayment = async (
    {
        transactionId,
        from,
        to,
        amount,
        pin,
        reference,
        transactionDate
    },
    session
) => {
    // 1. Find sender
    const sender = await User.findOne({
        phone: from
    }).session(session);

    if (!sender) {
        throw new TxnError(
            "Account blocked/suspended",
            403
        );
    }

    // 2. Check account status
    if (!sender.isActive) {
        throw new TxnError(
            "Account blocked/suspended",
            403
        );
    }

    // 3. Verify PIN
    const pinOk = await bcrypt.compare(
        String(pin),
        sender.pin
    );

    if (!pinOk) {
        throw new TxnError(
            "Incorrect PIN",
            401
        );
    }

    // 4. Check sender balance
    if (sender.currentBalance < amount) {
        throw new TxnError(
            "Insufficient balance",
            422
        );
    }

    // 5. Deduct the bill amount from sender
    const debited =
        await User.findOneAndUpdate(
            {
                _id: sender._id,
                currentBalance: {
                    $gte: amount
                }
            },
            {
                $inc: {
                    currentBalance: -amount
                }
            },
            {
                new: true,
                session
            }
        );

    if (!debited) {
        throw new TxnError(
            "Insufficient balance",
            422
        );
    }

    // 6. Store successful transaction
    const [transaction] =
        await Transaction.create(
            [
                {
                    transactionId,
                    from,
                    to,
                    amount,
                    status: "success",
                    failReason: null,
                    transactionType:
                        BILL_TRANSACTION_TYPE,
                    category: BILL_CATEGORY,
                    reference,
                    transactionDate
                }
            ],
            {
                session
            }
        );

    return {
        transaction,
        newBalance: debited.currentBalance
    };
};

/* ------------------------------------------------------------------ */
/* Pay Bill                                                            */
/* ------------------------------------------------------------------ */

export const payBill = async (
    req,
    res
) => {
    /*
     * Sender is taken from the authenticated user.
     * Category is forced to "bills-utilities" on the server.
     * Never trust req.body.from or req.body.category.
     */

    const from = req.user.phone;

    const {
        provider,
        accountNumber,
        amount,
        pin,
        transactionDate
    } = req.body;

    const numAmount = Number(amount);

    const biller = findProvider(provider);

    const customerAccount =
        typeof accountNumber === "string"
            ? accountNumber.trim()
            : "";

    const data = {
        transactionId: generateTransactionId(),
        from,
        to: biller
            ? biller.name
            : typeof provider === "string" &&
                provider.trim()
              ? provider.trim()
              : "Unknown biller",
        amount: numAmount,
        pin,
        reference: customerAccount
            ? `Account: ${customerAccount}`
            : undefined,
        transactionDate:
            getSafeTransactionDate(transactionDate)
    };

    // Reject with a failed transaction record
    const reject = async (
        httpStatus,
        failReason,
        message
    ) => {
        await recordFailure(data, failReason);

        return res.status(httpStatus).json({
            success: false,
            message,
            failReason,
            transactionId: data.transactionId
        });
    };

    // Validate provider
    if (!biller) {
        return reject(
            400,
            "Invalid bill details",
            "Please select a valid bill/utility provider"
        );
    }

    // Validate account/customer number
    if (!customerAccount) {
        return reject(
            400,
            "Invalid bill details",
            "Account/customer number is required"
        );
    }

    // Validate amount
    if (
        !Number.isFinite(numAmount) ||
        numAmount <= 0
    ) {
        return reject(
            400,
            "Invalid amount",
            "Amount must be a positive number"
        );
    }

    // Validate PIN
    if (!pin) {
        return reject(
            400,
            "Incorrect PIN",
            "PIN is required"
        );
    }

    const session =
        await mongoose.startSession();

    try {
        let result;

        await session.withTransaction(
            async () => {
                result =
                    await executeBillPayment(
                        data,
                        session
                    );
            }
        );

        checkTransaction(result.transaction).catch((e) =>
            console.error(
                "Anomaly check failed:",
                e.message
            )
        );

        return res.status(201).json({
            success: true,
            message: "Bill payment successful",
            transaction: result.transaction,
            amount: result.transaction.amount,
            balance: result.newBalance,
            category:
                result.transaction.category
        });

    } catch (error) {
        if (error instanceof TxnError) {
            await recordFailure(
                data,
                error.failReason
            );

            return res.status(
                error.httpStatus
            ).json({
                success: false,
                message: error.failReason,
                transactionId:
                    data.transactionId,
                failReason:
                    error.failReason
            });
        }

        console.error(
            "Bill payment error:",
            error
        );

        const isTimeout =
            /timed? ?out/i.test(
                error.message
            );

        const failReason = isTimeout
            ? "Transaction timeout"
            : "Server/service unavailable";

        await recordFailure(
            data,
            failReason
        );

        return res.status(503).json({
            success: false,
            message: "Bill payment failed",
            transactionId:
                data.transactionId,
            failReason
        });

    } finally {
        await session.endSession();
    }
};
