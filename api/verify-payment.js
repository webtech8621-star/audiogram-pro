const crypto = require("crypto");

module.exports = async function handler(req, res) {

    try {

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = req.body;

        const body =
            razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac(
                "sha256",
                process.env.RAZORPAY_KEY_SECRET
            )
            .update(body.toString())
            .digest("hex");

        const isAuthentic =
            expectedSignature === razorpay_signature;

        if (isAuthentic) {

            return res.status(200).json({
                success: true,
            });
        }

        return res.status(400).json({
            success: false,
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};