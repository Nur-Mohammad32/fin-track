import crypto from "crypto";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import Transaction from "../models/transaction.model.js";
import User from "../models/user.model.js";
import SystemAccount from "../models/systemAccount.model.js";
import { checkTransaction } from "../services/anomaly.service.js";

const VALID_TYPES =
    Transaction.schema.path("transactionType").enumValues;

const VALID_CATEGORIES =
    Transaction.schema.path("category").enumValues;

const TRANSACTION_FEE_RATE = 0.01;

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

/* ------------------------------------------------------------------ */
/* Execute Transaction                                                */
/* ------------------------------------------------------------------ */

const executeTransfer = async (
    {
        transactionId,
        from,
        to,
        amount,
        pin,
        transactionType,
        category,
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

    // 2. Find recipient
    const recipient = await User.findOne({
        phone: to
    }).session(session);

    if (!recipient) {
        throw new TxnError(
            "Invalid recipient number",
            404
        );
    }

    // 3. Check account status
    if (!sender.isActive || !recipient.isActive) {
        throw new TxnError(
            "Account blocked/suspended",
            403
        );
    }

    // 4. Verify PIN
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

    // 5. Calculate 1% transaction fee
    const fee =
        amount * TRANSACTION_FEE_RATE;

    const totalDeduction =
        amount + fee;

    // 6. Check sender balance
    if (sender.currentBalance < totalDeduction) {
        throw new TxnError(
            "Insufficient balance",
            422
        );
    }

    // 7. Find system account
    const systemAccount =
        await SystemAccount.findOne().session(session);

    if (!systemAccount) {
        throw new TxnError(
            "Server/service unavailable",
            500
        );
    }

    // 8. Deduct amount + fee from sender
    const debited =
        await User.findOneAndUpdate(
            {
                _id: sender._id,
                currentBalance: {
                    $gte: totalDeduction
                }
            },
            {
                $inc: {
                    currentBalance: -totalDeduction
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

    // 9. Credit recipient
    const credited =
        await User.updateOne(
            {
                _id: recipient._id
            },
            {
                $inc: {
                    currentBalance: amount
                }
            },
            {
                session
            }
        );

    if (credited.modifiedCount !== 1) {
        throw new TxnError(
            "Server/service unavailable",
            500
        );
    }

    // 10. Credit fee to system account
    const systemCredited =
        await SystemAccount.updateOne(
            {
                _id: systemAccount._id
            },
            {
                $inc: {
                    balance: fee
                }
            },
            {
                session
            }
        );

    if (systemCredited.modifiedCount !== 1) {
        throw new TxnError(
            "Server/service unavailable",
            500
        );
    }

    // 11. Store successful transaction
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
                    transactionType,
                    category,
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
        newBalance: debited.currentBalance,
        fee
    };
};

/* ------------------------------------------------------------------ */
/* Store Failed Transaction                                           */
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
            amount: data.amount,
            status: "failed",
            failReason,
            transactionType: data.transactionType,
            category: data.category || "other",
            reference: data.reference,
            transactionDate: data.transactionDate
        });
    } catch (error) {
        console.error(
            "Failed to record failed transaction:",
            error.message
        );
    }
};

/* ------------------------------------------------------------------ */
/* Create Transaction                                                 */
/* ------------------------------------------------------------------ */

export const createTransaction = async (
    req,
    res
) => {
    /*
     * Sender is taken from authenticated user.
     * Never trust req.body.from.
     */
    const from = req.user.phone;

    const {
        to,
        amount,
        pin,
        transactionType,
        category,
        reference,
        transactionDate
    } = req.body;

    const numAmount = Number(amount);

    // Validate recipient
    if (!to || typeof to !== "string") {
        return res.status(400).json({
            success: false,
            message: "Recipient (to) is required"
        });
    }

    // Validate amount
    if (
        !Number.isFinite(numAmount) ||
        numAmount <= 0
    ) {
        return res.status(400).json({
            success: false,
            message: "Amount must be a positive number"
        });
    }

    // Validate PIN
    if (!pin) {
        return res.status(400).json({
            success: false,
            message: "PIN is required"
        });
    }

    // Validate transaction type
    if (!VALID_TYPES.includes(transactionType)) {
        return res.status(400).json({
            success: false,
            message: `transactionType must be one of: ${VALID_TYPES.join(", ")}`
        });
    }

    // Category should already be added by middleware
    if (
        !category ||
        !VALID_CATEGORIES.includes(category)
    ) {
        return res.status(400).json({
            success: false,
            message: `category must be one of: ${VALID_CATEGORIES.join(", ")}`
        });
    }

    // Prevent self-transfer
    if (to === from) {
        return res.status(400).json({
            success: false,
            message: "Cannot send money to yourself"
        });
    }

    const data = {
        transactionId: generateTransactionId(),
        from,
        to,
        amount: numAmount,
        pin,
        transactionType,
        category,
        reference,
        transactionDate
    };

    const session =
        await mongoose.startSession();

    try {
        let result;

        await session.withTransaction(
            async () => {
                result =
                    await executeTransfer(
                        data,
                        session
                    );
            }
        );

        checkTransaction(result.transaction).catch((e) =>
            console.error("Anomaly check failed:", e.message)
        );

        return res.status(201).json({
            success: true,
            message: "Transaction successful",
            transaction: result.transaction,
            amount: result.transaction.amount,
            fee: result.fee,
            totalDeducted:
                result.transaction.amount +
                result.fee,
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
                message: "Transaction failed",
                transactionId:
                    data.transactionId,
                failReason:
                    error.failReason
            });
        }

        console.error(
            "Transaction error:",
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
            message: "Transaction failed",
            transactionId:
                data.transactionId,
            failReason
        });

    } finally {
        await session.endSession();
    }
};